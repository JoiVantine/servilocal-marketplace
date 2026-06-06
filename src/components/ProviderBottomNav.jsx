import { Link } from 'react-router-dom';
import { Home, MessageCircle, CalendarDays, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

export default function ProviderBottomNav({ active }) {
  const { data: convs = [] } = useQuery({
    queryKey: ['provider-conversations-unread'],
    queryFn: async () => {
      const u = await api.auth.me().catch(() => null);
      if (!u) return [];
      return api.entities.Conversation.filter({ providerId: u.id }, '-lastMessageTime');
    },
    refetchInterval: 10000,
  });
  const totalUnread = convs.reduce((s, c) => s + (c.providerUnreadCount || 0), 0);

  const items = [
    { id: 'home', icon: Home, label: 'Início', to: '/provider' },
    { id: 'conversations', icon: MessageCircle, label: 'Conversas', to: '/provider/conversations', badge: totalUnread || null },
    { id: 'agenda', icon: CalendarDays, label: 'Agenda', to: '/provider?tab=agenda' },
    { id: 'menu', icon: Menu, label: 'Menu', to: '/provider/menu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
