import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/api/apiClient';
import ClientBottomNav from '@/components/ClientBottomNav';

const PREFS_KEY = 'servilocal_notification_prefs';

const DEFAULT_PREFS = {
  proposals:   true,
  orderStatus: true,
  messages:    true,
  promotions:  false,
};

const ITEMS = [
  {
    key: 'proposals',
    label: 'Novas propostas',
    description: 'Receber quando receber novas propostas',
  },
  {
    key: 'orderStatus',
    label: 'Status do pedido',
    description: 'Atualizações sobre o status dos meus pedidos',
  },
  {
    key: 'messages',
    label: 'Mensagens',
    description: 'Novas mensagens dos profissionais',
  },
  {
    key: 'promotions',
    label: 'Promoções',
    description: 'Ofertas e novidades',
  },
];

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative flex-shrink-0 inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-primary' : 'bg-border'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function ClientNotifications() {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });
  const [profileId, setProfileId] = useState(null);
  const [browserDenied, setBrowserDenied] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'denied'
  );

  useEffect(() => {
    api.auth.me().then(async (user) => {
      const profiles = await api.entities.UserProfile.filter({ userId: user.id });
      const profile = profiles.find((p) => p.role === 'client') || profiles[0];
      if (!profile) return;
      setProfileId(profile.id);
      if (profile.notificationPrefs) {
        const merged = { ...DEFAULT_PREFS, ...profile.notificationPrefs };
        setPrefs(merged);
        localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
      }
    }).catch(() => {});
  }, []);

  const toggle = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    if (profileId) {
      api.entities.UserProfile.update(profileId, { notificationPrefs: updated }).catch(() => {});
    }
    // Non-blocking: try to request browser permission when enabling
    if (updated[key] && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(result => {
        setBrowserDenied(result === 'denied');
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate('/client')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Notificações</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {browserDenied && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-sm font-semibold text-orange-700">Notificações do navegador bloqueadas</p>
            <p className="text-xs text-orange-600 mt-0.5">
              Para receber notificações push, habilite nas configurações do seu navegador. As preferências abaixo ainda são salvas.
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {ITEMS.map((item, i) => (
            <div
              key={item.key}
              className={`flex items-center justify-between px-4 py-4 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </div>
              <Toggle checked={prefs[item.key]} onChange={() => toggle(item.key)} />
            </div>
          ))}
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
