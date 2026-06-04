import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { User, MapPin, Headphones, Info, LogOut, Trash2, ChevronRight } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientMenu() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems = [
    { icon: User,       label: 'Meus dados',         action: () => navigate('/client/profile') },
    { icon: MapPin,     label: 'Endereço',            action: () => navigate('/client/address') },
    { icon: Headphones, label: 'Ajuda e suporte',     action: () => navigate('/client/help') },
    { icon: Info,       label: 'Sobre o aplicativo',  action: () => navigate('/client/about') },
  ];

  const handleLogout = async () => {
    setLoggingOut(true);
    await api.auth.logout('/');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.')) {
      navigate('/client/support');
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <img src="/logo.png" alt="ServiLocal" className="w-6 h-6 object-contain" />
        <span className="text-sm font-semibold text-foreground">Servi<span className="text-primary font-bold">Local</span></span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full px-4 py-6 space-y-3">
        {/* Main items */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center justify-between px-4 py-4 hover:bg-secondary/50 transition-colors text-left ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Danger zone */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">
              {loggingOut ? 'Saindo...' : 'Sair da conta'}
            </span>
          </button>
          <div className="border-t border-border" />
          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm font-medium text-red-500">Excluir conta</span>
          </button>
        </div>
      </div>

      </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
