import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star, Home, ClipboardList } from 'lucide-react';

export default function ClientProposals() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ['interests', requestId],
    queryFn: () => api.entities.ServiceRequestInterest.filter(
      { serviceRequestId: requestId },
      '-created_date'
    ),
  });

  const interestProviderIds = interests.map(i => i.providerId).join(',');
  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['provider-profiles-proposals', interestProviderIds],
    queryFn: async () => {
      const results = await Promise.all(
        interests.map(i => api.entities.ProviderProfile.filter({ userId: i.providerId }))
      );
      return results.flat();
    },
    enabled: interests.length > 0,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-proposals', requestId],
    queryFn: () => api.entities.Conversation.filter({ serviceRequestId: requestId }),
    enabled: !!requestId,
  });

  const profileLookup = new Map(providerProfiles.map(p => [p.userId, p]));
  const convByProvider = new Map(conversations.map(c => [c.providerId, c]));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(`/client/request/${requestId}`)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Propostas recebidas</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {interests.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Escolha o melhor profissional para o seu pedido
          </p>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : interests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Nenhuma proposta recebida ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interests.map((interest, idx) => {
              const profile = profileLookup.get(interest.providerId);
              const photo = interest.providerPhoto || profile?.profilePhoto;
              const conversation = convByProvider.get(interest.providerId);
              const priceNum = parseFloat(String(interest.price || '').replace(',', '.'));
              const hasPrice = interest.price && !isNaN(priceNum);

              return (
                <div key={interest.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="shrink-0">
                      {photo ? (
                        <img src={photo} alt={interest.providerName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {interest.providerName?.[0]?.toUpperCase() || 'P'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">{interest.providerName}</p>
                        {idx === 0 && <span className="text-base">⭐</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-foreground">
                          {interest.rating ? Number(interest.rating).toFixed(1) : '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({interest.reviewCount || 0} avaliações)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    {hasPrice && (
                      <p className="text-lg font-bold text-foreground">
                        R$ {priceNum.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    {interest.arrivalTime && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Chega até {interest.arrivalTime}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => conversation && navigate(`/chat/${conversation.id}`)}
                      disabled={!conversation}
                      className="flex-1 py-2.5 text-sm font-medium text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors disabled:opacity-40"
                    >
                      Ver perfil
                    </button>
                    <button
                      onClick={() => navigate(`/client/request/${requestId}/confirm/${interest.id}`)}
                      className="flex-1 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity"
                    >
                      Selecionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/client" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs">Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
