import { Link } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, Menu } from 'lucide-react';

export default function ClientBottomNav({ active = 'home' }) {
  const tabs = [
    { key: 'home',   icon: Home,          label: 'Início',  to: '/client' },
    { key: 'orders', icon: ClipboardList,  label: 'Pedidos', to: '/client/orders' },
    { key: 'conversations', icon: MessageCircle, label: 'Conversas', to: '/client/conversations' },
    { key: 'menu',   icon: Menu,           label: 'Menu',    to: '/client/menu' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(({ key, icon: Icon, label, to }) => (
          <Link
            key={key}
            to={to}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              active === key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className={`text-xs ${active === key ? 'font-medium' : ''}`}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
