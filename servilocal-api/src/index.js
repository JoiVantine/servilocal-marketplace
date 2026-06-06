const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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
const ProviderProfile = require('./models/ProviderProfile');
const ProviderReview = require('./models/ProviderReview');
const ProviderService = require('./models/ProviderService');
const UserProfile = require('./models/UserProfile');
const User = require('./models/User');
const Notification = require('./models/Notification');
const EmailTemplate = require('./models/EmailTemplate');
const Service = require('./models/Service');
const SupportTicket = require('./models/SupportTicket');

const { sendMail } = require('./utils/mail');
const multer = require('multer');

const app = express();
const server = http.createServer(app);

app.set('trust proxy', 1);

const clientOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204,
};

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.set('io', io);

// ─── Auth ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ─── Maps ───────────────────────────────────────────────────────────────────
app.use('/api/maps', require('./routes/maps'));
app.use('/api/support-tickets', require('./routes/support'));

// ─── CRUD entities ──────────────────────────────────────────────────────────
app.use('/api/service-requests', createCrudRouter(ServiceRequest, {
  fieldMap: { created_by_id: 'clientId' },
  injectUser: 'clientId',
  afterCreate: async (doc, req) => {
    const baseUrl = process.env.CLIENT_URL || 'https://www.appservilocal.com';
    // Notifica cliente
    try {
      const user = await User.findById(req.user.id);
      if (user?.email) {
        const WHEN_LABELS = { today: 'Hoje', tomorrow: 'Amanhã', this_week: 'Esta semana', next_30: 'Nos próximos 30 dias' };
        const whenLabel = doc.when === 'scheduled' && doc.scheduledAt
          ? new Date(doc.scheduledAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : (WHEN_LABELS[doc.when] || doc.when || '—');
        await sendMail(user.email, 'service_request_created', {
          fullName: user.fullName || '',
          title: doc.title,
          description: doc.description || '',
          city: doc.city || '',
          whenLabel,
          id: doc._id.toString().slice(-8).toUpperCase(),
          requestUrl: `${baseUrl}/client/request/${doc._id}`,
        }, {
          subject: 'Seu pedido foi publicado! ✅',
          text: `Olá ${user.fullName || ''}! Seu pedido "${doc.title}" foi publicado em ${doc.city}. Em breve profissionais da sua região vão se interessar.`,
        });
      }
    } catch (err) {
      console.error('[mail] service_request_created:', err.message);
    }
  },
  afterUpdate: async (doc, req) => {
    if (req.body.status !== 'completed') return;
    const baseUrl = process.env.CLIENT_URL || 'https://www.appservilocal.com';
    try {
      const client = await User.findById(doc.clientId);
      if (client?.email) {
        await sendMail(client.email, 'cliente_servico_concluido', {
          NOME_CLIENTE: client.fullName || '',
          NOME_PRESTADOR: doc.confirmedProviderName || '',
          NOME_SERVICO: doc.title || '',
          LINK_AVALIACAO: `${baseUrl}/client/request/${doc._id}`,
        }, {
          subject: 'Serviço concluído! Avalie o profissional ✅',
          text: `Olá ${client.fullName || ''}! O serviço "${doc.title}" foi concluído. Que tal avaliar o profissional?`,
        });
      }
    } catch (err) {
      console.error('[mail] cliente_servico_concluido:', err.message);
    }
  },
}));

app.use('/api/service-request-interests', createCrudRouter(ServiceRequestInterest, {
  afterCreate: async (interest, req) => {
    try {
      const baseUrl = process.env.CLIENT_URL || 'https://www.appservilocal.com';
      const request = await ServiceRequest.findById(interest.serviceRequestId);
      if (!request) return;
      const client = await User.findById(request.clientId);
      if (!client?.email) return;
      await sendMail(client.email, 'cliente_proposta_recebida', {
        NOME_CLIENTE: client.fullName || '',
        NOME_SERVICO: request.title || '',
        PRECO: interest.price || 'não informado',
        LINK_PROPOSTAS: `${baseUrl}/client/request/${request._id}/proposals`,
      }, {
        subject: 'Você recebeu uma nova proposta! 🙌',
        text: `Olá ${client.fullName || ''}! Um profissional enviou uma proposta para "${request.title}". Acesse o app para ver.`,
      });
    } catch (err) {
      console.error('[mail] cliente_proposta_recebida:', err.message);
    }
  },
}));

// ─── Progress notifications ─────────────────────────────────────────────────
const Message = require('./models/Message');
const { sendWhatsApp } = require('./utils/whatsapp');

app.post('/api/service-requests/:id/progress', requireAuth, async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Pedido não encontrado' });

    const isProvider = request.confirmedProviderId?.toString() === req.user.id;
    if (!isProvider) return res.status(403).json({ error: 'Apenas o prestador confirmado pode atualizar o progresso' });

    const { action, conversationId } = req.body;
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currentLog = request.progressLog || [];

    if (action === 'on_the_way') {
      request.progressStatus = 'on_the_way';
      request.progressLog = [...currentLog, { status: 'on_the_way', time: timeStr }];
      await request.save();

      const systemText = `🚗 ${request.confirmedProviderName || 'O prestador'} está a caminho!`;
      if (conversationId) {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          const msg = await Message.create({
            conversationId: conv._id,
            senderId: req.user.id,
            senderName: 'ServiLocal',
            senderType: 'system',
            text: systemText,
            content: systemText,
            read: false,
            attachments: [],
          });
          await Conversation.findByIdAndUpdate(conv._id, {
            lastMessage: systemText,
            lastMessageTime: msg.createdAt,
            unreadCount: (conv.unreadCount || 0) + 1,
          });
          req.app.get('io').to(`conversation:${conv.id}`).emit('new-message', msg);
        }
      }

      setImmediate(async () => {
        try {
          const client = await User.findById(request.clientId);
          const phone = client?.phone || request.clientPhone;
          const providerName = request.confirmedProviderName || 'O profissional';
          const clientName = client?.fullName || 'Cliente';
          if (phone) {
            await sendWhatsApp(phone,
              `Olá ${clientName}! 🚗 ${providerName} está a caminho para atender seu pedido de "${request.title}". Fique atento(a)!`
            );
          }
        } catch (err) {
          console.error('[whatsapp] on_the_way:', err.message);
        }
      });

      return res.json({ success: true, status: 'on_the_way' });
    }

    if (action === 'arrived') {
      request.progressStatus = 'in_progress';
      request.progressLog = [
        ...currentLog,
        { status: 'arrived', time: timeStr },
        { status: 'in_progress', time: timeStr },
      ];
      await request.save();

      const systemText = `📍 ${request.confirmedProviderName || 'O prestador'} chegou ao local e iniciou o atendimento!`;
      if (conversationId) {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          const msg = await Message.create({
            conversationId: conv._id,
            senderId: req.user.id,
            senderName: 'ServiLocal',
            senderType: 'system',
            text: systemText,
            content: systemText,
            read: false,
            attachments: [],
          });
          await Conversation.findByIdAndUpdate(conv._id, {
            lastMessage: systemText,
            lastMessageTime: msg.createdAt,
            unreadCount: (conv.unreadCount || 0) + 1,
          });
          req.app.get('io').to(`conversation:${conv.id}`).emit('new-message', msg);
        }
      }

      setImmediate(async () => {
        try {
          const client = await User.findById(request.clientId);
          const phone = client?.phone || request.clientPhone;
          const providerName = request.confirmedProviderName || 'O profissional';
          const clientName = client?.fullName || 'Cliente';
          if (phone) {
            await sendWhatsApp(phone,
              `Olá ${clientName}! 📍 ${providerName} chegou ao local e iniciou o atendimento de "${request.title}". Acompanhe pelo app!`
            );
          }
        } catch (err) {
          console.error('[whatsapp] arrived:', err.message);
        }
      });

      return res.json({ success: true, status: 'in_progress' });
    }

    if (action === 'provider_done') {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      request.progressStatus = 'provider_done';
      request.progressLog = [...currentLog, { status: 'provider_done', time: timeStr }];
      request.completionCode = code;
      await request.save();

      const systemText = `✅ Atendimento concluído pelo prestador. Confirme a conclusão no app.`;
      if (conversationId) {
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          const msg = await Message.create({
            conversationId: conv._id,
            senderId: req.user.id,
            senderName: 'ServiLocal',
            senderType: 'system',
            text: systemText,
            content: systemText,
            read: false,
            attachments: [],
          });
          await Conversation.findByIdAndUpdate(conv._id, {
            lastMessage: systemText,
            lastMessageTime: msg.createdAt,
            unreadCount: (conv.unreadCount || 0) + 1,
          });
          req.app.get('io').to(`conversation:${conv.id}`).emit('new-message', msg);
        }
      }

      setImmediate(async () => {
        try {
          const client = await User.findById(request.clientId);
          const phone = client?.phone || request.clientPhone;
          const providerName = request.confirmedProviderName || 'O profissional';
          const clientName = client?.fullName || 'Cliente';
          if (phone) {
            await sendWhatsApp(phone,
              `Olá ${clientName}! ✅ ${providerName} concluiu o atendimento de "${request.title}".\n\nSeu código de confirmação é: *${code}*\n\nAcesse o app para confirmar e finalizar o pedido.`
            );
          }
        } catch (err) {
          console.error('[whatsapp] provider_done:', err.message);
        }
      });

      return res.json({ success: true, status: 'provider_done' });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  } catch (err) {
    console.error('[progress]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/service-requests/:id/verify-completion', requireAuth, async (req, res) => {
  try {
    const request = await ServiceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Pedido não encontrado' });

    const isClient = request.clientId?.toString() === req.user.id;
    if (!isClient) return res.status(403).json({ error: 'Apenas o cliente pode confirmar a conclusão' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });
    if (request.completionCode && String(code).trim() !== String(request.completionCode).trim()) {
      return res.status(400).json({ error: 'Código inválido. Verifique o WhatsApp e tente novamente.' });
    }

    request.progressStatus = 'completed';
    request.status = 'completed';
    request.ratingStatus = 'PENDING';
    request.completionCode = null;
    await request.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chat message notification (WhatsApp to client when provider sends) ─────────
app.post('/api/conversations/:id/notify-message', requireAuth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: 'Conversa não encontrada' });

    const isProvider = conv.providerId?.toString() === req.user.id;
    if (!isProvider) return res.status(403).json({ ok: false });

    const { preview } = req.body;

    setImmediate(async () => {
      try {
        const client = await User.findById(conv.clientId);
        const phone = client?.phone;
        const providerName = conv.providerName || 'O profissional';
        const clientName = client?.fullName || 'Cliente';
        if (phone) {
          const msg = preview
            ? `Olá ${clientName}! 💬 ${providerName} enviou uma mensagem: "${preview.slice(0, 80)}"\n\nAbra o app para responder.`
            : `Olá ${clientName}! 💬 ${providerName} enviou uma mensagem. Abra o app para ver.`;
          await sendWhatsApp(phone, msg);
        }
      } catch (err) {
        console.error('[whatsapp] chat-notify:', err.message);
      }
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/conversations', require('./routes/conversations'));

app.use('/api/messages', require('./routes/messages'));

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

app.use('/api/services', createCrudRouter(Service, { publicRead: true }));

// ─── Upload ─────────────────────────────────────────────────────────────────
const _upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('audio/')) {
      return cb(new Error('Apenas imagens e audios sao permitidos'));
    }
    cb(null, true);
  },
});

app.post('/api/upload', requireAuth, _upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

    if (process.env.CLOUDINARY_URL) {
      const cloudinary = require('cloudinary').v2;
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'servilocal', resource_type: 'auto' }, (err, r) =>
            err ? reject(err) : resolve(r)
          )
          .end(req.file.buffer);
      });
      return res.json({ url: result.secure_url });
    }

    // Fallback para dev sem Cloudinary: retorna base64 data URL
    const b64 = req.file.buffer.toString('base64');
    res.json({ url: `data:${req.file.mimetype};base64,${b64}` });
  } catch (err) {
    console.error('[upload]', err.message);
    res.status(500).json({ error: 'Falha ao processar arquivo' });
  }
});

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

