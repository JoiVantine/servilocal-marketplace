import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, Camera, Loader2, CheckCircle } from 'lucide-react';
import ProviderBottomNav from '@/components/ProviderBottomNav';
import { useCurrentUser, useRefreshUser } from '@/hooks/useCurrentUser';

const formatPhone = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (!d.length) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export default function ProviderProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const { data: user, isLoading } = useCurrentUser();
  const refreshUser = useRefreshUser();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [initialized, setInitialized] = useState(false);

  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  if (user && !initialized) {
    setName(user.fullName || user.full_name || '');
    setPhone(user.phone || '');
    setCity(user.city || '');
    setInitialized(true);
  }

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError(false);
    try {
      const url = await api.uploadFile(file);
      await api.auth.updateMe({ photo: url });
      refreshUser();
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      await api.auth.updateMe({ full_name: name, name, phone, city });

      const me = await api.auth.me();
      const provProfiles = await api.entities.ProviderProfile.filter({ userId: me.id });
      if (provProfiles.length > 0) {
        await api.entities.ProviderProfile.update(provProfiles[0].id, { name, phone, city });
      }

      refreshUser();
      setShowSuccessModal(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const fullName = user?.fullName || user?.full_name || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Meus dados</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Foto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user.photo ? (
                <img src={user.photo} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {initials}
                </div>
              )}
              {photoLoading && (
                <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">Foto do perfil</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => { setPhotoError(false); fileRef.current?.click(); }}
              disabled={photoLoading}
              className="text-sm font-semibold text-primary hover:opacity-80 disabled:opacity-50"
            >
              Editar
            </button>
            {photoError && <span className="text-xs text-red-500">Falha ao enviar foto</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Campos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">E-mail</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-4 py-3 border border-border rounded-xl bg-secondary text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="(DDD) 90000-0000"
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Ex.: São Paulo"
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-500 text-center -mt-2">Falha ao salvar. Tente novamente.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-bold text-foreground text-lg">Dados salvos!</p>
              <p className="text-sm text-muted-foreground mt-1">Suas informações foram atualizadas.</p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <ProviderBottomNav active="menu" />
    </div>
  );
}
