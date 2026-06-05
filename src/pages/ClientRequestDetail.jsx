import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Home, LifeBuoy, MessageCircle, CheckCircle2, Circle, XCircle, AlertTriangle } from 'lucide-react';
import NewServiceRequestModal from '../components/NewServiceRequestModal';
import { buildRequestSupportDraft, buildSupportComposerState } from '@/lib/support';

// ── Timeline helpers ──────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { key: 'created',     label: 'Pedido criado' },
  { key: 'proposals',   label: 'Propostas recebidas' },
  { key: 'confirmed',   label: 'Profissional confirmado' },
  { key: 'on_the_way',  label: 'A caminho' },
  { key: 'arrived',     label: 'Chegou ao local' },
  { key: 'in_progress', label: 'Em atendimento' },
  { key: 'completed',   label: 'Concluído' },
];

const PROGRESS_ORDER = ['on_the_way', 'arrived', 'in_progress', 'provider_done', 'completed'];

function progressGte(progressStatus, target) {
  if (!progressStatus) return false;
  return PROGRESS_ORDER.indexOf(progressStatus) >= PROGRESS_ORDER.indexOf(target);
}

function stepDone(stepKey, request, interests) {
  switch (stepKey) {
    case 'created':     return true;
    case 'proposals':   return interests.length > 0 || ['in_conversation', 'agreed', 'completed'].includes(request.status);
    case 'confirmed':   return ['agreed', 'completed'].includes(request.status);
    case 'on_the_way':  return progressGte(request.progressStatus, 'on_the_way');
    case 'arrived':     return progressGte(request.progressStatus, 'arrived');
    case 'in_progress': return progressGte(request.progressStatus, 'in_progress');
    case 'completed':   return request.status === 'completed';
    default: return false;
  }
}

function stepTime(stepKey, request) {
  const logKey = { on_the_way: 'on_the_way', arrived: 'arrived', in_progress: 'in_progress', completed: 'completed' }[stepKey];
  if (!logKey || !request.progressLog) return null;
  return request.progressLog.find(l => l.status === logKey)?.time || null;
}

