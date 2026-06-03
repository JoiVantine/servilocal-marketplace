const { isValidObjectId } = require('mongoose');
const Conversation = require('../models/Conversation');

function isAdmin(req) {
  return req.user?.role === 'admin';
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toId(value) {
  return value ? value.toString() : null;
}

function buildLimit(rawLimit, fallback = 200, max = 500) {
  return Math.min(Math.max(Number(rawLimit) || fallback, 1), max);
}

function buildSort(rawSort, fieldMap, fallbackField) {
  const requested = normalizeText(rawSort);
  const rawField = requested ? requested.replace(/^-/, '') : fallbackField;
  const desc = requested ? requested.startsWith('-') : true;
  const mappedField = fieldMap[rawField] || fallbackField;
  return { [mappedField]: desc ? -1 : 1 };
}

function parseObjectId(value, fieldName, options = {}) {
  const { required = false, invalidStatus = 400 } = options;
  const normalized = normalizeText(value);

  if (!normalized) {
    if (required) throw httpError(400, `${fieldName} e obrigatorio`);
    return null;
  }

  if (!isValidObjectId(normalized)) {
    throw httpError(invalidStatus, `${fieldName} invalido`);
  }

  return normalized;
}

function isConversationParticipant(conversation, userId) {
  const normalizedUserId = toId(userId);
  return [conversation?.clientId, conversation?.providerId].map(toId).includes(normalizedUserId);
}

function ensureConversationAccess(conversation, req) {
  if (!conversation) throw httpError(404, 'Conversa nao encontrada');
  if (isAdmin(req)) return conversation;
  if (!isConversationParticipant(conversation, req.user.id)) {
    throw httpError(403, 'Acesso negado a esta conversa');
  }
  return conversation;
}

async function findConversationById(id, options = {}) {
  const { required = true } = options;
  const parsedId = parseObjectId(id, 'Conversa', {
    required,
    invalidStatus: required ? 404 : 400,
  });
  if (!parsedId) return null;
  return Conversation.findById(parsedId);
}

function buildConversationAccessFilter(req) {
  if (isAdmin(req)) return {};
  return {
    $or: [
      { clientId: req.user.id },
      { providerId: req.user.id },
    ],
  };
}

module.exports = {
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
  toId,
};
