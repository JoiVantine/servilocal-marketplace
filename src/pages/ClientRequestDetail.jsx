import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Home, LifeBuoy, MessageCircle, CheckCircle2, Circle, XCircle, AlertTriangle, Banknote, CreditCard, QrCode, Phone } from 'lucide-react';
import NewServiceRequestModal from '../components/NewServiceRequestModal';
import { buildRequestSupportDraft, buildSupportComposerState } from '@/lib/support';

// ── Timeline helpers ──────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  { key: 'created',   emoji: '✅', label: 'Pedido criado',           desc: 'Seu pedido foi publicado com sucesso.' },
  { key: 'proposals', emoji: '⏳', label: 'Recebendo propostas',     desc: 'Profissionais da região estão analisando seu pedido.' },
  { key: 'confirmed', emoji: '👷', label: 'Profissional contratado', desc: 'Você escolheu um profissional para realizar o serviço.' },
  { key: 'on_the_way',    emoji: '🚗', label: 'A caminho',              desc: 'O profissional está indo até você.' },
  { key: 'in_progress',   emoji: '🛠️', label: 'Em execução',            desc: 'O profissional está realizando o serviço.' },
  { key: 'provider_done', emoji: '🔑', label: 'Aguardando confirmação', desc: 'Confirme a conclusão com o código enviado pelo WhatsApp.' },
  { key: 'completed', emoji: '🎉', label: 'Serviço concluído',       desc: 'Atendimento finalizado.' },
];

const EXEC_STEP_ORDER = ['on_the_way', 'in_progress', 'provider_done', 'completed'];

function stepDone(stepKey, request, interests) {
  const activeInterests = interests.filter(i => !['expired', 'rejected', 'cancelled'].includes(i.status));
  switch (stepKey) {
    case 'created':   return true;
    case 'proposals': return activeInterests.length > 0 || ['in_conversation', 'agreed', 'completed'].includes(request.status);
    case 'confirmed': return ['agreed', 'completed'].includes(request.status);
    case 'on_the_way':    return EXEC_STEP_ORDER.indexOf(request.progressStatus) >= EXEC_STEP_ORDER.indexOf('on_the_way') || request.status === 'completed';
    case 'in_progress':   return EXEC_STEP_ORDER.indexOf(request.progressStatus) >= EXEC_STEP_ORDER.indexOf('in_progress') || request.status === 'completed';
    case 'provider_done': return request.progressStatus === 'provider_done' || request.status === 'completed';
    case 'completed': return request.status === 'completed';
    default: return false;
  }
}

function showExecStep(stepKey, request) {
  if (!['agreed', 'completed'].includes(request.status)) return false;
  if (stepKey === 'on_the_way') return !!request.progressStatus;
  if (stepKey === 'in_progress') return ['in_progress', 'arrived', 'provider_done', 'completed'].includes(request.progressStatus) || request.status === 'completed';
  if (stepKey === 'provider_done') return ['provider_done'].includes(request.progressStatus) || request.status === 'completed';
  return false;
}

