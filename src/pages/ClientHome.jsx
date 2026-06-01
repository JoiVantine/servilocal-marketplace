import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Home, Search, ChevronRight, MapPin, ArrowLeft, ClipboardList } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ServiceCategoryGrid from '../components/ServiceCategoryGrid';

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

  useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      const profiles = await base44.entities.UserProfile.filter({ userId: u.id });
      const clientProfile = profiles.find(p => (p.role === 'client' || p.role === 'both') && p.onboardingCompleted);
      if (!clientProfile) navigate('/client/onboarding');
    }).catch(() => navigate('/client/onboarding'));
  }, []);

  const { data: requests = [] } = useQuery({
    queryKey: ['client-requests'],
    queryFn: () => base44.entities.ServiceRequest.list('-created_date'),
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers', user?.city],
    queryFn: () => base44.entities.ProviderProfile.filter({ city: user?.city }, '', 5),
    enabled: !!user?.city,
  });

  const handleLogout = async () => {
    await base44.auth.logout('/');
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
      <div className="w-full max-w-md flex flex-col min-h-screen md:min-h-0 md:my-6 md:rounded-2xl md:border md:border-border md:shadow-xl md:overflow-hidden bg-background">

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
              <div className="flex flex-col items-center mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {(user.fullName || user.full_name)?.[0]?.toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      Olá, <strong>{(user.fullName || user.full_name)?.split(' ')[0]}</strong>
                    </p>
                    <button
                      onClick={() => navigate('/client/onboarding')}
                      className="text-xs text-primary font-medium hover:opacity-80"
                    >
                      Editar dados
                    </button>
                  </div>
                </div>
                {user.city && (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    {user.city}
                  </div>
                )}
              </div>

              {/* Illustration */}
              <div className="flex justify-center mb-8">
                <img
                  src="/logo.png"
                  alt="ServiLocal"
                  className="w-44 h-44 object-contain"
                />
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
                  to="/client/map"
                  className="w-full p-4 bg-primary text-primary-foreground rounded-lg flex items-center justify-between font-medium text-sm mb-3 hover:opacity-90 transition-opacity"
                >
                  <span>🗺️ Ver profissionais no mapa</span>
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/client/services"
                  className="w-full p-4 border border-border bg-card text-foreground rounded-lg flex items-center justify-between font-medium text-sm mb-3 hover:bg-secondary/50 transition-colors"
                >
                  <span>Ver todos os serviços da sua cidade</span>
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
    </div>
  );
}
