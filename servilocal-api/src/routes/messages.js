const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const {
  buildConversationAccessFilter,
  buildLimit,
  buildSort,
  ensureConversationAccess,
  findConversationById,
  httpError,
  isAdmin,
  normalizeText,
  parseObjectId,
  toId,
} = require('./chatAccess');

const router = Router();

function buildMessageFilters(query) {
  const filters = {};
  const senderId = parseObjectId(query.senderId, 'senderId');
  const senderType = normalizeText(query.senderType);

  if (senderId) filters.senderId = senderId;
  if (senderType) filters.senderType = senderType;

  if ('read' in query) {
    filters.read = String(query.read) === 'true';
  }

  return filters;
}

async function getAccessibleConversationIds(req) {
  if (isAdmin(req)) return null;
  return Conversation.find(buildConversationAccessFilter(req)).distinct('_id');
}

function getSenderType(conversation, req) {
  if (isAdmin(req)) return 'admin';
  if (toId(conversation.clientId) === req.user.id) return 'client';
  if (toId(conversation.providerId) === req.user.id) return 'provider';
  throw httpError(403, 'Acesso negado a esta conversa');
}

function normalizeAttachments(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .map((item) => ({
      url: normalizeText(item?.url),
      type: ['image', 'audio', 'file'].includes(item?.type) ? item.type : 'file',
      name: normalizeText(item?.name),
      mimeType: normalizeText(item?.mimeType),
    }))
    .filter((item) => item.url);
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = buildMessageFilters(req.query);
    const conversationId = normalizeText(req.query.conversationId);
    const sort = buildSort(req.query._sort, {
      created_date: 'createdAt',
      updated_date: 'updatedAt',
    }, 'createdAt');
    const limit = buildLimit(req.query._limit);

    if (conversationId) {
      const conversation = ensureConversationAccess(
        await findConversationById(conversationId),
        req
      );
      filters.conversationId = conversation._id;
    } else {
      const accessibleConversationIds = await getAccessibleConversationIds(req);
      if (accessibleConversationIds && accessibleConversationIds.length === 0) {
        return res.json([]);
      }
      if (accessibleConversationIds) {
        filters.conversationId = { $in: accessibleConversationIds };
      }
    }

    const messages = await Message.find(filters)
      .sort(sort)
      .limit(limit);

    res.json(messages);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const messageId = parseObjectId(req.params.id, 'Mensagem', { required: true, invalidStatus: 404 });
    const message = await Message.findById(messageId);
    if (!message) throw httpError(404, 'Mensagem nao encontrada');

    const conversation = ensureConversationAccess(
      await Conversation.findById(message.conversationId),
      req
    );

    if (!conversation) throw httpError(404, 'Conversa nao encontrada');
    res.json(message);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const conversation = ensureConversationAccess(
      await findConversationById(req.body.conversationId),
      req
    );
    const messageText = normalizeText(req.body.text) || normalizeText(req.body.content);
    const attachments = normalizeAttachments(req.body.attachments);

    if (!messageText && attachments.length === 0) throw httpError(400, 'Mensagem ou anexo e obrigatorio');

    const sender = await User.findById(req.user.id).select('fullName email');
    const message = await Message.create({
      conversationId: conversation._id,
      senderId: req.user.id,
      senderName: sender?.fullName || sender?.email || '',
      senderType: getSenderType(conversation, req),
      text: messageText,
      content: messageText,
      attachments,
      read: false,
    });

    req.app.get('io').to(`conversation:${conversation.id}`).emit('new-message', message);
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: message.text || message.content || (attachments[0]?.type === 'audio' ? 'Audio enviado' : 'Imagem enviada'),
      lastMessageTime: message.createdAt,
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const messageId = parseObjectId(req.params.id, 'Mensagem', { required: true, invalidStatus: 404 });
    const message = await Message.findById(messageId);
    if (!message) throw httpError(404, 'Mensagem nao encontrada');

    ensureConversationAccess(await Conversation.findById(message.conversationId), req);

    const updates = {};

    if ('read' in req.body) {
      updates.read = Boolean(req.body.read);
    }

    if ('readAt' in req.body) {
      updates.readAt = req.body.readAt || null;
      if (!('read' in updates)) {
        updates.read = Boolean(req.body.readAt);
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(message);
    }

    Object.assign(message, updates);
    await message.save();
    res.json(message);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const messageId = parseObjectId(req.params.id, 'Mensagem', { required: true, invalidStatus: 404 });
    const message = await Message.findById(messageId);
    if (!message) throw httpError(404, 'Mensagem nao encontrada');

    ensureConversationAccess(await Conversation.findById(message.conversationId), req);

    if (!isAdmin(req) && toId(message.senderId) !== req.user.id) {
      throw httpError(403, 'Voce so pode excluir mensagens enviadas por voce');
    }

    await message.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
