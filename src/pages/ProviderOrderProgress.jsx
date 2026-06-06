import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  ChevronLeft, MessageCircle, CheckCircle2, Circle,
  Navigation, Star, MapPin, AlertCircle,
} from 'lucide-react';

// Steps visible on the Em execução screen
const EXEC_STEPS = [
  { key: 'on_the_way', label: 'A caminho' },
  { key: 'arrived',    label: 'Cheguei ao local' },
  { key: 'in_progress', label: 'Em execução' },
  { key: 'provider_done', label: 'Aguardando confirmação' },
  { key: 'completed',  label: 'Concluído' },
];
const STEP_ORDER = EXEC_STEPS.map(s => s.key);

function isDone(progressStatus, stepKey) {
  if (!progressStatus) return false;
  return STEP_ORDER.indexOf(stepKey) <= STEP_ORDER.indexOf(progressStatus);
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function StarRow({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-6 h-6 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-border'}`}
        />
      ))}
    </div>
  );
}

// ── Map placeholder ────────────────────────────────────────────────────────────
function MapPlaceholder({ address }) {
  return (
    <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-border bg-green-50">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 140" preserveAspectRatio="none">
        <path
          d="M30,120 C60,90 100,70 140,30"
          stroke="#16a34a"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="8 4"
        />
      </svg>
      {/* Provider marker */}
      <div className="absolute bottom-8 left-8 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-primary border-4 border-white shadow-md flex items-center justify-center">
          <Navigation className="w-3 h-3 text-white" />
        </div>
        <span className="text-[9px] font-semibold text-primary bg-white/90 px-1 rounded mt-0.5">Você</span>
      </div>
      {/* Client marker */}
      <div className="absolute top-5 right-10 flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-red-500 border-4 border-white shadow-md flex items-center justify-center">
          <MapPin className="w-3 h-3 text-white" />
        </div>
        <span className="text-[9px] font-semibold text-red-600 bg-white/90 px-1 rounded mt-0.5">Cliente</span>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
        <span className="text-[10px] text-muted-foreground bg-white/80 px-2 py-0.5 rounded-full">
          {address || 'Rota ilustrativa'}
        </span>
      </div>
    </div>
  );
}