function getCurrentStep(request, interests) {
  if (request.status === 'completed')              return 'completed';
  if (request.progressStatus === 'provider_done')  return 'provider_done';
  if (request.progressStatus === 'in_progress')    return 'in_progress';
  if (request.progressStatus === 'arrived')        return 'arrived';
  if (request.progressStatus === 'on_the_way')     return 'on_the_way';
  if (request.status === 'agreed')                 return 'confirmed';
  if (interests.length > 0 || request.status === 'in_conversation') return 'proposals';
  return 'open';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusHero({ currentStep, request, interests, conversation, onConfirm, confirmPending, navigate }) {
  const providerName = request.confirmedProviderName || 'O profissional';
  const proposalCount = interests.length;
  const departureTime = request.progressLog?.find(l => l.status === 'on_the_way')?.time;
  const arrivedTime = request.progressLog?.find(l => l.status === 'arrived')?.time;

  const configs = {
    open: {
      icon: '🔍',
      title: 'Procurando profissional',
      message: 'Estamos buscando alguém para atender seu pedido.',
      bg: 'bg-secondary/60 border-border',
    },
    proposals: {
      icon: '📨',
      title: `${proposalCount} proposta${proposalCount !== 1 ? 's' : ''} recebida${proposalCount !== 1 ? 's' : ''}`,
      message: 'Escolha o profissional que deseja contratar.',
      bg: 'bg-primary/5 border-primary/20',
      action: { label: 'Ver propostas', onClick: () => navigate(`/client/request/${request.id}/proposals`) },
    },
    confirmed: {
      icon: '✅',
      title: 'Profissional confirmado',
      message: `${providerName} aceitou seu atendimento. Aguarde o início do deslocamento.`,
      bg: 'bg-teal-50 border-teal-200',
      action: conversation ? { label: 'Abrir conversa', onClick: () => navigate(`/chat/${conversation.id}`) } : null,
    },
    on_the_way: {
      icon: '🚗',
      title: 'A caminho',
      message: `${providerName} está indo até você.${departureTime ? ` Saída: ${departureTime}` : ''}`,
      bg: 'bg-blue-50 border-blue-200',
    },
    arrived: {
      icon: '📍',
      title: 'Profissional chegou',
      message: `${providerName} informou que chegou ao local.${arrivedTime ? ` Chegada: ${arrivedTime}` : ''}`,
      bg: 'bg-teal-50 border-teal-200',
    },
    in_progress: {
      icon: '🛠️',
      title: 'Serviço em andamento',
      message: `${providerName} está realizando o serviço.`,
      bg: 'bg-blue-50 border-blue-200',
    },
    provider_done: {
      icon: '✅',
      title: 'Serviço concluído',
      message: 'Confirme se tudo foi executado corretamente.',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    completed: {
      icon: '⭐',
      title: 'Avalie o atendimento',
      message: 'Como foi a sua experiência com o profissional?',
      bg: 'bg-green-50 border-green-200',
      action: { label: 'Avaliar agora', onClick: () => navigate(`/client/request/${request.id}/rate`) },
    },
  };

  const cfg = configs[currentStep];
  if (!cfg) return null;

  return (
    <div className={`rounded-2xl border p-4 mb-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-base leading-tight">{cfg.title}</p>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{cfg.message}</p>
        </div>
      </div>

      {/* Actions */}
      {currentStep === 'provider_done' ? (
        <div className="mt-4 space-y-2">
          <button
            onClick={onConfirm}
            disabled={confirmPending}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirmPending ? 'Confirmando...' : 'Confirmar conclusão'}
          </button>
          <button
            onClick={() => navigate('/client/support', {
              state: buildSupportComposerState(
                buildRequestSupportDraft({ audience: 'client', request, conversation, counterpartName: request.confirmedProviderName || '' })
              ),
            })}
            className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Reportar problema
          </button>
        </div>
      ) : cfg.action ? (
        <button
          onClick={cfg.action.onClick}
          className="mt-3 w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {cfg.action.label}
        </button>
      ) : null}
    </div>
  );
}

function StatusTimeline({ request, interests }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progresso do pedido</p>
      <div className="flex flex-col">
        {TIMELINE_STEPS.map((step, idx) => {
          const done = stepDone(step.key, request, interests);
          const time = stepTime(step.key, request);
          const isLast = idx === TIMELINE_STEPS.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              {/* Dot + line */}
              <div className="flex flex-col items-center">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  done ? 'bg-primary border-primary' : 'border-border bg-background'
                }`}>
                  {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[1.5rem] my-0.5 transition-colors ${done ? 'bg-primary/40' : 'bg-border'}`} />
                )}
              </div>
              {/* Label */}
              <div className={`pb-4 flex items-start justify-between flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                <span className={`text-sm leading-tight ${done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </span>
                {time && (
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{time}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmedProviderCard({ request, conversation, navigate }) {
  const photo = request.confirmedProviderPhoto;
  const name = request.confirmedProviderName;
  if (!name) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          {photo ? (
            <img src={photo} alt={name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground">{name}</p>
          {request.agreedPrice && (
            <p className="text-xs text-muted-foreground">
              R$ {parseFloat(request.agreedPrice).toFixed(2).replace('.', ',')} acordado
            </p>
          )}
        </div>
        {conversation && (
          <button
            onClick={() => navigate(`/chat/${conversation.id}`)}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ClientRequestDetail({ viewerMode = 'client' }) {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdminView = viewerMode === 'admin';
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        if (!isAdminView) {
          const profiles = await api.entities.UserProfile.filter({ userId: me.id });
          if (profiles.length > 0) setUserProfile(profiles[0]);
        }
      } catch {}
    };
    load();
  }, [isAdminView]);

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
    refetchInterval: 15000,
  });

  const { data: interests = [] } = useQuery({
    queryKey: ['interests', requestId],
    queryFn: () => api.entities.ServiceRequestInterest.filter({ serviceRequestId: requestId }, '-created_date'),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['request-conversations', requestId],
    queryFn: () => api.entities.Conversation.filter({ serviceRequestId: requestId }),
    enabled: !!requestId,
    refetchInterval: 15000,
  });

  const confirmedConversation = conversations.find(c => c.providerId === request?.confirmedProviderId);

  const confirmMutation = useMutation({
    mutationFn: () => api.entities.ServiceRequest.update(requestId, {
      progressStatus: 'completed',
      status: 'completed',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.entities.ServiceRequest.update(requestId, { status: 'cancelled' });
      const [convs, interestsList] = await Promise.all([
        api.entities.Conversation.filter({ serviceRequestId: requestId }),
        api.entities.ServiceRequestInterest.filter({ serviceRequestId: requestId }),
      ]);
      await Promise.all([
        ...convs.map(c => api.entities.Conversation.update(c.id, { status: 'cancelled' })),
        ...interestsList.map(i => api.entities.ServiceRequestInterest.update(i.id, { status: 'cancelled' })),
        ...interestsList.map(i =>
          api.entities.Notification.create({
            userId: i.providerId,
            type: 'request_cancelled',
            title: 'Pedido cancelado',
            body: `O pedido de "${request.category}" em ${request.city} foi cancelado pelo cliente.`,
            read: false,
          })
        ),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      navigate('/client/orders');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Pedido não encontrado</p>
      </div>
    );
  }

  const currentStep = request.status === 'cancelled' ? 'cancelled' : getCurrentStep(request, interests);
  const isCancelled = request.status === 'cancelled';
  const isCompleted = request.status === 'completed';
  const isActive = !isCancelled && !isCompleted;
  const isConfirmedOrBeyond = ['agreed', 'completed'].includes(request.status);

  const backPath = isAdminView ? '/admin/support' : '/client';
  const requestAddress = request.address
    || [request.neighborhood, request.city].filter(Boolean).join(', ')
    || (!isAdminView && userProfile?.address
      ? `${userProfile.address}${userProfile.neighborhood ? `, ${userProfile.neighborhood}` : ''} - ${user?.city || request.city}`
      : request.city);

  const scheduleOptions = request.scheduleOptions?.length
    ? request.scheduleOptions
    : request.scheduledAt
      ? [{
          date: new Date(request.scheduledAt).toISOString().slice(0, 10),
          startTime: new Date(request.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          endTime: '',
        }]
      : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(backPath)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-lg font-bold">ServiLocal</h1>
          <button
            onClick={() => navigate(backPath)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-4">
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700">Pedido cancelado</p>
              <p className="text-xs text-red-500 mt-0.5">Este pedido não está mais visível para prestadores.</p>
            </div>
          </div>
        )}

        {/* Status hero — only for active orders */}
        {!isAdminView && !isCancelled && (
          <StatusHero
            currentStep={currentStep}
            request={request}
            interests={interests}
            conversation={confirmedConversation}
            onConfirm={() => confirmMutation.mutate()}
            confirmPending={confirmMutation.isPending}
            navigate={navigate}
          />
        )}

        {/* Timeline — always visible for non-cancelled active orders */}
        {!isAdminView && !isCancelled && (
          <StatusTimeline request={request} interests={interests} />
        )}

        {/* Confirmed provider card */}
        {!isAdminView && isConfirmedOrBeyond && (
          <ConfirmedProviderCard request={request} conversation={confirmedConversation} navigate={navigate} />
        )}

        {/* Request summary */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          <h3 className="font-semibold text-foreground mb-3 text-sm">Resumo do pedido</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{request.category}</p>
            </div>
            {request.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground mt-0.5">{request.description}</p>
              </div>
            )}
            {scheduleOptions.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Data e horário</p>
                <div className="space-y-0.5 mt-0.5">
                  {scheduleOptions.map((opt, i) => (
                    <p key={i} className="text-sm text-foreground">
                      {opt.date
                        ? new Date(`${opt.date}T00:00:00`).toLocaleDateString('pt-BR')
                        : 'Data a combinar'}
                      {opt.startTime && opt.endTime
                        ? `, entre ${opt.startTime} e ${opt.endTime}`
                        : opt.startTime ? `, a partir das ${opt.startTime}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {requestAddress && (
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm text-foreground mt-0.5">{requestAddress}</p>
              </div>
            )}
            {request.photos?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Fotos</p>
                <div className="flex gap-2 flex-wrap">
                  {request.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Support */}
        {!isAdminView && (
          <button
            onClick={() => navigate('/client/support', {
              state: buildSupportComposerState(
                buildRequestSupportDraft({
                  audience: 'client',
                  request,
                  conversation: conversations.length === 1 ? conversations[0] : null,
                  counterpartName: conversations.length === 1 ? conversations[0].providerName || '' : '',
                })
              ),
            })}
            className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-left hover:border-primary/40 transition-colors mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Precisa de ajuda?</p>
                <p className="text-xs text-muted-foreground">Fale com o suporte ServiLocal.</p>
              </div>
            </div>
          </button>
        )}

        {/* Action buttons — edit/cancel only when open or in_conversation */}
        {!isAdminView && isActive && !isConfirmedOrBeyond && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="w-full px-4 py-3.5 text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors font-medium"
            >
              Editar pedido
            </button>
            <button
              onClick={() => navigate('/client')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-muted-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              Voltar para home
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelMutation.isPending}
              className="w-full px-4 py-3.5 text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        )}

        {(isCancelled || isAdminView) && (
          <button
            onClick={() => navigate(isAdminView ? '/admin/support' : '/client/orders')}
            className="w-full px-4 py-3 text-muted-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors font-medium"
          >
            {isAdminView ? 'Voltar ao suporte' : 'Voltar aos pedidos'}
          </button>
        )}
      </div>

      {/* Edit modal */}
      {!isAdminView && showEdit && (
        <NewServiceRequestModal
          request={request}
          onClose={() => setShowEdit(false)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['request', requestId] })}
        />
      )}

      {/* Cancel confirmation modal */}
      {!isAdminView && showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="font-heading text-base font-bold text-foreground mb-2">Cancelar pedido?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Esta ação não poderá ser desfeita. Todos os prestadores interessados serão notificados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => { setShowCancelModal(false); cancelMutation.mutate(); }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
