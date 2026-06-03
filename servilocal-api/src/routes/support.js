const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const SupportTicket = require('../models/SupportTicket');
const SupportTicketEvent = require('../models/SupportTicketEvent');
const ServiceRequest = require('../models/ServiceRequest');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const router = Router();

const VALID_CATEGORIES = new Set([
  'provider_issue',
  'client_issue',
  'app_issue',
  'billing',
  'account_access',
  'suggestion',
  'other',
]);

const VALID_STATUSES = new Set([
  'open',
  'in_review',
  'waiting_user',
  'resolved',
  'closed',
]);

const VALID_PRIORITIES = new Set([
  'low',
  'medium',
  'high',
  'urgent',
]);

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function isAdminUser(user) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'joi.vantine@gmail.com').toLowerCase();
  return user?.role === 'admin' || user?.email?.toLowerCase() === adminEmail;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAttachments(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw.map((item) => String(item || '').trim()).filter(Boolean);
}

function toId(value) {
  return value ? value.toString() : null;
}

function getActorName(user) {
  return user?.fullName || user?.email || 'Usuario';
}

function getOptionalActorName(user) {
  return user ? getActorName(user) : '';
}

function getInitialPriority(category) {
  if (category === 'billing' || category === 'account_access') return 'high';
  if (category === 'suggestion') return 'low';
  return 'medium';
}

