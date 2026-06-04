import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

export default function ClientAddress() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await api.auth.me();
        setUser(u);
        const profiles = await api.entities.UserProfile.filter({ userId: u.id });
        const clientProfile = profiles.find((p) => p.role === 'client') || profiles[0] || null;
        setProfile(clientProfile);
      } catch {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const hasAddress = profile?.address || user?.city;

  const addressLine1 = profile?.address
    ? profile.address
    : user?.city
    ? user.city
    : null;

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-background border-b border-border">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-semibold text-foreground">Endereços salvos</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
          {hasAddress && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => navigate('/client/edit-address')}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Casa</p>
                  <p className="text-sm font-medium text-foreground">{addressLine1}</p>
                  {profile?.neighborhood && (
                    <p className="text-xs text-muted-foreground">{profile.neighborhood}, {user?.city}</p>
                  )}
                  {profile?.zipCode && (
                    <p className="text-xs text-muted-foreground">{profile.zipCode}</p>
                  )}
                </div>
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
              </button>
            </div>
          )}

          {!hasAddress && (
            <div className="text-center py-10">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
            </div>
          )}

          <button
            onClick={() => navigate('/client/edit-address')}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-2xl text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" />
            {hasAddress ? 'Editar endereço' : 'Adicionar endereço'}
          </button>
        </div>
      )}

      <ClientBottomNav active="menu" />
    </div>
  );
}
