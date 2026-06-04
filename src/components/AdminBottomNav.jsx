import { useNavigate } from 'react-router-dom';
import { Home, MessageSquare, Users, MoreHorizontal } from 'lucide-react';

const ITEMS = [
  { key: 'home',    label: 'Início',   icon: Home,           to: '/admin/dashboard' },
  { key: 'tickets', label: 'Chamados', icon: MessageSquare,  to: '/admin/support' },
  { key: 'users',   label: 'Usuários', icon: Users,          to: '/admin/users' },
  { key: 'more',    label: 'Mais',     icon: MoreHorizontal, to: '/diagnostics' },
];

export default function AdminBottomNav({ active }) {
  const navigate = useNavigate();
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around max-w-md mx-auto py-2 px-2">
        {ITEMS.map(({ key, label, icon: Icon, to }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => navigate(to)}
              className="flex flex-col items-center gap-0.5 flex-1 py-1.5"
            >
              <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[10px] font-medium leading-tight ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
