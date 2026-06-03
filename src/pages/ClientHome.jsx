import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Home, Search, ChevronRight, MapPin, ArrowLeft, ClipboardList, LifeBuoy } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ServiceCategoryGrid from '../components/ServiceCategoryGrid';
import EditProfileModal from '../components/EditProfileModal';

const LOGO_URL = "/logo.png";

const STATUS_LABELS = {
  open: 'Aberto',
  in_conversation: 'Em conversa',
  agreed: 'Acordado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-700',
  in_conversation: 'bg-yellow-100 text-yellow-700',
  agreed: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ClientHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const loadUser = async () => {
    try {
      const u = await api.auth.me();
      setUser(u);
      const profiles = await api.entities.UserProfile.filter({ userId: u.id });
      const clientProfile = profiles.find(p => p.role === 'client');
      if (!clientProfile || clientProfile.firstAccess !== false) navigate('/client/onboarding');
    } catch {
      navigate('/client/onboarding');
    }
  };

  useEffect(() => { loadUser(); }, []);

  const { data: requests = [] } = useQuery({
    queryKey: ['client-requests', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ clientId: user?.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers', user?.city],
    queryFn: () => api.entities.ProviderProfile.filter({ city: user?.city }, '', 5),
    enabled: !!user?.city,
  });

  const handleLogout = async () => {
    await api.auth.logout('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Wrapper card no desktop */}
      <div className="w-full max-w-md flex flex-col min-h-screen bg-background">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
            title="Voltar ao início"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground">ServiLocal</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-20 px-4 py-6">
          {!showCategories ? (
            <>
              {/* Profile Section */}
              <div className="flex items-center gap-4 mb-8 p-4 bg-card border border-border rounded-xl">
                {user.photo ? (
                  <img src={user.photo} alt="foto" className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-primary/20" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl flex-shrink-0">
                    {(user.fullName || user.full_name)?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Olá, {(user.fullName || user.full_name)?.split(' ')[0]}
                  </p>
                  {user.city && (
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                      <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="truncate">{user.city}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="text-xs text-primary font-medium hover:opacity-80 mt-1"
                  >
                    Editar dados
                  </button>
                </div>
              </div>

              {/* Question */}
              <h2 className="font-heading text-2xl font-bold text-center text-foreground mb-6">
                O que você precisa hoje?
              </h2>

              {/* Search */}
              <div className="relative mb-8">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar serviço"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowCategories(true)}
                  className="w-full pl-12 pr-4 py-3 border border-border rounded-full bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder-muted-foreground"
                />
              </div>

              {/* Professionals Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground text-sm">Profissionais em {user.city}</h3>
                  <span className="text-xs text-muted-foreground">{providers.length} no total</span>
                </div>

                <Link
                  to="/client/services"
                  className="w-full p-4 bg-primary text-primary-foreground rounded-lg flex items-center justify-between font-medium text-sm mb-3 hover:opacity-90 transition-opacity"
                >
                  <span>Ver todos os serviços na sua cidade</span>
                  <ChevronRight className="w-5 h-5" />
                </Link>

                {providers.slice(0, 1).map((provider) => (
                  <div key={provider.id} className="p-4 bg-card border border-border rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {provider.name?.[0]?.toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Profissional disponível</p>
                        <p className="text-xs text-muted-foreground">{provider.specialties?.[0] || 'Serviço'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {provider.rating > 0 && (
                        <>
                          <span className="text-sm font-medium text-foreground">{provider.rating.toFixed(1)}</span>
                          <span className="text-lg">⭐</span>
                        </>
                      )}
                      {provider.rating === 0 && (
                        <span className="text-xs text-muted-foreground">Sem avaliações</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <Link
                to="/client/support"
                className="mb-6 flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Ajuda e suporte</p>
                    <p className="text-xs text-muted-foreground">Abra uma solicitacao e acompanhe o atendimento.</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>

              {/* Recent Requests */}
              {requests.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-foreground text-sm mb-3">Suas solicitações</h3>
                  <div className="space-y-2">
                    {requests.filter(r => r.status !== 'cancelled').slice(0, 3).map((request) => (
                      <Link
                        key={request.id}
                        to={`/client/request/${request.id}`}
                        className="block p-3 bg-card border border-border rounded-lg hover:bg-secondary/30 transition-colors text-sm"
                      >
                        <p className="font-medium text-foreground text-sm">{request.title}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{request.city}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[request.status] || 'bg-secondary text-muted-foreground'}`}>
                            {STATUS_LABELS[request.status] || request.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Categories View */}
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => {
                    setShowCategories(false);
                    setSearchQuery('');
                  }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <h3 className="text-sm font-semibold text-foreground">Categorias de serviços</h3>
              </div>
              <ServiceCategoryGrid
                onSelectCategory={(categoryName, subcategoryName) => {
                  navigate('/client/new-request', { state: { category: categoryName, subcategory: subcategoryName } });
                }}
              />
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-border bg-background">
          <div className="flex items-center justify-around">
            <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
              <Home className="w-5 h-5" />
              <span className="text-xs">Início</span>
            </button>
            <Link to="/client/orders" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors">
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs">Pedidos</span>
            </Link>
          </div>
        </div>

      </div>

      {showEditProfile && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditProfile(false)}
          onSaved={(updates) => {
            if (updates) setUser(prev => ({
              ...prev,
              photo: updates.photo ?? prev.photo,
              fullName: updates.name ?? prev.fullName,
              full_name: updates.name ?? prev.full_name,
              city: updates.city ?? prev.city,
            }));
          }}
        />
      )}
    </div>
  );
}
