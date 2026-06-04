import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, ChevronRight, MapPin, Plus } from 'lucide-react';
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
        <h1 className="font-heading text-lg font-bold text-foreground">Endereço</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 pt-5 space-y-4">
          {hasAddress && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest mb-2 px-1">
                ENDEREÇO PRINCIPAL
              </p>
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => navigate('/client/edit-address')}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{addressLine1}</p>
                    {profile?.neighborhood && (
                      <p className="text-xs text-muted-foreground">{profile.neighborhood}</p>
                    )}
                    {user?.city && profile?.address && (
                      <p className="text-xs text-muted-foreground">{user.city}</p>
                    )}
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 text-xs font-medium text-primary bg-primary/10 rounded-full">
                      Principal
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              </div>
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
            className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-sm hover:opacity-90 transition-opacity"
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