// ─── Admin Stats ─────────────────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const ago7d = new Date(now - 7 * 24 * 3600_000);
    const ago30d = new Date(now - 30 * 24 * 3600_000);
    const ago24h = new Date(now - 24 * 3600_000);
    const ago48h = new Date(now - 48 * 3600_000);
    const pilotCity = req.query.city || 'São José do Rio Preto';

    const [providersTotal, clientsTotal, ordersTotal, ordersCompleted, conversationsTotal, reviewsTotal] =
      await Promise.all([
        User.countDocuments({ role: 'provider' }),
        User.countDocuments({ role: 'client' }),
        ServiceRequest.countDocuments(),
        ServiceRequest.countDocuments({ status: 'completed' }),
        Conversation.countDocuments(),
        ProviderReview.countDocuments(),
      ]);

    const [active7dResult, active30dResult] = await Promise.all([
      ServiceRequestInterest.aggregate([{ $match: { createdAt: { $gte: ago7d } } }, { $group: { _id: '$providerId' } }, { $count: 'total' }]),
      ServiceRequestInterest.aggregate([{ $match: { createdAt: { $gte: ago30d } } }, { $group: { _id: '$providerId' } }, { $count: 'total' }]),
    ]);
    const providersActive7d = active7dResult[0]?.total || 0;
    const providersActive30d = active30dResult[0]?.total || 0;

    const [ordersWithProposalResult, requestsWithInterestIds] = await Promise.all([
      ServiceRequestInterest.aggregate([{ $group: { _id: '$serviceRequestId' } }, { $count: 'total' }]),
      ServiceRequestInterest.distinct('serviceRequestId'),
    ]);
    const ordersWithProposal = ordersWithProposalResult[0]?.total || 0;
    const interestSet = new Set(requestsWithInterestIds.map(id => id.toString()));

    const orderToProposal = ordersTotal > 0 ? Math.round(ordersWithProposal / ordersTotal * 100) : 0;
    const proposalToConversation = ordersWithProposal > 0 ? Math.round(conversationsTotal / ordersWithProposal * 100) : 0;
    const conversationToCompletion = conversationsTotal > 0 ? Math.round(ordersCompleted / conversationsTotal * 100) : 0;
    const orderToCompletion = ordersTotal > 0 ? Math.round(ordersCompleted / ordersTotal * 100) : 0;

    const [proposalVelocity, convVelocity, completionVelocity] = await Promise.all([
      ServiceRequestInterest.aggregate([
        { $group: { _id: '$serviceRequestId', firstAt: { $min: '$createdAt' } } },
        { $lookup: { from: 'servicerequests', localField: '_id', foreignField: '_id', as: 'req' } },
        { $unwind: '$req' },
        { $project: { h: { $divide: [{ $subtract: ['$firstAt', '$req.createdAt'] }, 3600_000] } } },
        { $group: { _id: null, avg: { $avg: '$h' } } },
      ]),
      Conversation.aggregate([
        { $group: { _id: '$serviceRequestId', firstAt: { $min: '$createdAt' } } },
        { $lookup: { from: 'servicerequests', localField: '_id', foreignField: '_id', as: 'req' } },
        { $unwind: '$req' },
        { $project: { h: { $divide: [{ $subtract: ['$firstAt', '$req.createdAt'] }, 3600_000] } } },
        { $group: { _id: null, avg: { $avg: '$h' } } },
      ]),
      ServiceRequest.aggregate([
        { $match: { status: 'completed' } },
        { $project: { h: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 3600_000] } } },
        { $group: { _id: null, avg: { $avg: '$h' } } },
      ]),
    ]);
    const avgTimeToFirstProposal = proposalVelocity[0]?.avg != null ? +proposalVelocity[0].avg.toFixed(1) : null;
    const avgTimeToFirstConversation = convVelocity[0]?.avg != null ? +convVelocity[0].avg.toFixed(1) : null;
    const avgTimeToCompletion = completionVelocity[0]?.avg != null ? +completionVelocity[0].avg.toFixed(1) : null;

    const [openIds24h, openIds48h] = await Promise.all([
      ServiceRequest.distinct('_id', { status: 'open', createdAt: { $lt: ago24h } }),
      ServiceRequest.distinct('_id', { status: 'open', createdAt: { $lt: ago48h } }),
    ]);
    const ordersWithoutProposal24h = openIds24h.filter(id => !interestSet.has(id.toString())).length;
    const ordersWithoutProposal48h = openIds48h.filter(id => !interestSet.has(id.toString())).length;

    const [avgRatingResult, clientsActive30dResult, recurringResult, multipleResult] = await Promise.all([
      ProviderProfile.aggregate([{ $match: { rating: { $gt: 0 } } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
      ServiceRequest.aggregate([{ $match: { createdAt: { $gte: ago30d } } }, { $group: { _id: '$clientId' } }, { $count: 'total' }]),
      ServiceRequest.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$clientId', n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }, { $count: 'total' }]),
      ServiceRequest.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: '$clientId', n: { $sum: 1 } } }, { $match: { n: { $gte: 2 } } }, { $count: 'total' }]),
    ]);
    const avgRating = avgRatingResult[0]?.avg != null ? +avgRatingResult[0].avg.toFixed(1) : null;
    const clientsActive30d = clientsActive30dResult[0]?.total || 0;
    const recurringClients = recurringResult[0]?.total || 0;
    const clientsMultipleCompleted = multipleResult[0]?.total || 0;

    let ticketsOpen = 0, ticketsInProgress = 0, ticketsResolved = 0;
    try {
      [ticketsOpen, ticketsInProgress, ticketsResolved] = await Promise.all([
        SupportTicket.countDocuments({ status: 'open' }),
        SupportTicket.countDocuments({ status: { $in: ['in_review', 'waiting_user'] } }),
        SupportTicket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      ]);
    } catch { /* ignore */ }

    const [pilotOrdersTotal, pilotOrdersCompleted, pilotCityRequestIds] = await Promise.all([
      ServiceRequest.countDocuments({ city: pilotCity }),
      ServiceRequest.countDocuments({ city: pilotCity, status: 'completed' }),
      ServiceRequest.distinct('_id', { city: pilotCity }),
    ]);
    const pilotConversion = pilotOrdersTotal > 0 ? Math.round(pilotOrdersCompleted / pilotOrdersTotal * 100) : 0;

    const [pilotProvidersResult, pilotClientsResult] = await Promise.all([
      ServiceRequestInterest.aggregate([
        { $match: { serviceRequestId: { $in: pilotCityRequestIds }, createdAt: { $gte: ago30d } } },
        { $group: { _id: '$providerId' } }, { $count: 'total' },
      ]),
      ServiceRequest.aggregate([
        { $match: { city: pilotCity, createdAt: { $gte: ago30d } } },
        { $group: { _id: '$clientId' } }, { $count: 'total' },
      ]),
    ]);
    const pilotProvidersActive = pilotProvidersResult[0]?.total || 0;
    const pilotClientsActive = pilotClientsResult[0]?.total || 0;

    const valActive = providersActive7d >= 30;
    const valProposal = orderToProposal >= 70;
    const valConversation = proposalToConversation >= 50;
    const valCompleted = ordersCompleted >= 20;

    res.json({
      generatedAt: now,
      overview: { providersTotal, providersActive7d, clientsTotal, ordersTotal, ordersCompleted, conversationsTotal, reviewsTotal },
      funnel: {
        ordersCreated: ordersTotal, ordersWithProposal, conversationsStarted: conversationsTotal, servicesCompleted: ordersCompleted,
        rates: { orderToProposal, proposalToConversation, conversationToCompletion, orderToCompletion },
      },
      velocity: { avgTimeToFirstProposal, avgTimeToFirstConversation, avgTimeToCompletion, ordersWithoutProposal24h, ordersWithoutProposal48h },
      providerHealth: { active7d: providersActive7d, active30d: providersActive30d, inactive30d: providersTotal - providersActive30d, avgRating, withReports: 0 },
      clientHealth: { active30d: clientsActive30d, recurring: recurringClients, withMultipleCompleted: clientsMultipleCompleted },
      operations: { ticketsOpen, ticketsInProgress, ticketsResolved, reportsOpen: 0, blockedUsers: 0 },
      pilotCity: { name: pilotCity, providersActive: pilotProvidersActive, clientsActive: pilotClientsActive, ordersCreated: pilotOrdersTotal, ordersCompleted: pilotOrdersCompleted, conversion: pilotConversion },
      ceoGoal: { target: 30, current: providersActive7d },
      validation: {
        isValidated: valActive && valProposal && valConversation && valCompleted,
        criteria: {
          activeProviders: { target: 30, current: providersActive7d, met: valActive },
          proposalRate: { target: 70, current: orderToProposal, met: valProposal },
          conversationRate: { target: 50, current: proposalToConversation, met: valConversation },
          completedServices: { target: 20, current: ordersCompleted, met: valCompleted },
        },
      },
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Confirmar prestador + notificar rejeitados ──────────────────────────────
app.post('/api/service-requests/:id/confirm-provider', requireAuth, async (req, res) => {
  try {
    const { interestId, ...updateFields } = req.body;
    const requestId = req.params.id;

    const updated = await ServiceRequest.findByIdAndUpdate(
      requestId,
      { $set: updateFields },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });

    if (interestId) {
      await ServiceRequestInterest.findByIdAndUpdate(interestId, { status: 'accepted' });
    }

    // Notificar os demais prestadores de forma assíncrona
    setImmediate(async () => {
      try {
        const rejected = await ServiceRequestInterest.find({
          serviceRequestId: requestId,
          ...(interestId ? { _id: { $ne: interestId } } : {}),
          status: { $nin: ['cancelled', 'accepted', 'rejected'] },
        }).lean();

        for (const interest of rejected) {
          await ServiceRequestInterest.findByIdAndUpdate(interest._id, { status: 'rejected' });

          await Notification.create({
            userId: interest.providerId,
            type: 'proposal_rejected',
            title: 'Proposta não selecionada',
            body: `O cliente escolheu outro profissional para o pedido de ${updated.category || 'serviço'}.`,
            description: `O cliente escolheu outro profissional para o pedido de ${updated.category || 'serviço'}.`,
            relatedId: requestId,
            data: { relatedId: requestId },
            read: false,
          });

          const provider = await User.findById(interest.providerId).lean();
          const phone = provider?.phone || interest.providerPhone;
          if (phone) {
            const firstName = (interest.providerName || '').split(' ')[0] || 'você';
            await sendWhatsApp(phone,
              `Olá ${firstName}! 👋\n\nO cliente escolheu outro profissional para o pedido de *${updated.category || 'serviço'}*.\n\nNão desanime — continue atento a novos pedidos na sua área! 💪`
            ).catch(() => {});
          }
        }
      } catch (e) {
        console.error('[confirm-provider] notify rejected error:', e.message);
      }
    });

    res.json({ ok: true, id: updated._id.toString() });
  } catch (err) {
    console.error('[confirm-provider]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Admin: Pedidos em Risco ─────────────────────────────────────────────────
app.get('/api/admin/at-risk-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const ago30min = new Date(now - 30 * 60_000);
    const ago3h = new Date(now - 3 * 3600_000);

    // Pedidos abertos há 30+ min
    const openOldIds = await ServiceRequest.distinct('_id', { status: 'open', createdAt: { $lt: ago30min } });

    // Quais têm pelo menos uma proposta
    const idsWithProposals = await ServiceRequestInterest.distinct('serviceRequestId', { serviceRequestId: { $in: openOldIds } });
    const withProposalSet = new Set(idsWithProposals.map(id => id.toString()));

    // Bucket 1: sem nenhuma proposta
    const noProposalIds = openOldIds.filter(id => !withProposalSet.has(id.toString()));
    const noProposalDocs = await ServiceRequest.find({ _id: { $in: noProposalIds } })
      .sort({ createdAt: 1 }).limit(20).lean();

    // Bucket 2: tem propostas mas cliente ignorou há 3h+
    const proposalGroups = await ServiceRequestInterest.aggregate([
      { $match: { serviceRequestId: { $in: idsWithProposals } } },
      { $group: { _id: '$serviceRequestId', lastAt: { $max: '$createdAt' }, count: { $sum: 1 } } },
      { $match: { lastAt: { $lt: ago3h } } },
    ]);
    const ignoredIds = proposalGroups.map(g => g._id);
    const proposalCountMap = Object.fromEntries(proposalGroups.map(g => [g._id.toString(), g.count]));
    const ignoredDocs = await ServiceRequest.find({ _id: { $in: ignoredIds }, status: 'open' })
      .sort({ updatedAt: 1 }).limit(20).lean();

    // Bucket 3: conversa parada há 3h+
    const stalledDocs = await ServiceRequest.find({ status: 'in_conversation', updatedAt: { $lt: ago3h } })
      .sort({ updatedAt: 1 }).limit(20).lean();

    const fmt = (r, extras = {}) => ({
      id: r._id.toString(),
      title: r.title,
      category: r.category,
      subcategory: r.subcategory,
      city: r.city,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      minutesOpen: Math.floor((now - new Date(r.createdAt)) / 60_000),
      minutesSinceUpdate: Math.floor((now - new Date(r.updatedAt)) / 60_000),
      ...extras,
    });

    res.json({
      generatedAt: now,
      no_proposals: noProposalDocs.map(r => fmt(r, { proposalCount: 0 })),
      ignored_proposals: ignoredDocs.map(r => fmt(r, { proposalCount: proposalCountMap[r._id.toString()] || 0 })),
      stalled: stalledDocs.map(r => fmt(r)),
    });
  } catch (err) {
    console.error('[admin/at-risk-requests]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Cron: alertar admin quando pedido fica 1h sem proposta ──────────────────
setInterval(async () => {
  try {
    const adminPhone = process.env.ADMIN_PHONE;
    if (!adminPhone) return;

    const now = new Date();
    const ago1h = new Date(now - 60 * 60_000);
    const ago6h = new Date(now - 6  * 60 * 60_000);

    const candidates = await ServiceRequest.find({
      status: 'open',
      noProposalNotified: { $ne: true },
      createdAt: { $lte: ago1h, $gte: ago6h },
    }).lean();

    if (!candidates.length) return;

    const ids = candidates.map(r => r._id);
    const idsWithProposals = await ServiceRequestInterest.distinct('serviceRequestId', { serviceRequestId: { $in: ids } });
    const withSet = new Set(idsWithProposals.map(id => id.toString()));
    const toNotify = candidates.filter(r => !withSet.has(r._id.toString()));

    for (const req of toNotify) {
      const minutesOpen = Math.floor((now - new Date(req.createdAt)) / 60_000);
      await sendWhatsApp(adminPhone,
        `🔔 *Pedido sem proposta há ${minutesOpen} min*\n\n` +
        `📋 ${req.category || 'Serviço'}${req.subcategory ? ' · ' + req.subcategory : ''}\n` +
        `📍 ${req.city || 'Cidade não informada'}\n` +
        `👤 ${req.clientName || 'Cliente'}\n` +
        `🔗 ID: ${req._id}`
      ).catch(() => {});
      await ServiceRequest.findByIdAndUpdate(req._id, { noProposalNotified: true });
    }

    if (toNotify.length) console.log(`[cron] admin alert: ${toNotify.length} pedidos sem proposta`);
  } catch (e) {
    console.error('[cron] admin alert error:', e.message);
  }
}, 15 * 60_000); // a cada 15 min

// ─── Cron: avisar cliente após 24h sem proposta ───────────────────────────────
setInterval(async () => {
  try {
    const now = new Date();
    const ago24h = new Date(now - 24 * 3600_000);
    const ago48h = new Date(now - 48 * 3600_000);

    const candidates = await ServiceRequest.find({
      status: 'open',
      clientNoProposalNotified: { $ne: true },
      createdAt: { $lte: ago24h, $gte: ago48h },
    }).lean();

    if (!candidates.length) return;

    const ids = candidates.map(r => r._id);
    const idsWithProposals = await ServiceRequestInterest.distinct('serviceRequestId', {
      serviceRequestId: { $in: ids },
      status: { $in: ['pending', 'in_conversation'] },
    });
    const withSet = new Set(idsWithProposals.map(id => id.toString()));
    const toNotify = candidates.filter(r => !withSet.has(r._id.toString()));

    for (const req of toNotify) {
      await Notification.create({
        userId: req.clientId,
        type: 'no_proposals_24h',
        title: 'Ainda buscando profissionais',
        body: `Ainda não recebemos propostas para seu pedido de ${req.category || 'serviço'}. Estamos notificando mais profissionais da região.`,
        relatedId: req._id,
        read: false,
      });
      if (req.clientPhone) {
        const firstName = (req.clientName || 'Cliente').split(' ')[0];
        await sendWhatsApp(req.clientPhone,
          `Olá ${firstName}! 👋\n\n` +
          `Ainda não recebemos propostas para seu pedido de *${req.category || 'serviço'}*.\n\n` +
          `Estamos notificando mais profissionais da região. Você será avisado assim que uma proposta chegar! 🔍`
        ).catch(() => {});
      }
      await ServiceRequest.findByIdAndUpdate(req._id, { clientNoProposalNotified: true });
    }

    if (toNotify.length) console.log(`[cron] client 24h alert: ${toNotify.length} pedidos`);
  } catch (e) {
    console.error('[cron] client 24h alert error:', e.message);
  }
}, 15 * 60_000);

// ─── Cron: expirar propostas após 24h ────────────────────────────────────────
setInterval(async () => {
  try {
    const now = new Date();
    const expiredInterests = await ServiceRequestInterest.find({
      status: 'pending',
      expiresAt: { $lte: now },
    }).lean();

    for (const interest of expiredInterests) {
      await ServiceRequestInterest.findByIdAndUpdate(interest._id, { status: 'expired' });

      const [req, remaining] = await Promise.all([
        ServiceRequest.findById(interest.serviceRequestId).lean(),
        ServiceRequestInterest.countDocuments({
          serviceRequestId: interest.serviceRequestId,
          status: { $in: ['pending', 'in_conversation'] },
          _id: { $ne: interest._id },
        }),
      ]);

      if (!req || !['open', 'in_conversation'].includes(req.status)) continue;

      const noMoreProposals = remaining === 0;
      const notifBody = noMoreProposals
        ? `Nenhuma proposta disponível no momento para seu pedido de ${req.category || 'serviço'}. Seu pedido continua ativo.`
        : `Uma proposta expirou no seu pedido de ${req.category || 'serviço'}. Seu pedido continua ativo.`;

      await Notification.create({
        userId: req.clientId,
        type: 'proposal_expired',
        title: noMoreProposals ? 'Sem propostas no momento' : 'Proposta expirada',
        body: notifBody,
        relatedId: req._id,
        read: false,
      });

      if (req.clientPhone) {
        const client = await User.findById(req.clientId).lean();
        const firstName = (client?.fullName || req.clientName || 'Cliente').split(' ')[0];
        const msg = noMoreProposals
          ? `Olá ${firstName}! 👋\n\nAs propostas para seu pedido de *${req.category || 'serviço'}* expiraram.\n\nSeu pedido continua ativo e estamos buscando novos profissionais para você. 🔍`
          : `Olá ${firstName}! 👋\n\nUma proposta para seu pedido de *${req.category || 'serviço'}* expirou.\n\nSeu pedido continua ativo e estamos buscando novos profissionais. ✅`;
        await sendWhatsApp(req.clientPhone, msg).catch(() => {});
      }
    }

    if (expiredInterests.length) console.log(`[cron] ${expiredInterests.length} propostas expiradas`);
  } catch (e) {
    console.error('[cron] expire proposals error:', e.message);
  }
}, 15 * 60_000);

// ─── Health ─────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// ─── Socket.IO ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  socket.on('join-conversation', (id) => socket.join(`conversation:${id}`));
  socket.on('leave-conversation', (id) => socket.leave(`conversation:${id}`));
});

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const SERVICE_SEED = [
  { name: 'Construção e Reformas', order: 1, subcategories: ['Pedreiro', 'Pintor', 'Gesseiro', 'Drywall', 'Azulejista', 'Carpinteiro', 'Serralheiro', 'Reforma Geral', 'Instalação de Pisos', 'Impermeabilização', 'Outros'] },
  { name: 'Elétrica', order: 2, subcategories: ['Eletricista Residencial', 'Eletricista Predial', 'Instalação de Tomadas', 'Instalação de Luminárias', 'Quadro Elétrico', 'Automação Residencial', 'Energia Solar', 'Outros'] },
  { name: 'Hidráulica', order: 3, subcategories: ['Encanador', 'Desentupimento', 'Vazamentos', 'Instalação de Torneiras', 'Instalação de Chuveiros', "Caixa d'Água", 'Aquecedores', 'Outros'] },
  { name: 'Pintura', order: 4, subcategories: ['Pintura Residencial', 'Pintura Comercial', 'Pintura de Fachadas', 'Pintura Interna', 'Pintura Externa', 'Texturização', 'Grafiato', 'Cimento Queimado', 'Pintura de Portões e Grades', 'Pintura de Telhados', 'Outros'] },
  { name: 'Jardinagem', order: 5, subcategories: ['Jardinagem Residencial', 'Paisagismo', 'Corte de Grama', 'Poda de Árvores', 'Manutenção de Jardins', 'Irrigação', 'Outros'] },
  { name: 'Limpeza', order: 6, subcategories: ['Limpeza Residencial', 'Limpeza Comercial', 'Pós-Obra', 'Limpeza de Estofados', 'Limpeza de Vidros', 'Higienização de Ambientes', 'Outros'] },
  { name: 'Serviços Domésticos', order: 7, subcategories: ['Diarista', 'Faxineira', 'Passadeira', 'Cozinheira', 'Babá', 'Cuidador de Idosos', 'Organizador Residencial', 'Outros'] },
  { name: 'Costuras e Ajustes', order: 8, subcategories: ['Bainha', 'Ajustes de Roupas', 'Costura Sob Medida', 'Consertos', 'Customização', 'Confecção de Peças', 'Outros'] },
  { name: 'Beleza e Estética', order: 9, subcategories: ['Cabeleireiro', 'Manicure', 'Pedicure', 'Maquiagem', 'Design de Sobrancelhas', 'Alongamento de Cílios', 'Estética Facial', 'Estética Corporal', 'Outros'] },
  { name: 'Saúde e Bem-Estar', order: 10, subcategories: ['Massagista', 'Personal Trainer', 'Nutricionista', 'Psicólogo', 'Fisioterapeuta', 'Cuidador Particular', 'Outros'] },
  { name: 'Aulas e Consultoria', order: 11, subcategories: ['Aulas Particulares', 'Idiomas', 'Música', 'Reforço Escolar', 'Consultoria Empresarial', 'Consultoria Financeira', 'Mentoria', 'Outros'] },
  { name: 'Tecnologia', order: 12, subcategories: ['Desenvolvimento de Sites', 'Desenvolvimento de Apps', 'Automação', 'IA', 'Suporte de TI', 'Banco de Dados', 'Integrações', 'Outros'] },
  { name: 'Assistência Técnica', order: 13, subcategories: ['Computadores', 'Notebooks', 'Celulares', 'Impressoras', 'TVs', 'Eletrodomésticos', 'Ar-Condicionado', 'Outros'] },
  { name: 'Design e Marketing', order: 14, subcategories: ['Designer Gráfico', 'Social Media', 'Tráfego Pago', 'Branding', 'Copywriting', 'UX/UI', 'Criação de Sites', 'Outros'] },
  { name: 'Fotografia e Vídeo', order: 15, subcategories: ['Fotógrafo', 'Filmagem', 'Drone', 'Edição de Fotos', 'Edição de Vídeos', 'Ensaios Fotográficos', 'Outros'] },
  { name: 'Eventos', order: 16, subcategories: ['Garçom', 'Bartender', 'DJ', 'Cerimonialista', 'Decoração', 'Recreação Infantil', 'Fotografia para Eventos', 'Outros'] },
  { name: 'Automotivo', order: 17, subcategories: ['Mecânico', 'Funilaria', 'Pintura Automotiva', 'Elétrica Automotiva', 'Lavação', 'Outros'] },
];

async function seedServices() {
  try {
    const count = await Service.countDocuments();
    if (count > 0) return;
    await Service.insertMany(SERVICE_SEED);
    console.log('[seed] Services seeded:', SERVICE_SEED.length, 'categories');
  } catch (err) {
    console.error('[seed] Failed to seed services:', err.message);
  }
}

connectDB()
  .then(async () => {
    await seedServices();
    server.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
  })
  .catch((err) => { console.error('[server] Erro ao conectar:', err.message); process.exit(1); });
