import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { LifeBuoy, MessageCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import { api, API_URL } from '@/api/apiClient';
import { buildConversationSupportDraft, buildSupportComposerState } from '@/lib/support';
import ProviderBottomNav from '@/components/ProviderBottomNav';

export default function ProviderConversations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/provider/onboarding'));
  }, []);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['provider-conversations-list', user?.id],
    queryFn: () => api.entities.Conversation.filter({ providerId: user.id }, '-lastMessageTime'),
    enabled: !!user?.id,
    refetchInterval: 8000,
  });

  // Socket.IO — re-join rooms when conversations list changes
  useEffect(() => {
    if (!conversations.length) return;
    const socket = io(API_URL);
    conversations.forEach(c => socket.emit('join-conversation', c.id));
    socket.on('new-message', () => {
      queryClient.invalidateQueries({ queryKey: ['provider-conversations-list', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['provider-conversations-unread'] });
    });
    return () => socket.disconnect();
  }, [conversations.map(c => c.id).join('|')]);

  const linkedRequestIds = useMemo(() => (
    [...new Set(conversations.map(c => c.serviceRequestId).filter(Boolean))]
  ), [conversations]);

  const { data: linkedRequests = [] } = useQuery({
    queryKey: ['provider-conversation-requests', linkedRequestIds.join('|')],
    queryFn: async () => {
      const results = await Promise.all(
        linkedRequestIds.map(id => api.entities.ServiceRequest.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: linkedRequestIds.length > 0,
  });

  const requestLookup = useMemo(
    () => new Map(linkedRequests.map(r => [r.id, r])),
    [linkedRequests]
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 flex-1">
          <img src="/onboarding-city.png" alt="ServiLocal" className="w-6 h-6 object-contain" />
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">Conversas</h1>
            <p className="text-xs text-muted-foreground">Últimas mensagens dos clientes</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-foreground mb-1">Nenhuma conversa ainda</p>
            <p className="text-sm text-muted-foreground">Quando você enviar um orçamento, a conversa aparecerá aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conversation => (
              <div key={conversation.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <Link
                  to={`/chat/${conversation.id}`}
                  className="block p-4 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">
                      {conversation.clientName?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {conversation.clientName || 'Cliente'}
                        </p>
                        <div className="flex items-center gap-2 shrink-0">
                          {conversation.lastMessageTime && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(conversation.lastMessageTime).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          )}
                          {(conversation.providerUnreadCount || 0) > 0 && (
                            <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                              {conversation.providerUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {conversation.lastMessage || 'Sem mensagens'}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="border-t border-border px-4 py-2">
                  <button
                    onClick={() => navigate('/provider/support', {
                      state: buildSupportComposerState(
                        buildConversationSupportDraft({
                          audience: 'provider',
                          conversation,
                          request: requestLookup.get(conversation.serviceRequestId) || null,
                        })
                      ),
                    })}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-foreground border border-border rounded-lg py-2 hover:bg-secondary/50 transition-colors"
                  >
                    <LifeBuoy className="w-3.5 h-3.5" /> Pedir suporte
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProviderBottomNav active="conversations" />
    </div>
  );
}