function getCurrentStep(request, interests) {
  if (request.status === 'completed')              return 'completed';
  if (request.progressStatus === 'provider_done')  return 'provider_done';
  const activeInterests = interests.filter(i => !['expired', 'rejected', 'cancelled'].includes(i.status));
  if (request.status === 'open' && interests.length > 0 && activeInterests.length === 0) return 'proposals_expired';
  if (request.progressStatus === 'in_progress')    return 'in_progress';
  if (request.progressStatus === 'arrived')        return 'arrived';
  if (request.progressStatus === 'on_the_way')     return 'on_the_way';
  if (request.status === 'agreed')                 return 'confirmed';
  if (activeInterests.length > 0 || request.status === 'in_conversation') return 'proposals';
  return 'open';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusHero({ currentStep, request, interests, onConfirm, confirmPending, navigate, codeValue, onCodeChange, codeError, conversation, onCancel }) {
  const [waitingConfirmed, setWaitingConfirmed] = useState(false);
  const providerName = request.confirmedProviderName || 'O profissional';
  const activeInterests = interests.filter(i => !['expired', 'rejected', 'cancelled'].includes(i.status));
  const proposalCount = activeInterests.length;

  const configs = {
    open: {
      icon: '🔍',
      title: 'Procurando profissional',
      message: 'Estamos buscando profissionais da sua região para atender seu pedido.',
      info: proposalCount === 0
        ? '0 propostas recebidas por enquanto'
        : `${proposalCount} proposta${proposalCount !== 1 ? 's' : ''} recebida${proposalCount !== 1 ? 's' : ''}`,
      bg: 'bg-secondary/60 border-border',
    },
    proposals: {
      icon: '📨',
      title: 'Propostas recebidas',
      message: `Você recebeu ${proposalCount} proposta${proposalCount !== 1 ? 's' : ''} para este pedido.`,
      bg: 'bg-primary/5 border-primary/20',
    },
    proposals_expired: {
      icon: '🔎',
      title: 'Procurando profissionais',
      message: 'Nenhuma proposta está disponível no momento. Seu pedido continua ativo e estamos buscando mais profissionais.',
      bg: 'bg-orange-50 border-orange-200',
    },
    confirmed: {
      icon: '👷',
      title: 'Profissional contratado',
      message: 'Acompanhe a conversa e combine os detalhes do atendimento.',
      bg: 'bg-teal-50 border-teal-200',
    },
    on_the_way: {
      icon: '🚗',
      title: 'A caminho',
      message: `${providerName} está indo até você.`,
      bg: 'bg-blue-50 border-blue-200',
    },
    arrived: {
      icon: '📍',
      title: 'Profissional chegou',
      message: `${providerName} informou que chegou ao local.`,
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
      title: 'Serviço concluído pelo profissional',
      message: 'Confirme se tudo foi executado corretamente.',
      bg: 'bg-yellow-50 border-yellow-200',
    },
    completed: {
      icon: '⭐',
      title: 'Avalie o atendimento',
      message: 'Como foi a sua experiência com o profissional?',
      bg: 'bg-green-50 border-green-200',
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
          {cfg.info && (
            <p className="text-xs font-medium text-muted-foreground mt-2 bg-background/60 inline-block px-2 py-0.5 rounded-full">
              {cfg.info}
            </p>
          )}
        </div>
      </div>

      {/* Confirmação de conclusão — fluxo especial com código */}
      {currentStep === 'provider_done' && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">Digite o código enviado ao seu WhatsApp para confirmar:</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={codeValue}
            onChange={e => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className={`w-full px-4 py-3 border rounded-xl text-center text-2xl font-bold tracking-[0.4em] bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 ${codeError ? 'border-red-400' : 'border-border'}`}
          />
          {codeError && <p className="text-xs text-red-500 text-center">{codeError}</p>}
          <button
            onClick={onConfirm}
            disabled={confirmPending || !codeValue}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {confirmPending ? 'Confirmando...' : 'Confirmar conclusão'}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Não recebeu o código?{' '}
            <button
              onClick={() => navigate('/client/support', {
                state: buildSupportComposerState(
                  buildRequestSupportDraft({ audience: 'client', request, conversation, counterpartName: request.confirmedProviderName || '', customIssue: 'Não recebi o código de confirmação via WhatsApp para concluir o atendimento.' })
                ),
              })}
              className="text-primary font-medium underline underline-offset-2"
            >
              Fale com o suporte
            </button>
          </p>
          <button
            onClick={() => navigate('/client/support', {
              state: buildSupportComposerState(
                buildRequestSupportDraft({ audience: 'client', request, conversation, counterpartName: request.confirmedProviderName || '' })
              ),
            })}
            className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Reportar problema com o serviço
          </button>
        </div>
      )}

      {/* Ações quando todas as propostas expiraram */}
      {currentStep === 'proposals_expired' && !waitingConfirmed && (
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setWaitingConfirmed(true)}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Continuar aguardando
          </button>
          <button
            onClick={() => navigate(`/client/request/${request.id}/edit`)}
            className="w-full py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            Editar pedido
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 text-red-600 text-sm font-medium hover:underline transition-colors"
          >
            Cancelar pedido
          </button>
        </div>
      )}
    </div>
  );
}

function StatusTimeline({ request, interests }) {
  const visibleSteps = TIMELINE_STEPS.filter(step => {
    const execKeys = ['on_the_way', 'in_progress', 'provider_done'];
    if (execKeys.includes(step.key)) return showExecStep(step.key, request);
    return true;
  });
  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Progresso do pedido</p>
      <div className="flex flex-col">
        {visibleSteps.map((step, idx) => {
          const done = stepDone(step.key, request, interests);
          const isLast = idx === visibleSteps.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-base transition-colors ${
                  done ? 'bg-primary/10' : 'bg-secondary'
                }`}>
                  <span className={done ? '' : 'grayscale opacity-40'}>{step.emoji}</span>
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[1.25rem] my-1 transition-colors ${done ? 'bg-primary/30' : 'bg-border'}`} />
                )}
              </div>
              <div className={`pb-4 flex-1 min-w-0 ${isLast ? 'pb-0' : ''}`}>
                <p className={`text-sm leading-tight ${done ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                  {step.label}
                </p>
                {done && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PAYMENT_ICONS = { PIX: QrCode, DINHEIRO: Banknote, CARTAO_PRESENCIAL: CreditCard };
const PAYMENT_LABELS = { PIX: 'Pix', DINHEIRO: 'Dinheiro', CARTAO_PRESENCIAL: 'Cartão na maquininha' };
const PIX_TYPE_LABELS = { ALEATORIA: 'Chave aleatória', CPF: 'CPF', CNPJ: 'CNPJ', EMAIL: 'E-mail', TELEFONE: 'Telefone' };

function ConfirmedProviderCard({ request, conversation, navigate, onMarkPaid, markingPaid }) {
  const photo = request.confirmedProviderPhoto;
  const name = request.confirmedProviderName;
  const pixKey = request.confirmedProviderPixKey;
  const pixKeyType = request.confirmedProviderPixKeyType;
  const provPhone = request.confirmedProviderPhone;
  const paymentMethod = request.paymentMethod;
  const paymentStatus = request.paymentStatus;
  if (!name) return null;

  const PayIcon = PAYMENT_ICONS[paymentMethod];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-center gap-3 mb-3">
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
          {provPhone && (
            <a
              href={`tel:${provPhone.replace(/\D/g, '')}`}
              className="mt-1 flex items-center gap-1 text-xs text-primary font-medium hover:opacity-80"
            >
              <Phone className="w-3 h-3" />{provPhone}
            </a>
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
      {/* Payment info */}
      {paymentMethod && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
            {PayIcon && <PayIcon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Forma de pagamento</p>
              <p className="text-sm font-medium text-foreground">{PAYMENT_LABELS[paymentMethod] || paymentMethod}</p>
            </div>
            {paymentStatus === 'PAGO' && (
              <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                Pago
              </span>
            )}
          </div>

          {paymentMethod === 'PIX' && pixKey && (
            <div className="bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">Chave Pix · {PIX_TYPE_LABELS[pixKeyType] || pixKeyType}</p>
              <p className="text-sm font-medium text-foreground break-all">{pixKey}</p>
            </div>
          )}

          {paymentStatus === 'PENDENTE' && request.status === 'completed' && (
            <button
              onClick={onMarkPaid}
              disabled={markingPaid}
              className="w-full py-2.5 border border-green-300 text-green-700 bg-green-50 rounded-xl text-sm font-semibold hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {markingPaid ? 'Registrando...' : 'Marcar como pago'}
            </button>
          )}
        </div>
      )}

      {/* Pix key (when no payment method selected, legacy) */}
      {!paymentMethod && pixKey && (
        <div className="mt-3 bg-secondary/50 rounded-xl px-3 py-2.5 border border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Chave Pix · {PIX_TYPE_LABELS[pixKeyType] || pixKeyType}</p>
          <p className="text-sm font-medium text-foreground break-all">{pixKey}</p>
        </div>
      )}
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
  const [undoVisible, setUndoVisible] = useState(false);
  const [completionCode, setCompletionCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const undoTimerRef = useRef(null);

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
    mutationFn: () => api.progress.verifyCompletion(requestId, completionCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      navigate(`/client/request/${requestId}/rate`);
    },
    onError: (err) => {
      setCodeError(err.message || 'Código inválido.');
    },
  });

  const doCancelRequest = async () => {
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
  };

  const cancelMutation = useMutation({
    mutationFn: doCancelRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      setUndoVisible(true);
      undoTimerRef.current = setTimeout(() => {
        setUndoVisible(false);
        navigate('/client/orders');
      }, 30000);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: () => api.entities.ServiceRequest.update(requestId, { paymentStatus: 'PAGO' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['request', requestId] }),
  });

  const handleUndoCancel = async () => {
    clearTimeout(undoTimerRef.current);
    setUndoVisible(false);
    await api.entities.ServiceRequest.update(requestId, { status: 'open' });
    queryClient.invalidateQueries({ queryKey: ['request', requestId] });
  };

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

        {/* 1. Status principal */}
        {!isAdminView && !isCancelled && (
          <StatusHero
            currentStep={currentStep}
            request={request}
            interests={interests}
            conversation={confirmedConversation}
            onConfirm={() => confirmMutation.mutate()}
            confirmPending={confirmMutation.isPending}
            navigate={navigate}
            codeValue={completionCode}
            onCodeChange={(v) => { setCompletionCode(v); setCodeError(''); }}
            codeError={codeError}
            onCancel={() => setShowCancelModal(true)}
          />
        )}

        {/* 2. Timeline simplificada */}
        {!isAdminView && !isCancelled && (
          <StatusTimeline request={request} interests={interests} />
        )}

        {/* 3. Botão principal */}
        {!isAdminView && !isCancelled && currentStep === 'proposals' && (
          <button
            onClick={() => navigate(`/client/request/${request.id}/proposals`)}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mb-4"
          >
            Ver propostas
          </button>
        )}
        {!isAdminView && !isCancelled && (currentStep === 'confirmed' || currentStep === 'on_the_way' || currentStep === 'arrived' || currentStep === 'in_progress') && confirmedConversation && (
          <button
            onClick={() => navigate(`/chat/${confirmedConversation.id}`)}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mb-4"
          >
            Abrir conversa
          </button>
        )}
        {!isAdminView && !isCancelled && currentStep === 'completed' && (
          <button
            onClick={() => navigate(`/client/request/${request.id}/rate`)}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity mb-4"
          >
            Avaliar agora
          </button>
        )}

        {/* Confirmed provider card (pagamento, telefone) */}
        {!isAdminView && isConfirmedOrBeyond && (
          <ConfirmedProviderCard
            request={request}
            conversation={confirmedConversation}
            navigate={navigate}
            onMarkPaid={() => markPaidMutation.mutate()}
            markingPaid={markPaidMutation.isPending}
          />
        )}

        {/* 4. Resumo do pedido */}
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
            {request.clientNotes?.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Notas adicionadas</p>
                <div className="space-y-1 mt-1">
                  {request.clientNotes.map((note, i) => (
                    <p key={`${note.createdAt || i}`} className="text-sm text-foreground bg-secondary/50 rounded-lg px-3 py-2">
                      {note.text}
                    </p>
                  ))}
                </div>
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

        {/* 5. Suporte */}
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
                <p className="text-xs text-muted-foreground">Nossa equipe pode ajudar você.</p>
              </div>
              <span className="ml-auto text-xs text-primary font-semibold shrink-0">Falar com suporte</span>
            </div>
          </button>
        )}

        {/* 6–8. Editar / Home / Cancelar */}
        {!isAdminView && isActive && !isConfirmedOrBeyond && (
          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={() => navigate(`/client/request/${request.id}/edit`)}
              className="w-full px-4 py-3.5 text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors font-medium text-sm"
            >
              Editar pedido
            </button>
            <button
              onClick={() => navigate('/client')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-muted-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors text-sm"
            >
              <Home className="w-4 h-4" />
              Voltar para home
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelMutation.isPending}
              className="w-full px-4 py-2.5 text-muted-foreground text-sm hover:text-red-600 transition-colors disabled:opacity-50"
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
            {isConfirmedOrBeyond && (
              <p className="text-sm font-medium text-orange-600 mb-3">
                Este profissional já reservou horário para você.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Tem certeza que deseja cancelar este pedido? Esta ação encerrará propostas e conversas relacionadas.
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
                {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo cancel toast */}
      {undoVisible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-2xl px-5 py-3.5 shadow-xl">
          <span className="text-sm font-medium">Pedido cancelado.</span>
          <button
            onClick={handleUndoCancel}
            className="text-sm font-bold text-primary-foreground underline underline-offset-2 bg-primary px-3 py-1 rounded-lg hover:opacity-90"
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}
