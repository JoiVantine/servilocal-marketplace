import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, LifeBuoy, Map, MessageCircle } from 'lucide-react';
import { api } from '@/api/apiClient';
import { buildConversationSupportDraft, buildSupportComposerState } from '@/lib/support';

export default function ProviderConversations() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/provider/onboarding'));
  }, []);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['provider-conversations-list', user?.id],
    queryFn: () => api.entities.Conversation.filter({ providerId: user.id }, '-lastMessageTime'),
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate('/provider')} className="p-2 hover:bg-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Conversas</h1>
          <p className="text-xs text-muted-foreground">Últimas mensagens dos clientes</p>
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
            <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <Link
                  to={`/chat/${conversation.id}`}
                  className="block p-4 hover:border-primary/50 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {conversation.clientName?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{conversation.clientName || 'Cliente'}</p>
                        {(conversation.unreadCount || 0) > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1">{conversation.lastMessage || 'Sem mensagens'}</p>
                      {conversation.lastMessageTime && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(conversation.lastMessageTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
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

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/provider" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <Link to="/provider/map" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Map className="w-5 h-5" />
            <span className="text-xs">Mapa</span>
          </Link>
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">Conversas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
