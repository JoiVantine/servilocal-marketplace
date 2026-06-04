import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star, Loader2 } from 'lucide-react';

export default function ClientConfirmProvider() {
  const { requestId, interestId } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const { data: interest } = useQuery({
    queryKey: ['interest', interestId],
    queryFn: () => api.entities.ServiceRequestInterest.get(interestId),
  });

  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['provider-profile-confirm', interest?.providerId],
    queryFn: () => api.entities.ProviderProfile.filter({ userId: interest.providerId }),
    enabled: !!interest?.providerId,
  });
  const providerProfile = providerProfiles[0];

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-confirm', requestId, interest?.providerId],
    queryFn: () => api.entities.Conversation.filter({
      serviceRequestId: requestId,
      providerId: interest.providerId,
    }),
    enabled: !!interest?.providerId,
  });
  const conversation = conversations[0];

  const handleConfirm = async () => {
    if (!interest || !request) return;
    setConfirming(true);
    try {
      await api.entities.ServiceRequest.update(requestId, {
        status: 'agreed',
        confirmedProviderId: interest.providerId,
        confirmedProviderName: interest.providerName,
        confirmedProviderPhoto: interest.providerPhoto || providerProfile?.profilePhoto,
        agreedPrice: interest.price,
      });
      if (conversation) {
        navigate(`/chat/${conversation.id}`);
      } else {
        navigate(`/client/request/${requestId}/progress`);
      }
    } catch {
      setConfirming(false);
    }
  };

  const photo = interest?.providerPhoto || providerProfile?.profilePhoto;
  const priceNum = parseFloat(String(interest?.price || '').replace(',', '.'));
  const hasPrice = interest?.price && !isNaN(priceNum);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Confirmar profissional</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Provider card */}
        {interest && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {photo ? (
                  <img src={photo} alt={interest.providerName} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {interest.providerName?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-base">{interest.providerName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{interest.rating ? Number(interest.rating).toFixed(1) : '—'}</span>
                  <span className="text-xs text-muted-foreground">({interest.reviewCount || 0} avaliações)</span>
                </div>
                {providerProfile?.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{providerProfile.description}</p>
                )}
                {interest?.providerId && (
                  <button
                    onClick={() => navigate(`/client/provider/${interest.providerId}`)}
                    className="mt-2 text-xs text-primary font-semibold hover:opacity-80"
                  >
                    Ver perfil completo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order summary */}
        {request && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-foreground">Resumo do pedido</h2>

            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm font-medium text-foreground">{request.category}</p>
            </div>

            {request.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground">{request.description}</p>
              </div>
            )}

            {request.scheduledAt && (
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm text-foreground">
                  {new Date(request.scheduledAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {(request.address || request.city) && (
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm text-foreground">
                  {[request.address, request.neighborhood, request.city].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {hasPrice && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Valor combinado</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  R$ {priceNum.toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={confirming || !interest}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming && <Loader2 className="w-5 h-5 animate-spin" />}
            {confirming ? 'Confirmando...' : 'Confirmar e iniciar chat'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 border border-border rounded-xl font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
