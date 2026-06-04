import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { User, MapPin, CreditCard, Bell, Headphones, Info, LogOut, ChevronRight } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientMenu() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    await api.auth.logout('/');
  };

  const fullName = user?.fullName || user?.full_name || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const city = user?.city || '';

  const menuItems = [
    { icon: User,       label: 'Meus dados',          path: '/client/profile' },
    { icon: MapPin,     label: 'Endereços salvos',     path: '/client/address' },
    { icon: CreditCard, label: 'Formas de pagamento',  path: '/client/payments' },
    { icon: Bell,       label: 'Notificações',         path: '/client/notifications' },
    { icon: Headphones, label: 'Ajuda e suporte',      path: '/client/help' },
    { icon: Info,       label: 'Sobre o aplicativo',   path: '/client/about' },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col pb-20">
      {/* Header with logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <img src="/logo.png" alt="ServiLocal" className="w-6 h-6 object-contain" />
        <span className="text-sm font-semibold text-foreground">
          Servi<span className="text-primary font-bold">Local</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-5 space-y-4">
        {/* Profile header */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          {user?.photo ? (
            <img src={user.photo} alt="" className="w-14 h-14 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{fullName || '—'}</p>
            {city && <p className="text-xs text-muted-foreground mt-0.5">{city}</p>}
            <button
              onClick={() => navigate('/client/profile')}
              className="mt-1 text-xs text-primary font-semibold hover:opacity-80"
            >
              Editar dados
            </button>
          </div>
        </div>

        {/* Menu items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors text-left ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 px-1 py-2 text-sm font-semibold text-red-500 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Saindo...' : 'Sair da conta'}
        </button>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
