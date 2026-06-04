import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, MessageCircle, Phone, CheckCircle2, Circle } from 'lucide-react';

const STEPS = [
  { key: 'on_the_way',    label: 'A caminho' },
  { key: 'arrived',       label: 'Chegou ao local' },
  { key: 'in_progress',   label: 'Em execução' },
  { key: 'provider_done', label: 'Aguardando confirmação' },
  { key: 'completed',     label: 'Concluído' },
];

const STEP_ORDER = STEPS.map(s => s.key);

function isDone(progressStatus, stepKey) {
  if (!progressStatus) return false;
  const reqIdx = STEP_ORDER.indexOf(progressStatus);
  const stepIdx = STEP_ORDER.indexOf(stepKey);
  return stepIdx <= reqIdx;
}

export default function ClientOrderProgress() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: () => api.entities.ServiceRequest.update(requestId, {
      progressStatus: 'completed',
      status: 'completed',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['request', requestId] }),
  });

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
    refetchInterval: 15000,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-progress', requestId, request?.confirmedProviderId],
    queryFn: () => api.entities.Conversation.filter({
      serviceRequestId: requestId,
      providerId: request.confirmedProviderId,
    }),
    enabled: !!request?.confirmedProviderId,
  });
  const conversation = conversations[0];

  const photo = request?.confirmedProviderPhoto;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate('/client/orders')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Pedido em andamento</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
          {/* Status badge */}
          <span className="inline-flex text-xs px-3 py-1.5 rounded-full font-semibold bg-blue-100 text-blue-700">
            Em andamento
          </span>

          {/* Provider card */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="shrink-0">
                {photo ? (
                  <img src={photo} alt={request?.confirmedProviderName} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {request?.confirmedProviderName?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{request?.confirmedProviderName}</p>
                {request?.agreedPrice && (
                  <p className="text-xs text-muted-foreground">
                    R$ {parseFloat(request.agreedPrice).toFixed(2).replace('.', ',')}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => conversation && navigate(`/chat/${conversation.id}`)}
                disabled={!conversation}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-40"
              >
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
              <button
                onClick={() => conversation && navigate(`/chat/${conversation.id}`)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Phone className="w-4 h-4" /> Ligar
              </button>
            </div>
          </div>

          {/* Progress steps */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-4">Progresso do serviço</h3>
            <div className="space-y-3">
              {STEPS.map((step) => {
                const done = isDone(request?.progressStatus, step.key);
                const logEntry = request?.progressLog?.find(l => l.status === step.key);
                return (
                  <div key={step.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-border shrink-0" />
                      )}
                      <span className={`text-sm ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                    {logEntry?.time ? (
                      <span className="text-xs text-muted-foreground">{logEntry.time}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order summary */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-3">Resumo do pedido</h3>
            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{request?.category}</p>
            </div>
            <button
              onClick={() => navigate(`/client/request/${requestId}`)}
              className="w-full mt-4 py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              Ver detalhes
            </button>
          </div>

          {/* Confirm completion (provider marked done, waiting client) */}
          {request?.progressStatus === 'provider_done' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-foreground mb-1">O profissional finalizou o serviço!</p>
              <p className="text-xs text-muted-foreground mb-3">Confirme que o serviço foi concluído para liberar o pagamento.</p>
              <button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar conclusão'}
              </button>
            </div>
          )}

          {/* Rate if completed */}
          {request?.progressStatus === 'completed' && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
              <p className="text-sm font-semibold text-foreground mb-1">Serviço concluído!</p>
              <p className="text-xs text-muted-foreground mb-3">Avalie o atendimento do profissional.</p>
              <button
                onClick={() => navigate(`/client/request/${requestId}/rate`)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Avaliar agora
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
