import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Search, Home, CheckCircle, XCircle, LifeBuoy, MessageCircle } from 'lucide-react';
import NewServiceRequestModal from '../components/NewServiceRequestModal';
import { buildRequestSupportDraft, buildSupportComposerState } from '@/lib/support';

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

export default function ClientRequestDetail({ viewerMode = 'client' }) {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdminView = viewerMode === 'admin';
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        if (!isAdminView) {
          const profiles = await api.entities.UserProfile.filter({ userId: me.id });
          if (profiles.length > 0) setUserProfile(profiles[0]);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };
    loadUser();
  }, [isAdminView]);

  // Fetch request details
  const { data: request, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  // Fetch interested providers
  const { data: interests = [] } = useQuery({
    queryKey: ['interests', requestId],
    queryFn: () =>
      api.entities.ServiceRequestInterest.filter(
        { serviceRequestId: requestId },
        '-created_date'
      ),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['request-conversations', requestId],
    queryFn: () => api.entities.Conversation.filter({ serviceRequestId: requestId }),
    enabled: !!requestId,
    refetchInterval: 10000,
  });

  const interestIds = interests.map(i => i.id).join(',');
  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['provider-profiles-for-request', requestId, interestIds],
    queryFn: async () => {
      if (!interests.length) return [];
      const profiles = await Promise.all(
        interests.map(i => api.entities.ProviderProfile.filter({ userId: i.providerId }))
      );
      return profiles.flat();
    },
    enabled: interests.length > 0,
  });

  // Cancel request mutation
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

  const formatRelativeTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'agora mesmo';
    if (minutes < 60) return `há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `há ${days} dia${days > 1 ? 's' : ''}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const backPath = isAdminView ? '/admin/support' : '/client';
  const homePath = isAdminView ? '/admin/support' : '/client';
  const requestAddress = !isAdminView && userProfile?.address
    ? `${userProfile.address}${userProfile.neighborhood ? `, ${userProfile.neighborhood}` : ''} - ${user?.city || request.city}`
    : request.address || [request.neighborhood, request.city].filter(Boolean).join(', ') || request.city;

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
            onClick={() => navigate(homePath)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Status state */}
        {(() => {
          let icon = <Search className="w-12 h-12 text-muted-foreground opacity-40" />;
          let title = 'Aguardando um prestador';
          let desc = `Seu pedido está visível para prestadores de ${request.city}. Avisamos aqui assim que alguém aceitar.`;

          if (request.status === 'cancelled') {
            icon = <XCircle className="w-12 h-12 text-red-400 opacity-70" />;
            title = 'Pedido cancelado';
            desc = 'Este pedido foi cancelado e não está mais visível para prestadores.';
          } else if (request.status === 'completed') {
            icon = <CheckCircle className="w-12 h-12 text-green-500 opacity-80" />;
            title = 'Pedido concluído';
            desc = 'Este pedido foi concluído com sucesso.';
          } else if (interests.length > 0) {
            icon = <Search className="w-12 h-12 text-primary opacity-60" />;
            title = `${interests.length} prestador${interests.length !== 1 ? 'es' : ''} interessado${interests.length !== 1 ? 's' : ''}`;
            desc = 'Veja os perfis abaixo e inicie uma conversa com quem preferir.';
          }

          return (
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">{icon}</div>
              <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{title}</h2>
              <p className="text-muted-foreground text-sm">
                Enviado {formatRelativeTime(request.created_date)}
              </p>
              <p className="text-muted-foreground text-xs mt-3">{desc}</p>
            </div>
          );
        })()}

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
              <p className="text-sm text-foreground">{requestAddress}</p>
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
                const providerProfile = providerProfiles.find(pp => pp.userId === interest.providerId);
                const portfolio = providerProfile?.portfolioPhotos?.filter(Boolean) ?? [];
                const photo = providerProfile?.profilePhoto;
                const bio = providerProfile?.description;
                const completedServices = providerProfile?.completedServices;

                return (
                  <div
                    key={interest.id}
                    className="bg-card border border-border rounded-lg overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Header: avatar + nome + rating */}
                      <div className="flex items-start gap-3 mb-2">
                        <div className="shrink-0">
                          {photo ? (
                            <img src={photo} alt={interest.providerName} className="w-11 h-11 rounded-full object-cover" />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                              {interest.providerName?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-foreground text-sm">{interest.providerName}</p>
                              <p className="text-xs text-muted-foreground">{interest.city}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-0.5 justify-end">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className={`text-xs ${i < Math.floor(interest.rating) ? 'text-yellow-500' : 'text-muted-foreground'}`}>★</span>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground">{interest.reviewCount} avaliações</p>
                              {completedServices > 0 && (
                                <p className="text-xs text-muted-foreground">{completedServices} serviços</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{bio}</p>
                      )}

                      {/* Specialties */}
                      <p className="text-xs text-muted-foreground">{interest.specialties?.join(', ')}</p>

                      {/* Portfolio */}
                      {portfolio.length > 0 && (
                        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                          {portfolio.map((url, i) => (
                            <img key={i} src={url} alt={`trabalho ${i + 1}`} className="w-16 h-16 rounded-md object-cover shrink-0" />
                          ))}
                        </div>
                      )}
                    </div>

                    {conversation ? (
                      <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => navigate(`/chat/${conversation.id}`)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg py-2 hover:bg-primary/5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Conversar
                        </button>
                        {!isAdminView && (
                          <button
                            onClick={() => navigate('/client/support', {
                              state: buildSupportComposerState(
                                buildRequestSupportDraft({
                                  audience: 'client',
                                  request,
                                  conversation,
                                  counterpartName: interest.providerName || conversation.providerName || '',
                                })
                              ),
                            })}
                            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground border border-border rounded-lg py-2 hover:bg-secondary/50 transition-colors"
                          >
                            <LifeBuoy className="w-3.5 h-3.5" /> Pedir ajuda
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          Quando a conversa estiver ativa, voce tambem podera abrir o ticket ja vinculado ao prestador.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


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
            className="mt-6 w-full rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Precisa de ajuda com este pedido?</p>
                <p className="text-xs text-muted-foreground">
                  Abra uma solicitacao e envie evidencias para o suporte.
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Action buttons */}
        {!isAdminView && request.status !== 'completed' && request.status !== 'cancelled' && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowEdit(true)}
              className="flex-1 px-4 py-3 text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors font-medium"
            >
              Editar
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelMutation.isPending}
              className="flex-1 px-4 py-3 bg-red-100/20 text-red-600 border border-red-200 rounded-lg hover:bg-red-100/30 transition-colors font-medium disabled:opacity-50"
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Cancelar pedido'}
            </button>
          </div>
        )}
        {(request.status === 'completed' || request.status === 'cancelled' || isAdminView) && (
          <button
            onClick={() => navigate(isAdminView ? '/admin/support' : '/client/orders')}
            className="w-full mt-6 px-4 py-3 text-muted-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors font-medium"
          >
            {isAdminView ? 'Voltar ao suporte' : 'Voltar aos pedidos'}
          </button>
        )}
      </div>

      {!isAdminView && showEdit && (
        <NewServiceRequestModal
          request={request}
          onClose={() => setShowEdit(false)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ['request', requestId] })}
        />
      )}

      {!isAdminView && showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-background rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="font-heading text-base font-bold text-foreground mb-2">Cancelar pedido?</h3>
            <p className="text-sm text-muted-foreground mb-6">Esta ação não poderá ser desfeita. Todos os prestadores interessados serão notificados.</p>
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
