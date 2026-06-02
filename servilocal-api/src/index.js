require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./db');
const requireAuth = require('./middleware/auth');
const requireAdmin = require('./middleware/admin');
const createCrudRouter = require('./routes/crud');

// Models
const ServiceRequest = require('./models/ServiceRequest');
const ServiceRequestInterest = require('./models/ServiceRequestInterest');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const ProviderProfile = require('./models/ProviderProfile');
const ProviderReview = require('./models/ProviderReview');
const ProviderService = require('./models/ProviderService');
const UserProfile = require('./models/UserProfile');
const User = require('./models/User');
const Notification = require('./models/Notification');
const EmailTemplate = require('./models/EmailTemplate');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const clientOrigins = [
  'http://localhost:5173',
  'https://appservilocal.com',
  'https://www.appservilocal.com',
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || '').split(','),
]
  .map((origin) => origin && origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set(clientOrigins)];
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
};

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.use(cors(corsOptions));
app.use(express.json());
app.set('io', io);

// ─── Auth ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ─── Maps ───────────────────────────────────────────────────────────────────
app.use('/api/maps', require('./routes/maps'));

// ─── CRUD entities ──────────────────────────────────────────────────────────
app.use('/api/service-requests', createCrudRouter(ServiceRequest, {
  fieldMap: { created_by_id: 'clientId' },
  injectUser: 'clientId',
}));

app.use('/api/service-request-interests', createCrudRouter(ServiceRequestInterest));

app.use('/api/conversations', createCrudRouter(Conversation));

// Messages: emit socket event + atualiza lastMessage na Conversation
app.use('/api/messages', createCrudRouter(Message, {
  afterCreate: async (doc, req) => {
    req.app.get('io').to(`conversation:${doc.conversationId}`).emit('new-message', doc);
    await Conversation.findByIdAndUpdate(doc.conversationId, {
      lastMessage: doc.content,
      lastMessageTime: doc.createdAt,
    });
  },
}));

app.use('/api/provider-profiles', createCrudRouter(ProviderProfile, {
  fieldMap: { created_by_id: 'userId' },
}));

app.use('/api/provider-reviews', createCrudRouter(ProviderReview));

app.use('/api/provider-services', createCrudRouter(ProviderService));

app.use('/api/user-profiles', createCrudRouter(UserProfile, {
  fieldMap: { created_by_id: 'userId' },
}));

app.use('/api/users', require('./routes/users'));

app.use('/api/notifications', createCrudRouter(Notification));

app.use('/api/email-templates', createCrudRouter(EmailTemplate));

// ─── Admin ──────────────────────────────────────────────────────────────────
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await Promise.all([
      User.findByIdAndDelete(id),
      UserProfile.findOneAndDelete({ userId: id }),
      ProviderProfile.findOneAndDelete({ userId: id }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// ─── Socket.IO ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join-conversation', (id) => socket.join(`conversation:${id}`));
  socket.on('leave-conversation', (id) => socket.leave(`conversation:${id}`));
});

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB()
  .then(() => server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`)))
  .catch((err) => { console.error('[server] Erro ao conectar:', err.message); process.exit(1); });