export default function ProviderOrderProgress() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showOnTheWayConfirm, setShowOnTheWayConfirm] = useState(false);
  const [showDoneConfirm, setShowDoneConfirm] = useState(false);
  const [completionCode, setCompletionCode] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  const { data: request, isLoading } = useQuery({
    queryKey: ['provider-progress', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
    enabled: !!requestId,
    refetchInterval: 10000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['provider-progress-conv', requestId, user?.id],
    queryFn: () => api.entities.Conversation.filter({ serviceRequestId: requestId, providerId: user.id }),
    enabled: !!user?.id && !!requestId,
  });
  const conversation = conversations[0];

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews-progress', user?.id],
    queryFn: () => api.entities.ProviderReview.filter({ providerId: user.id }),
    enabled: !!user?.id && request?.progressStatus === 'completed',
  });
  const latestReview = reviews[reviews.length - 1];

  const updateProgress = useMutation({
    mutationFn: async ({ status }) => {
      const result = await api.progress.notify(requestId, {
        action: status,
        conversationId: conversation?.id,
      });
      if (status === 'provider_done' && result.code) {
        setCompletionCode(result.code);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-progress', requestId] }),
  });

  const logFor = (key) => request?.progressLog?.find(l => l.status === key);

  const ps = request?.progressStatus;
  const isConfirmedProvider = user && request?.confirmedProviderId === user.id;

  const ratingLabel = (r) => {
    if (r >= 5) return 'Excelente!';
    if (r >= 4) return 'Ótimo!';
    if (r >= 3) return 'Bom';
    if (r >= 2) return 'Regular';
    return 'Ruim';
  };

  const gross = parseFloat(request?.agreedPrice || 0);

  return (
    <div className="min-h-screen bg-secondary/30 pb-28">
      <div className="flex items-center justify-between px-4 py-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/provider')} className="p-1.5 hover:bg-secondary rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-semibold text-foreground">
            {ps === 'completed' ? 'Serviço concluído' :
             ps === 'provider_done' ? 'Aguardando cliente' :
             ps === 'in_progress' ? 'Em execução' :
             ps === 'on_the_way' ? 'A caminho' :
             'Pedido confirmado'}
          </h1>
        </div>
        {conversation && (
          <button
            onClick={() => navigate(`/chat/${conversation.id}`)}
            className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (

        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

          {/* ── PAGAMENTO LIBERADO ─────────────────────────────────────────── */}
          {ps === 'completed' && (
            <>
              {latestReview ? (
                /* Avaliação recebida */
                <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground tracking-wider">VOCÊ FOI AVALIADO</p>
                  <div className="flex justify-center">
                    <StarRow rating={latestReview.rating} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {latestReview.rating.toFixed(1)} <span className="text-lg font-medium text-primary">{ratingLabel(latestReview.rating)}</span>
                    </p>
                  </div>
                  {latestReview.comment && (
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      "{latestReview.comment}"
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cliente: {request?.clientName || 'Cliente'}
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Star className="w-8 h-8 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Aguardando avaliação</p>
                  <p className="text-xs text-muted-foreground">O cliente ainda não enviou uma avaliação.</p>
                </div>
              )}

              {/* Pagamento */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground tracking-wider">PAGAMENTO LIBERADO!</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="border-t border-border pt-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Você receberá</span>
                    <span className="text-xl font-bold text-primary">
                      R$ {gross.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {gross > 0 && (
                    <p className="text-xs text-muted-foreground text-center">Pagamento via Pix</p>
                  )}
                  {gross === 0 && (
                    <p className="text-xs text-muted-foreground text-center">Valor a combinar diretamente com o cliente.</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate('/provider/earnings')}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
              >
                Ver meus ganhos
              </button>
            </>
          )}

          {/* ── AGUARDANDO CONFIRMAÇÃO ─────────────────────────────────────── */}
          {ps === 'provider_done' && (
            <>
              <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground">Serviço concluído!</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Aguarde a confirmação do cliente.
                </p>
              </div>

              {/* Progresso */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Progresso</h3>
                <div className="space-y-3">
                  {EXEC_STEPS.map(step => {
                    const done = isDone(ps, step.key);
                    const log = logFor(step.key);
                    return (
                      <div key={step.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {done
                            ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            : <Circle className="w-5 h-5 text-border shrink-0" />}
                          <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {step.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{log?.time || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo */}
              <RequestSummaryCard request={request} />

              {conversation && (
                <button
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Ir para o chat
                </button>
              )}
            </>
          )}

          {/* ── EM EXECUÇÃO ───────────────────────────────────────────────── */}
          {(ps === 'in_progress' || ps === 'arrived') && (
            <>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
                <p className="text-sm font-bold text-primary">Serviço em execução</p>
                <p className="text-xs text-muted-foreground mt-0.5">Finalize quando o serviço estiver pronto.</p>
              </div>

              {/* Checklist */}
              <div className="bg-card border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-4">Progresso</h3>
                <div className="space-y-3">
                  {EXEC_STEPS.map(step => {
                    const done = isDone(ps, step.key);
                    const log = logFor(step.key);
                    return (
                      <div key={step.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {done
                            ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            : <Circle className="w-5 h-5 text-border shrink-0" />}
                          <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {step.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{log?.time || '—'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <RequestSummaryCard request={request} />

              {conversation && (
                <button
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                  className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" /> Chat com o cliente
                </button>
              )}
            </>
          )}

          {/* ── A CAMINHO ─────────────────────────────────────────────────── */}
          {(ps === 'on_the_way' || (!ps && isConfirmedProvider)) && (
            <>
              <div className="bg-card border border-border rounded-2xl p-4 text-center space-y-1">
                <p className="font-bold text-foreground text-lg">A caminho do cliente</p>
                {request?.address && (
                  <p className="text-xs text-muted-foreground">{request.address}, {request.city}</p>
                )}
              </div>

              <MapPlaceholder address={request?.address} />

              <div className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Previsão de chegada</p>
                  <p className="text-2xl font-bold text-foreground">
                    {/* Show ETA as current time + ~15 min */}
                    {new Date(Date.now() + 15 * 60000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Navigation className="w-8 h-8 text-primary" />
              </div>

              <RequestSummaryCard request={request} />
            </>
          )}

          {/* ── SEM STATUS (confirmado mas não iniciado) ───────────────────── */}
          {!ps && !isConfirmedProvider && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Pedido não encontrado ou acesso não autorizado.
            </div>
          )}
        </div>
      )}

      {/* ── Bottom action bar ────────────────────────────────────────────────── */}
      {!isLoading && request && ps !== 'completed' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background border-t border-border">
          <div className="max-w-lg mx-auto">
            {!ps && isConfirmedProvider && (
              <button
                onClick={() => setShowOnTheWayConfirm(true)}
                disabled={updateProgress.isPending}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Estou a caminho
              </button>
            )}

            {ps === 'on_the_way' && (
              <button
                onClick={() => updateProgress.mutate({ status: 'arrived' })}
                disabled={updateProgress.isPending}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateProgress.isPending ? 'Atualizando...' : 'Cheguei ao local'}
              </button>
            )}

            {ps === 'in_progress' && (
              <button
                onClick={() => setShowDoneConfirm(true)}
                disabled={updateProgress.isPending}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Concluir atendimento
              </button>
            )}

            {ps === 'provider_done' && !completionCode && (
              <button
                onClick={() => navigate(`/chat/${conversation?.id}`)}
                disabled={!conversation}
                className="w-full py-4 border border-border rounded-xl font-semibold text-base text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" /> Ver conversa
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: confirmar "estou a caminho" ──────────────────────────────── */}
      {showOnTheWayConfirm && (() => {
        const agreedDate = request?.agreedScheduledDate;
        const today = new Date().toISOString().slice(0, 10);
        const isWrongDay = agreedDate && agreedDate !== today;
        const agreedLabel = agreedDate
          ? new Date(`${agreedDate}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
          : null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowOnTheWayConfirm(false)} />
            <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Estou a caminho</p>
                  <p className="text-sm text-muted-foreground">O cliente será notificado que você está a caminho.</p>
                </div>
              </div>
              {isWrongDay && (
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-700 leading-relaxed">
                    A data acordada é <strong>{agreedLabel}</strong>. Você está confirmando antes do prazo combinado. Tem certeza?
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowOnTheWayConfirm(false)}
                  className="flex-1 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-secondary/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowOnTheWayConfirm(false);
                    updateProgress.mutate({ status: 'on_the_way' });
                  }}
                  disabled={updateProgress.isPending}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {updateProgress.isPending ? 'Enviando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: concluir atendimento + código ─────────────────────────────── */}
      {showDoneConfirm && !completionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDoneConfirm(false)} />
          <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-foreground">Concluir atendimento</p>
                <p className="text-sm text-muted-foreground">Um código será enviado ao cliente via WhatsApp para confirmar a conclusão.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDoneConfirm(false)}
                className="flex-1 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowDoneConfirm(false);
                  updateProgress.mutate({ status: 'provider_done' });
                }}
                disabled={updateProgress.isPending}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {updateProgress.isPending ? 'Enviando...' : 'Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Código de conclusão ────────────────────────────────────────────── */}
      {completionCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-foreground text-lg">Atendimento concluído!</p>
              <p className="text-sm text-muted-foreground mt-1">Código enviado ao cliente via WhatsApp:</p>
            </div>
            <div className="bg-secondary/60 border border-border rounded-xl py-4 px-6">
              <p className="text-4xl font-black text-foreground tracking-[0.3em]">{completionCode}</p>
            </div>
            <p className="text-xs text-muted-foreground">O cliente usará este código para confirmar no app.</p>
            <button
              onClick={() => {
                setCompletionCode(null);
                queryClient.invalidateQueries({ queryKey: ['provider-progress', requestId] });
              }}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestSummaryCard({ request }) {
  if (!request) return null;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">RESUMO DO PEDIDO</p>
      <p className="text-sm font-semibold text-foreground">{request.title || request.category}</p>
      {request.agreedPrice && (
        <p className="text-sm text-primary font-bold">
          R$ {parseFloat(request.agreedPrice).toFixed(2).replace('.', ',')}
        </p>
      )}
      {request.clientName && (
        <p className="text-xs text-muted-foreground">Cliente: {request.clientName}</p>
      )}
    </div>
  );
}
