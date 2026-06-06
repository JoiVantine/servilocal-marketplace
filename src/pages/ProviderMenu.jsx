import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { User, Briefcase, Bell, Headphones, Info, LogOut, ChevronRight, AlertCircle, ArrowLeft, Wallet, ClipboardList } from 'lucide-react';
import ProviderBottomNav from '@/components/ProviderBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProviderMenu() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const { data: user } = useCurrentUser({ redirectOnError: false });

  const handleLogout = async () => {
    setLoggingOut(true);
    await api.auth.logout('/');
  };

  const fullName = user?.fullName || user?.full_name || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  const city = user?.city || '';

  const menuItems = [
    { icon: User,          label: 'Meus dados',           path: '/provider/profile' },
    { icon: ClipboardList, label: 'Meus pedidos',          path: '/provider/orders' },
    { icon: Briefcase,     label: 'Meus serviços',        path: '/provider/services' },
    { icon: Wallet,        label: 'Formas de pagamento',  path: '/provider/payments' },
    { icon: Bell,          label: 'Notificações',         path: '/provider/notifications' },
    { icon: Headphones,    label: 'Ajuda e suporte',      path: '/provider/support' },
    { icon: Info,          label: 'Sobre o aplicativo',   path: '/client/about' },
  ];

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col pb-20">
      {/* Top header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-md mx-auto w-full px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <span className="font-semibold text-foreground text-base">Menu</span>
          <button
            onClick={() => setConfirmLogout(true)}
            className="p-2 -mr-2 rounded-xl hover:bg-secondary/50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-5 space-y-4">
        {/* Cabeçalho do perfil */}
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
          </div>
        </div>

        {/* Itens do menu */}
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
        {confirmLogout ? (
          <div className="bg-card border border-red-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-foreground font-medium">Tem certeza que deseja sair?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex items-center gap-2 px-1 py-2 text-sm font-semibold text-red-500 hover:opacity-80 transition-opacity"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        )}
      </div>

      <ProviderBottomNav active="menu" />
    </div>
  );
}
