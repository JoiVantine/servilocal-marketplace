export const SUPPORT_CATEGORY_OPTIONS = [
  { value: 'provider_issue', label: 'Problema com prestador' },
  { value: 'client_issue', label: 'Problema com cliente' },
  { value: 'app_issue', label: 'Problema no aplicativo' },
  { value: 'billing', label: 'Cobranca' },
  { value: 'account_access', label: 'Conta e acesso' },
  { value: 'suggestion', label: 'Sugestao' },
  { value: 'other', label: 'Outro' },
];

export const SUPPORT_CATEGORY_LABELS = Object.fromEntries(
  SUPPORT_CATEGORY_OPTIONS.map((option) => [option.value, option.label])
);

export const SUPPORT_STATUS_LABELS = {
  open: 'Aberto',
  in_review: 'Em analise',
  waiting_user: 'Aguardando usuario',
  resolved: 'Resolvido',
  closed: 'Encerrado',
};

export const SUPPORT_STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-700',
  in_review: 'bg-blue-100 text-blue-700',
  waiting_user: 'bg-violet-100 text-violet-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
};

export const SUPPORT_PRIORITY_LABELS = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

export const SUPPORT_EVENT_LABELS = {
  created: 'Solicitacao criada',
  user_reply: 'Usuario respondeu',
  admin_reply: 'Equipe respondeu',
  status_changed: 'Status atualizado',
  system_note: 'Atualizacao do sistema',
};

export function supportBasePath(audience) {
  return `/${audience}/support`;
}

export function supportTicketPath(audience, ticketId) {
  return `${supportBasePath(audience)}/${ticketId}`;
}

export function buildSupportComposerState(supportDraft) {
  return {
    openComposer: true,
    supportDraft,
  };
}

function normalizeSupportRequestValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getSupportRequestIdentifier(id) {
  const raw = normalizeSupportRequestValue(id);
  if (!raw) return '';

  if (/^[a-f0-9]{24}$/i.test(raw)) {
    return `#${raw.slice(-6).toUpperCase()}`;
  }

  const compact = raw
    .replace(/^(service[-_ ]?request|request|pedido)[-_:# ]*/i, '')
    .trim();

  if (!compact) return '';
  if (compact.length <= 12) return compact.toUpperCase();
  return `#${raw.slice(-6).toUpperCase()}`;
}

export function getSupportRequestLabel(request) {
  const title = normalizeSupportRequestValue(request?.title);
  const category = normalizeSupportRequestValue(request?.category);
  const city = normalizeSupportRequestValue(request?.city);
  const identifier = getSupportRequestIdentifier(request?.id || request?._id);

  if (title) return title;
  if (category && city) return `${category} em ${city}`;
  if (category) return category;
  if (city) return `servico em ${city}`;
  if (identifier) return identifier;
  return 'solicitacao vinculada';
}

export function getSupportRequestOptionLabel(request) {
  const title = normalizeSupportRequestValue(request?.title);
  const category = normalizeSupportRequestValue(request?.category);
  const city = normalizeSupportRequestValue(request?.city);

  if (title && city) return `${title} - ${city}`;
  if (title) return title;
  if (category && city) return `${category} - ${city}`;
  if (category) return category;

  const fallback = getSupportRequestLabel(request);
  return fallback.startsWith('#') ? `Pedido ${fallback}` : fallback;
}

export function buildConversationSupportDraft({ audience, conversation, request }) {
  const counterpart = getConversationCounterpart(conversation, audience);
  const requestLabel = getSupportRequestLabel(request || {
    id: conversation?.serviceRequestId,
  });

  return {
    category: audience === 'provider' ? 'client_issue' : 'provider_issue',
    subject: `Ajuda com ${counterpart} no pedido ${requestLabel}`,
    relatedConversationId: conversation?.id || '',
    relatedServiceRequestId: conversation?.serviceRequestId || request?.id || '',
    sourceLabel: `Conversa com ${counterpart} • Pedido ${requestLabel}`,
  };
}

export function buildRequestSupportDraft({ audience, request, conversation, counterpartName }) {
  const requestLabel = getSupportRequestLabel(request);
  const targetLabel = counterpartName
    ? (audience === 'provider' ? `Cliente ${counterpartName}` : `Prestador ${counterpartName}`)
    : null;

  return {
    category: conversation?.id
      ? (audience === 'provider' ? 'client_issue' : 'provider_issue')
      : '',
    subject: targetLabel
      ? `Ajuda com ${targetLabel.toLowerCase()} no pedido ${requestLabel}`
      : `Ajuda com o pedido ${requestLabel}`,
    relatedConversationId: conversation?.id || '',
    relatedServiceRequestId: request?.id || conversation?.serviceRequestId || '',
    sourceLabel: [
      `Pedido ${requestLabel}`,
      targetLabel,
      conversation?.id ? 'conversa vinculada' : null,
    ].filter(Boolean).join(' • '),
  };
}

export function formatSupportDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSupportDateLong(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getConversationCounterpart(conversation, audience) {
  if (audience === 'provider') return conversation.clientName || 'Cliente';
  return conversation.providerName || 'Prestador';
}

export function getSupportEventTitle(event) {
  if (event.type === 'status_changed' && event.statusTo) {
    return `Status alterado para ${SUPPORT_STATUS_LABELS[event.statusTo] || event.statusTo}`;
  }

  if (event.type === 'admin_reply') {
    return event.actorName ? `${event.actorName} respondeu` : SUPPORT_EVENT_LABELS[event.type];
  }

  if (event.type === 'user_reply') {
    return event.actorName ? `${event.actorName} respondeu` : SUPPORT_EVENT_LABELS[event.type];
  }

  return SUPPORT_EVENT_LABELS[event.type] || 'Atualizacao';
}
