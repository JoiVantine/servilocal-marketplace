import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Loader2 } from 'lucide-react';
import { api } from '@/api/apiClient';
import ClientBottomNav from '@/components/ClientBottomNav';

const PREFS_KEY = 'servilocal_notification_prefs';

const DEFAULT_PREFS = {
  proposals: true,
  orderStatus: true,
  messages: true,
  promotions: false,
};

const ITEMS = [
  { key: 'proposals', label: 'Novas propostas', description: 'Avisar quando um profissional enviar proposta' },
  { key: 'orderStatus', label: 'Status do pedido', description: 'Atualizações sobre andamento e conclusão' },
  { key: 'messages', label: 'Mensagens', description: 'Novas mensagens dos profissionais' },
  { key: 'promotions', label: 'Novidades', description: 'Comunicados e melhorias importantes' },
];

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative flex-shrink-0 inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
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

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
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
  const [pushConfig, setPushConfig] = useState(null);
  const [permission, setPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const [subscription, setSubscription] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const supported = useMemo(() => (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && typeof Notification !== 'undefined'
  ), []);

  useEffect(() => {
    api.auth.me().then(async (user) => {
      const [profiles, config] = await Promise.all([
        api.entities.UserProfile.filter({ userId: user.id }),
        api.push.config().catch(() => ({ enabled: false, publicKey: '' })),
      ]);
      const profile = profiles.find((p) => p.role === 'client') || profiles[0];
      if (profile) {
        setProfileId(profile.id);
        if (profile.notificationPrefs) {
          const merged = { ...DEFAULT_PREFS, ...profile.notificationPrefs };
          setPrefs(merged);
          localStorage.setItem(PREFS_KEY, JSON.stringify(merged));
        }
      }
      setPushConfig(config);
      if (supported) {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const current = await registration.pushManager.getSubscription();
        setSubscription(current);
      }
    }).catch((err) => setError(err.message || 'Não foi possível carregar notificações.'));
  }, [supported]);

  const togglePref = (key) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    if (profileId) {
      api.entities.UserProfile.update(profileId, { notificationPrefs: updated }).catch(() => {});
    }
  };

  const enablePush = async () => {
    setBusy(true);
    setError('');
    try {
      if (!supported) throw new Error('Seu navegador não oferece suporte a Web Push.');
      if (!pushConfig?.enabled || !pushConfig?.publicKey) {
        throw new Error('Push ainda não está configurado no servidor.');
      }
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') throw new Error('Permissão de notificação não concedida.');
      const registration = await navigator.serviceWorker.register('/sw.js');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushConfig.publicKey),
      });
      await api.push.saveSubscription(sub.toJSON());
      setSubscription(sub);
    } catch (err) {
      setError(err.message || 'Não foi possível ativar notificações.');
    } finally {
      setBusy(false);
    }
  };

  const disablePush = async () => {
    setBusy(true);
    setError('');
    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = subscription || await registration?.pushManager.getSubscription();
      if (sub) {
        await api.push.removeSubscription(sub.endpoint).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscription(null);
    } catch (err) {
      setError(err.message || 'Não foi possível desativar notificações.');
    } finally {
      setBusy(false);
    }
  };

  const pushActive = permission === 'granted' && !!subscription;

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate('/client/menu')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Notificações</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Push no navegador</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Receba avisos mesmo fora do app quando o navegador permitir.
              </p>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          {!pushConfig ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando configuração...
            </div>
          ) : pushActive ? (
            <button
              onClick={disablePush}
              disabled={busy}
              className="w-full py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary/50 disabled:opacity-50"
            >
              {busy ? 'Desativando...' : 'Desativar push'}
            </button>
          ) : (
            <button
              onClick={enablePush}
              disabled={busy || !supported}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Ativando...' : 'Ativar notificações push'}
            </button>
          )}
        </div>

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
              <Toggle checked={prefs[item.key]} onChange={() => togglePref(item.key)} />
            </div>
          ))}
        </div>
      </div>

      <ClientBottomNav active="menu" />
    </div>
  );
}
