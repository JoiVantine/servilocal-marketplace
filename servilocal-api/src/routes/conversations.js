const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const {
  buildConversationAccessFilter,
  buildLimit,
  buildSort,
  ensureConversationAccess,
  findConversationById,
  httpError,
  isAdmin,
  isConversationParticipant,
  normalizeText,
  parseObjectId,
} = require('./chatAccess');

const router = Router();

function buildConversationFilters(query) {
  const filters = {};
  const clientId = parseObjectId(query.clientId, 'clientId');
  const providerId = parseObjectId(query.providerId, 'providerId');
  const serviceRequestId = parseObjectId(query.serviceRequestId, 'serviceRequestId');
  const status = normalizeText(query.status);

  if (clientId) filters.clientId = clientId;
  if (providerId) filters.providerId = providerId;
  if (serviceRequestId) filters.serviceRequestId = serviceRequestId;
  if (status) filters.status = status;

  return filters;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const filters = {
      ...buildConversationFilters(req.query),
      ...buildConversationAccessFilter(req),
    };
    const sort = buildSort(req.query._sort, {
      created_date: 'createdAt',
      updated_date: 'updatedAt',
      lastMessageTime: 'lastMessageTime',
    }, 'lastMessageTime');
    const limit = buildLimit(req.query._limit);

    const conversations = await Conversation.find(filters)
      .sort(sort)
      .limit(limit);

    res.json(conversations);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const conversation = ensureConversationAccess(
      await findConversationById(req.params.id),
      req
    );
    res.json(conversation);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const clientId = parseObjectId(req.body.clientId, 'clientId', { required: true });
    const providerId = parseObjectId(req.body.providerId, 'providerId', { required: true });
    const serviceRequestId = parseObjectId(req.body.serviceRequestId, 'serviceRequestId');

    if (!isAdmin(req) && ![clientId, providerId].includes(req.user.id)) {
      throw httpError(403, 'Voce nao pode criar uma conversa para outros usuarios');
    }

    const conversation = await Conversation.create({
      serviceRequestId: serviceRequestId || undefined,
      clientId,
      clientName: normalizeText(req.body.clientName),
      providerId,
      providerName: normalizeText(req.body.providerName),
      status: normalizeText(req.body.status) || 'active',
      lastMessage: normalizeText(req.body.lastMessage) || undefined,
      lastMessageTime: req.body.lastMessageTime || undefined,
      unreadCount: Number.isFinite(Number(req.body.unreadCount)) ? Number(req.body.unreadCount) : 0,
    });

    res.status(201).json(conversation);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const conversation = ensureConversationAccess(
      await findConversationById(req.params.id),
      req
    );

    const updates = {};

    if ('status' in req.body) {
      const status = normalizeText(req.body.status);
      if (status) updates.status = status;
    }

    if ('lastMessage' in req.body) {
      updates.lastMessage = normalizeText(req.body.lastMessage);
    }

    if ('lastMessageTime' in req.body) {
      updates.lastMessageTime = req.body.lastMessageTime || null;
    }

    if ('unreadCount' in req.body) {
      const unreadCount = Number(req.body.unreadCount);
      updates.unreadCount = Number.isFinite(unreadCount) && unreadCount >= 0 ? unreadCount : 0;
    }

    if (isAdmin(req)) {
      if ('clientName' in req.body) updates.clientName = normalizeText(req.body.clientName);
      if ('providerName' in req.body) updates.providerName = normalizeText(req.body.providerName);
      if ('serviceRequestId' in req.body) {
        updates.serviceRequestId = parseObjectId(req.body.serviceRequestId, 'serviceRequestId') || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(conversation);
    }

    Object.assign(conversation, updates);
    await conversation.save();
    res.json(conversation);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await findConversationById(req.params.id);
    if (!conversation) throw httpError(404, 'Conversa nao encontrada');
    if (!isAdmin(req) && !isConversationParticipant(conversation, req.user.id)) {
      throw httpError(403, 'Acesso negado a esta conversa');
    }
    await conversation.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
