import { Link } from 'react-router-dom';
import { Home, ClipboardList, CalendarDays, Menu } from 'lucide-react';

export default function ProviderBottomNav({ active }) {
  const items = [
    { id: 'home', icon: Home, label: 'Início', to: '/provider' },
    { id: 'orders', icon: ClipboardList, label: 'Pedidos', to: '/provider?tab=active' },
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
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
