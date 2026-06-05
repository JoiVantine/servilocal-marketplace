import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  ChevronLeft, MapPin, Calendar, Clock, User,
  CheckCircle2, MessageCircle,
} from 'lucide-react';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getScheduleOptions(request) {
  if (request?.scheduleOptions?.length) return request.scheduleOptions;
  if (!request?.scheduledAt) return [];
  return [{
    date: new Date(request.scheduledAt).toISOString().slice(0, 10),
    startTime: formatTime(request.scheduledAt),
    endTime: '',
  }];
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff} min atrás`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function ProviderRequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  const { data: request, isLoading } = useQuery({
    queryKey: ['provider-request-detail', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
    enabled: !!requestId,
  });

  const handleAccept = async () => {
    if (!user || !request) return;
    setAccepting(true);
    setError('');
    try {
      const provProfiles = await api.entities.ProviderProfile.filter({ userId: user.id });
      const pp = provProfiles[0];

      // Create interest
      await api.entities.ServiceRequestInterest.create({
        serviceRequestId: requestId,
        providerId: user.id,
        providerName: user.fullName || user.full_name || '',
        providerPhoto: pp?.profilePhoto || user.photo || '',
        price: request.price || request.suggestedPrice || '',
        arrivalTime: '',
        message: 'Aceito realizar este serviço.',
      });

      // Create or find conversation
      const existing = await api.entities.Conversation.filter({
        serviceRequestId: requestId,
        providerId: user.id,
      });

      let conv;
      if (existing.length > 0) {
        conv = existing[0];
      } else {
        conv = await api.entities.Conversation.create({
          serviceRequestId: requestId,
          providerId: user.id,
          providerName: user.fullName || user.full_name || '',
          clientId: request.userId || request.created_by_id,
          clientName: request.clientName || 'Cliente',
          status: 'active',
        });
      }

      // Mark request as in_conversation if still open
      if (request.status === 'open') {
        await api.entities.ServiceRequest.update(requestId, { status: 'in_conversation' });
      }

      setConversationId(conv.id);
      setAccepted(true);
    } catch (err) {
      setError(err.message || 'Erro ao aceitar pedido. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  };

  // ── Accepted screen ──────────────────────────────────────────────────────────
  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Pedido aceito!</h2>
            <p className="text-sm text-muted-foreground mt-2">O cliente foi notificado.</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Combine os detalhes no chat e siga para o atendimento.
            </p>
          </div>

          <button
            onClick={() => navigate(`/chat/${conversationId}`)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
          >
            <span className="flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Ir para o chat
            </span>
          </button>

          <button
            onClick={() => navigate('/provider')}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // ── Detail screen ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Detalhes do pedido</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : !request ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Pedido não encontrado.</div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Main info card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Serviço</p>
                <p className="text-base font-semibold text-foreground">{request.title || request.category}</p>
              </div>

              {request.description && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Descrição</p>
                  <p className="text-sm text-foreground leading-relaxed">{request.description}</p>
                </div>
              )}

              {getScheduleOptions(request).length > 0 && (
                <div className="space-y-2">
                  {getScheduleOptions(request).map((option, index) => (
                    <div key={`${option.date}-${option.startTime}-${index}`} className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-foreground">
                          {option.date
                            ? new Date(`${option.date}T00:00:00`).toLocaleDateString('pt-BR')
                            : formatDate(request.scheduledAt)}
                        </p>
                        {(option.startTime || option.endTime) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {option.startTime && option.endTime
                              ? `Entre ${option.startTime} e ${option.endTime}`
                              : `A partir das ${option.startTime}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(request.address || request.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {request.address && <p className="text-sm text-foreground">{request.address}</p>}
                    <p className="text-sm text-foreground">{request.city}</p>
                    {request.zipCode && <p className="text-xs text-muted-foreground">{request.zipCode}</p>}
                  </div>
                </div>
              )}

              {(request.price || request.suggestedPrice) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Preço proposto pelo cliente</p>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    R$ {parseFloat(request.price || request.suggestedPrice).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          {request.photos?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground font-medium mb-3">Fotos do local</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {request.photos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-xl shrink-0 border border-border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Client info */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-medium mb-3">Cliente</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {request.clientName || 'Cliente'}
                </p>
                <p className="text-xs text-muted-foreground">{timeAgo(request.created_date)}</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
          )}
        </div>
      )}

      {/* Bottom action bar */}
      {!isLoading && request && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background border-t border-border">
          <div className="max-w-lg mx-auto space-y-2">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {accepting ? 'Aceitando...' : 'Aceitar pedido'}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