function getSort(rawSort) {
  const requested = normalizeText(rawSort) || '-lastUpdatedAt';
  const desc = requested.startsWith('-');
  const field = requested.replace(/^-/, '');
  const fieldMap = {
    created_date: 'createdAt',
    updated_date: 'updatedAt',
    lastUpdatedAt: 'lastUpdatedAt',
    priority: 'priority',
    status: 'status',
  };
  const mapped = fieldMap[field] || 'lastUpdatedAt';
  return { [mapped]: desc ? -1 : 1 };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureTicketAccess(ticket, req) {
  if (!ticket) throw httpError(404, 'Solicitacao nao encontrada');
  if (isAdmin(req)) return ticket;
  if (toId(ticket.requesterId) !== req.user.id) {
    throw httpError(403, 'Acesso negado a esta solicitacao');
  }
  return ticket;
}

async function loadUserMap(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
  if (uniqueIds.length === 0) return new Map();
  const users = await User.find({ _id: { $in: uniqueIds } }).select('_id fullName email city');
  return new Map(users.map((user) => [user._id.toString(), user]));
}

async function resolveRelations(payload, req) {
  const requesterId = req.user.id;
  const requesterRole = req.user.role;
  const rawServiceRequestId = normalizeText(payload.relatedServiceRequestId);
  const rawConversationId = normalizeText(payload.relatedConversationId);
  const rawClientId = normalizeText(payload.relatedClientId);
  const rawProviderId = normalizeText(payload.relatedProviderId);

  let serviceRequest = null;
  let conversation = null;
  let relatedServiceRequestId = rawServiceRequestId || null;
  let relatedConversationId = rawConversationId || null;
  let relatedClientId = rawClientId || null;
  let relatedProviderId = rawProviderId || null;
  let citySnapshot = normalizeText(payload.citySnapshot);

  if (relatedConversationId) {
    conversation = await Conversation.findById(relatedConversationId);
    if (!conversation) throw httpError(400, 'Conversa relacionada nao encontrada');

    const requesterInConversation = [conversation.clientId, conversation.providerId]
      .map(toId)
      .includes(requesterId);

    if (!isAdmin(req) && !requesterInConversation) {
      throw httpError(403, 'Voce nao pode vincular esta conversa ao ticket');
    }

    relatedConversationId = toId(conversation._id);
    relatedServiceRequestId = toId(conversation.serviceRequestId) || relatedServiceRequestId;
    relatedClientId = toId(conversation.clientId) || relatedClientId;
    relatedProviderId = toId(conversation.providerId) || relatedProviderId;
  }

  if (!isAdmin(req)) {
    if (requesterRole === 'client' && rawProviderId && !relatedConversationId) {
      throw httpError(400, 'Para vincular um prestador, informe a conversa relacionada');
    }
    if (requesterRole === 'provider' && rawClientId && !relatedConversationId) {
      throw httpError(400, 'Para vincular um cliente, informe a conversa relacionada');
    }
  }

  if (relatedServiceRequestId) {
    serviceRequest = await ServiceRequest.findById(relatedServiceRequestId);
    if (!serviceRequest) throw httpError(400, 'Pedido relacionado nao encontrado');

    if (
      conversation &&
      conversation.serviceRequestId &&
      toId(conversation.serviceRequestId) !== toId(serviceRequest._id)
    ) {
      throw httpError(400, 'A conversa informada pertence a outro pedido');
    }

    const requesterIsClient = toId(serviceRequest.clientId) === requesterId;
    const requesterIsProviderInConversation =
      conversation && toId(conversation.providerId) === requesterId;

    if (!isAdmin(req) && !requesterIsClient && !requesterIsProviderInConversation) {
      throw httpError(403, 'Voce nao pode vincular este pedido ao ticket');
    }

    relatedServiceRequestId = toId(serviceRequest._id);
    relatedClientId = relatedClientId || toId(serviceRequest.clientId);
    citySnapshot = citySnapshot || normalizeText(serviceRequest.city);
  }

  if (!relatedClientId && requesterRole === 'client') relatedClientId = requesterId;
  if (!relatedProviderId && requesterRole === 'provider') relatedProviderId = requesterId;

  if (!isAdmin(req) && requesterRole === 'client' && relatedClientId && relatedClientId !== requesterId) {
    throw httpError(403, 'Voce nao pode abrir ticket em nome de outro cliente');
  }

  if (!isAdmin(req) && requesterRole === 'provider' && relatedProviderId && relatedProviderId !== requesterId) {
    throw httpError(403, 'Voce nao pode abrir ticket em nome de outro prestador');
  }

  const userMap = await loadUserMap([requesterId, relatedClientId, relatedProviderId]);
  const requester = userMap.get(requesterId);

  return {
    requesterName: requester ? getActorName(requester) : (req.user.email || 'Usuario'),
    requesterEmail: requester?.email || req.user.email || '',
    relatedServiceRequestId,
    relatedConversationId,
    relatedClientId,
    relatedClientName: getOptionalActorName(userMap.get(relatedClientId)),
    relatedProviderId,
    relatedProviderName: getOptionalActorName(userMap.get(relatedProviderId)),
    citySnapshot: citySnapshot || requester?.city || '',
  };
}

async function createStatusEvent(ticket, actor, statusFrom, statusTo) {
  if (!statusTo || statusFrom === statusTo) return null;
  return SupportTicketEvent.create({
    ticketId: ticket._id,
    type: 'status_changed',
    actorId: actor?.id || null,
    actorRole: actor?.role || 'system',
    actorName: actor?.name || 'Sistema',
    statusFrom,
    statusTo,
  });
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(Number(req.query._page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(req.query._limit) || 20, 1), 100);
    const skip = (page - 1) * pageSize;
    const filters = {};

    if (!isAdmin(req)) {
      filters.requesterId = req.user.id;
    }

    const status = normalizeText(req.query.status);
    if (status) filters.status = status;

    const category = normalizeText(req.query.category);
    if (category) filters.category = category;

    if (isAdmin(req)) {
      const priority = normalizeText(req.query.priority);
      const city = normalizeText(req.query.city);
      const requesterId = normalizeText(req.query.requesterId);
      const requesterRole = normalizeText(req.query.requesterRole);
      const relatedClientId = normalizeText(req.query.relatedClientId);
      const relatedProviderId = normalizeText(req.query.relatedProviderId);
      const relatedServiceRequestId = normalizeText(req.query.relatedServiceRequestId);
      const relatedConversationId = normalizeText(req.query.relatedConversationId);
      const assignedAdminId = normalizeText(req.query.assignedAdminId);

      if (priority) filters.priority = priority;
      if (city) filters.citySnapshot = city;
      if (requesterId) filters.requesterId = requesterId;
      if (requesterRole) filters.requesterRole = requesterRole;
      if (relatedClientId) filters.relatedClientId = relatedClientId;
      if (relatedProviderId) filters.relatedProviderId = relatedProviderId;
      if (relatedServiceRequestId) filters.relatedServiceRequestId = relatedServiceRequestId;
      if (relatedConversationId) filters.relatedConversationId = relatedConversationId;
      if (assignedAdminId) filters.assignedAdminId = assignedAdminId;
    }

    const search = normalizeText(req.query.search);
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filters.$or = [
        { subject: regex },
        { description: regex },
        { requesterName: regex },
        { relatedClientName: regex },
        { relatedProviderName: regex },
      ];
    }

    const [items, total] = await Promise.all([
      SupportTicket.find(filters)
        .sort(getSort(req.query._sort))
        .skip(skip)
        .limit(pageSize),
      SupportTicket.countDocuments(filters),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = ensureTicketAccess(await SupportTicket.findById(req.params.id), req);
    res.json(ticket);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.get('/:id/events', requireAuth, async (req, res) => {
  try {
    const ticket = ensureTicketAccess(await SupportTicket.findById(req.params.id), req);
    const eventFilters = { ticketId: ticket._id };
    if (!isAdmin(req)) eventFilters.visibleToUser = true;
    const events = await SupportTicketEvent.find(eventFilters).sort({ createdAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const category = normalizeText(req.body.category);
    const subject = normalizeText(req.body.subject);
    const description = normalizeText(req.body.description);
    const attachments = normalizeAttachments(req.body.attachments);

    if (!VALID_CATEGORIES.has(category)) {
      throw httpError(400, 'Categoria invalida');
    }
    if (!subject) throw httpError(400, 'Assunto e obrigatorio');
    if (!description) throw httpError(400, 'Descricao e obrigatoria');

    const relationData = await resolveRelations(req.body, req);
    const priority = normalizeText(req.body.priority);
    const requestedAssignee = normalizeText(req.body.assignedAdminId);
    const now = new Date();

    if (requestedAssignee && !isAdmin(req)) {
      throw httpError(403, 'Apenas administradores podem atribuir tickets');
    }

    if (requestedAssignee) {
      const adminUser = await User.findById(requestedAssignee).select('_id email role');
      if (!isAdminUser(adminUser)) throw httpError(400, 'Administrador responsavel nao encontrado');
    }

    const ticket = await SupportTicket.create({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      requesterName: relationData.requesterName,
      requesterEmail: relationData.requesterEmail,
      category,
      subject,
      description,
      attachments,
      priority: isAdmin(req) && VALID_PRIORITIES.has(priority)
        ? priority
        : getInitialPriority(category),
      relatedServiceRequestId: relationData.relatedServiceRequestId,
      relatedConversationId: relationData.relatedConversationId,
      relatedClientId: relationData.relatedClientId,
      relatedClientName: relationData.relatedClientName,
      relatedProviderId: relationData.relatedProviderId,
      relatedProviderName: relationData.relatedProviderName,
      citySnapshot: relationData.citySnapshot,
      assignedAdminId: requestedAssignee || null,
      lastUpdatedAt: now,
      lastResponsePreview: description,
      lastResponderType: isAdmin(req) ? 'admin' : 'user',
    });

    await SupportTicketEvent.create({
      ticketId: ticket._id,
      type: 'created',
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName: relationData.requesterName,
      message: description,
      attachments,
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.post('/:id/replies', requireAuth, async (req, res) => {
  try {
    const ticket = ensureTicketAccess(await SupportTicket.findById(req.params.id), req);
    const message = normalizeText(req.body.message);
    const attachments = normalizeAttachments(req.body.attachments);

    if (!message && attachments.length === 0) {
      throw httpError(400, 'Envie uma mensagem ou ao menos um anexo');
    }
    if (ticket.status === 'closed') {
      throw httpError(400, 'Este ticket ja foi encerrado');
    }

    const actorMap = await loadUserMap([req.user.id]);
    const actor = actorMap.get(req.user.id);
    const actorName = getActorName(actor);
    const previousStatus = ticket.status;
    let nextStatus = previousStatus;

    if (isAdmin(req) && previousStatus === 'open') nextStatus = 'in_review';
    if (!isAdmin(req) && (previousStatus === 'waiting_user' || previousStatus === 'resolved')) {
      nextStatus = 'in_review';
    }

    const reply = await SupportTicketEvent.create({
      ticketId: ticket._id,
      type: isAdmin(req) ? 'admin_reply' : 'user_reply',
      actorId: req.user.id,
      actorRole: req.user.role,
      actorName,
      message,
      attachments,
    });

    ticket.status = nextStatus;
    ticket.lastUpdatedAt = new Date();
    ticket.lastResponsePreview = message || '[anexo]';
    ticket.lastResponderType = isAdmin(req) ? 'admin' : 'user';
    if (nextStatus !== 'resolved' && nextStatus !== 'closed') {
      ticket.resolvedAt = undefined;
      ticket.closedAt = undefined;
    }
    await ticket.save();

    await createStatusEvent(
      ticket,
      { id: req.user.id, role: req.user.role, name: actorName },
      previousStatus,
      nextStatus
    );

    res.status(201).json({ ticket, reply });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) throw httpError(404, 'Solicitacao nao encontrada');

    const nextStatus = normalizeText(req.body.status);
    const nextPriority = normalizeText(req.body.priority);
    const assignedAdminId = normalizeText(req.body.assignedAdminId);
    const updates = {};

    if (nextStatus) {
      if (!VALID_STATUSES.has(nextStatus)) throw httpError(400, 'Status invalido');
      updates.status = nextStatus;
    }

    if (nextPriority) {
      if (!VALID_PRIORITIES.has(nextPriority)) throw httpError(400, 'Prioridade invalida');
      updates.priority = nextPriority;
    }

    if ('assignedAdminId' in req.body) {
      if (assignedAdminId) {
        const adminUser = await User.findById(assignedAdminId).select('_id email role');
        if (!isAdminUser(adminUser)) throw httpError(400, 'Administrador responsavel nao encontrado');
        updates.assignedAdminId = assignedAdminId;
      } else {
        updates.assignedAdminId = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json(ticket);
    }

    const previousStatus = ticket.status;
    const actorMap = await loadUserMap([req.user.id]);
    const actor = actorMap.get(req.user.id);
    const actorName = getActorName(actor);

    Object.assign(ticket, updates, {
      lastUpdatedAt: new Date(),
      lastResponderType: 'admin',
    });

    if (updates.status === 'resolved') {
      ticket.resolvedAt = new Date();
      ticket.closedAt = undefined;
    }

    if (updates.status === 'closed') {
      if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
      ticket.closedAt = new Date();
    }

    if (updates.status && updates.status !== 'resolved' && updates.status !== 'closed') {
      ticket.closedAt = undefined;
      ticket.resolvedAt = undefined;
    }

    await ticket.save();

    if (updates.status && updates.status !== previousStatus) {
      await createStatusEvent(
        ticket,
        { id: req.user.id, role: req.user.role, name: actorName },
        previousStatus,
        updates.status
      );
    }

    res.json(ticket);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
});

module.exports = router;
