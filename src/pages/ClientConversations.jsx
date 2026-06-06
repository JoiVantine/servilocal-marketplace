import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, ChevronRight, ClipboardList } from 'lucide-react';
import { api } from '@/api/apiClient';
import ClientBottomNav from '@/components/ClientBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';

function formatWhen(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ClientConversations() {
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['client-conversations-list', user?.id],
    queryFn: () => api.entities.Conversation.filter({ clientId: user.id }, '-lastMessageTime'),
    enabled: !!user?.id,
  });

  const linkedRequestIds = useMemo(() => (
    [...new Set(conversations.map((conversation) => conversation.serviceRequestId).filter(Boolean))]
  ), [conversations]);

  const { data: linkedRequests = [] } = useQuery({
    queryKey: ['client-conversation-requests', linkedRequestIds.join('|')],
    queryFn: async () => {
      const results = await Promise.all(
        linkedRequestIds.map((id) => api.entities.ServiceRequest.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: linkedRequestIds.length > 0,
  });

  const requestLookup = useMemo(
    () => new Map(linkedRequests.map((request) => [request.id, request])),
    [linkedRequests]
  );

  const loading = isLoadingUser || isLoading;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-4 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <img src="/onboarding-city.png" alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="text-primary font-bold">Local</span></span>
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Conversas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Mensagens com os prestadores dos seus pedidos.</p>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma conversa ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Quando um prestador iniciar atendimento, a conversa aparece aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => {
              const request = requestLookup.get(conversation.serviceRequestId);
              const unreadCount = conversation.unreadCount || 0;

              return (
                <Link
                  key={conversation.id}
                  to={`/chat/${conversation.id}`}
                  className="block bg-card border border-border rounded-2xl p-4 shadow-sm hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {conversation.providerName?.[0]?.toUpperCase() || 'P'}
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center border-2 border-card">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {conversation.providerName || 'Prestador'}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>

                      {request && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <ClipboardList className="w-3 h-3 shrink-0" />
                          <span className="truncate">{request.title || request.category || 'Pedido'}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conversation.lastMessage || 'Conversa iniciada'}
                      </p>

                      {conversation.lastMessageTime && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatWhen(conversation.lastMessageTime)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <ClientBottomNav active="conversations" />
    </div>
  );
}
