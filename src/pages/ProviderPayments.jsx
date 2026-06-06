import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, Loader2, CheckCircle } from 'lucide-react';
import ProviderBottomNav from '@/components/ProviderBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProviderPayments() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('ALEATORIA');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.entities.ProviderProfile.filter({ userId: user.id })
      .then(pp => {
        if (pp.length > 0) {
          if (pp[0].pixKey) setPixKey(pp[0].pixKey);
          if (pp[0].pixKeyType) setPixKeyType(pp[0].pixKeyType);
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const me = await api.auth.me();
      const provProfiles = await api.entities.ProviderProfile.filter({ userId: me.id });
      if (provProfiles.length > 0) {
        await api.entities.ProviderProfile.update(provProfiles[0].id, { pixKey, pixKeyType });
      }
      navigate('/provider');
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Formas de pagamento</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo de chave Pix</label>
            <select
              value={pixKeyType}
              onChange={e => setPixKeyType(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="ALEATORIA">Chave aleatória (recomendado)</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="EMAIL">E-mail</option>
              <option value="TELEFONE">Telefone</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Chave Pix</label>
            <input
              type="text"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder={
                pixKeyType === 'ALEATORIA' ? 'Ex: a1b2c3d4-...' :
                pixKeyType === 'CPF' ? '000.000.000-00' :
                pixKeyType === 'EMAIL' ? 'seu@email.com' :
                pixKeyType === 'TELEFONE' ? '(DDD) 90000-0000' : ''
              }
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Sua chave Pix é exibida somente após o cliente contratar você.
          </p>
        </div>

        {saveError && (
          <p className="text-sm text-red-500 text-center">Falha ao salvar. Tente novamente.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-bold text-foreground text-lg">Dados salvos!</p>
              <p className="text-sm text-muted-foreground mt-1">Chave Pix atualizada.</p>
            </div>
            <button
              onClick={() => navigate('/provider/menu')}
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
