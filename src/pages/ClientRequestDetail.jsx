import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronLeft, Search, Clock, Home } from 'lucide-react';

const URGENCY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

const URGENCY_COLORS = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function ClientRequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, []);

  // Fetch request details
  const { data: request, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => base44.entities.ServiceRequest.get(requestId),
  });

  // Fetch interested providers
  const { data: interests = [] } = useQuery({
    queryKey: ['interests', requestId],
    queryFn: () =>
      base44.entities.ServiceRequestInterest.filter(
        { serviceRequestId: requestId },
        '-created_date'
      ),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['request-conversations', requestId],
    queryFn: () => base44.entities.Conversation.filter({ serviceRequestId: requestId }),
    enabled: !!requestId,
    refetchInterval: 10000,
  });

  // Cancel request mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ServiceRequest.update(requestId, { status: 'cancelled' });
      const [convs, interests] = await Promise.all([
        base44.entities.Conversation.filter({ serviceRequestId: requestId }),
        base44.entities.ServiceRequestInterest.filter({ serviceRequestId: requestId }),
      ]);
      await Promise.all([
        ...convs.map(c => base44.entities.Conversation.update(c.id, { status: 'cancelled' })),
        ...interests.map(i => base44.entities.ServiceRequestInterest.update(i.id, { status: 'cancelled' })),
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
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate('/client')}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading text-lg font-bold">ServiLocal</h1>
          <button
            onClick={() => navigate('/client')}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Waiting state */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Search className="w-12 h-12 text-muted-foreground opacity-40" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
            Aguardando um prestador
          </h2>
          <p className="text-muted-foreground text-sm">
            Enviado há 7 min
          </p>
          <p className="text-muted-foreground text-xs mt-3">
            Seu pedido está visível para prestadores de {request.city}. Avisamós aqui
            assim que alguém aceitar.
          </p>
        </div>

        {/* Request Summary */}
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
          <h3 className="font-semibold text-foreground mb-4">Resumo do pedido</h3>

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Serviço</p>
              <p className="font-medium text-foreground">{request.category}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm text-foreground line-clamp-3">
                {request.description}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Endereço</p>
              <p className="text-sm text-foreground">
                {request.address || [request.neighborhood, request.city].filter(Boolean).join(', ') || request.city}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  URGENCY_COLORS[request.urgency]
                }`}
              >
                {URGENCY_LABELS[request.urgency]}
              </span>
            </div>
          </div>
        </div>

        {/* Interested Providers */}
        {interests.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-3">
              {interests.length} profissional{interests.length !== 1 ? 'is' : ''} interessado{interests.length !== 1 ? 's' : ''}
            </h3>

            <div className="space-y-3">
              {interests.map((interest) => {
                const conversation = conversations.find((item) => item.providerId === interest.providerId);
                return (
                  <button
                    key={interest.id}
                    onClick={() => conversation && navigate(`/chat/${conversation.id}`)}
                    className="w-full p-4 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {interest.providerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {interest.city}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${
                                i < Math.floor(interest.rating)
                                  ? 'text-yellow-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {interest.reviewCount} avaliações
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {interest.specialties?.join(', ')}
                    </p>
                    {conversation && (
                      <p className="text-xs font-semibold text-primary mt-3">Conversar</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* No interests yet */}
        {interests.length === 0 && (
          <div className="bg-secondary/50 border border-border rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Ainda nenhum profissional se interessou. Fique atento!
            </p>
          </div>
        )}

        {/* Action buttons */}
        {request.status !== 'completed' && request.status !== 'cancelled' && (
          <div className="flex gap-3 mt-6">
            <button className="flex-1 px-4 py-3 text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors font-medium">
              Editar
            </button>
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja cancelar este pedido?')) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="flex-1 px-4 py-3 bg-red-100/20 text-red-600 border border-red-200 rounded-lg hover:bg-red-100/30 transition-colors font-medium disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        )}
        {(request.status === 'completed' || request.status === 'cancelled') && (
          <button className="w-full mt-6 px-4 py-3 text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors font-medium">
            Voltar aos pedidos
          </button>
        )}
      </div>
    </div>
  );
}