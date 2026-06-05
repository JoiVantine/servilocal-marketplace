import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, Menu } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';

function useOrdersBadge(userId) {
  const { data: requests = [] } = useQuery({
    queryKey: ['badge-requests', userId],
    queryFn: () => api.entities.ServiceRequest.filter({ created_by_id: userId }),
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const badge = requests.reduce((count, r) => {
    if (r.status === 'in_conversation') return count + 1;
    if (['on_the_way', 'arrived', 'provider_done'].includes(r.progressStatus)) return count + 1;
    if (r.status === 'completed' && (!r.ratingStatus || r.ratingStatus === 'PENDING')) return count + 1;
    return count;
  }, 0);

  return badge;
}

export default function ClientBottomNav({ active = 'home' }) {
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    api.auth.me().then(u => setUserId(u.id)).catch(() => {});
  }, []);

  const ordersBadge = useOrdersBadge(userId);

  const tabs = [
    { key: 'home',          icon: Home,          label: 'Início',    to: '/client' },
    { key: 'orders',        icon: ClipboardList,  label: 'Pedidos',   to: '/client/orders',        badge: ordersBadge },
    { key: 'conversations', icon: MessageCircle,  label: 'Conversas', to: '/client/conversations' },
    { key: 'menu',          icon: Menu,           label: 'Menu',      to: '/client/menu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(({ key, icon: Icon, label, to, badge }) => (
          <Link
            key={key}
            to={to}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              active === key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className={`text-xs ${active === key ? 'font-medium' : ''}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
