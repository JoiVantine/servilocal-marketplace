import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, CheckCircle } from 'lucide-react';
import AddressFormWithMap from '@/components/AddressFormWithMap';

export default function ClientEditAddress() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [addressData, setAddressData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [validateNow, setValidateNow] = useState(false);

  useEffect(() => {
    const load = async () => {
      const u = await api.auth.me();
      setUser(u);
      const profiles = await api.entities.UserProfile.filter({ userId: u.id });
      setProfile(profiles.find((p) => p.role === 'client') || profiles[0] || null);
    };
    load().catch(() => navigate('/'));
  }, []);

  const handleSave = async () => {
    setValidateNow(true);
    if (!addressData?.cidade || !addressData?.endereco) return;
    setSaving(true);
    try {
      const addressLine = [addressData.endereco, addressData.numero].filter(Boolean).join(', ');
      const profileData = {
        userId: user.id,
        address: addressLine,
        neighborhood: addressData.bairro || '',
        cep: addressData.cep || '',
        role: profile?.role || 'client',
        onboardingCompleted: true,
      };
      if (profile) {
        await api.entities.UserProfile.update(profile.id, profileData);
      } else {
        await api.entities.UserProfile.create(profileData);
      }
      const cityState = addressData.estado
        ? `${addressData.cidade} - ${addressData.estado}`
        : addressData.cidade;
      await api.auth.updateMe({ city: cityState });
      setSaved(true);
      setTimeout(() => navigate('/client/address'), 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-background">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-heading text-lg font-bold text-foreground">Editar endereço</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-5">
        <AddressFormWithMap
          onAddressChange={setAddressData}
          validateNow={validateNow}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        {saved ? (
          <div className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Endereço salvo!
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Salvando...' : 'Salvar endereço'}
          </button>
        )}
      </div>
    </div>
  );
}
