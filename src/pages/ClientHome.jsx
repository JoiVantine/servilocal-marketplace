import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Search, ChevronRight, MapPin, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ServiceCategoryGrid from '../components/ServiceCategoryGrid';
import ClientBottomNav from '../components/ClientBottomNav';

const LOGO_URL = '/logo.png';

const STATUS_LABELS = {
  open: 'Procurando profissional',
  in_conversation: 'Em conversa',
  agreed: 'Acordado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  open: 'bg-orange-50 text-orange-500',
  in_conversation: 'bg-blue-50 text-blue-600',
  agreed: 'bg-teal-50 text-teal-600',
  completed: 'bg-green-50 text-green-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

const QUICK_CATEGORIES = [
  { icon: '⚡', label: 'Elétrica',   bg: 'bg-yellow-100' },
  { icon: '🚿', label: 'Hidráulica', bg: 'bg-blue-100'   },
  { icon: '🎨', label: 'Pintura',    bg: 'bg-rose-100'   },
  { icon: '🧹', label: 'Limpeza',    bg: 'bg-teal-100'   },
  { icon: '🏠', label: 'Reformas',   bg: 'bg-purple-100' },
  { icon: '···', label: 'Outros',    bg: 'bg-gray-100'   },
];

function getCategoryStyle(text = '') {
  const t = text.toLowerCase();
  if (t.includes('elétric') || t.includes('eletric')) return { icon: '⚡', bg: 'bg-yellow-100' };
  if (t.includes('hidrá') || t.includes('hidra') || t.includes('encana')) return { icon: '🚿', bg: 'bg-blue-100' };
  if (t.includes('pintur')) return { icon: '🎨', bg: 'bg-rose-100' };
  if (t.includes('limpez')) return { icon: '🧹', bg: 'bg-teal-100' };
  if (t.includes('reform') || t.includes('constru')) return { icon: '🏠', bg: 'bg-purple-100' };
  return { icon: '🔧', bg: 'bg-gray-100' };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `Solicitado em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ClientHome() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);

  const loadUser = async () => {
    try {
      const u = await api.auth.me();
      setUser(u);
      const profiles = await api.entities.UserProfile.filter({ userId: u.id });
      const clientProfile = profiles.find((p) => p.role === 'client');
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

  const firstName = (user?.fullName || user?.full_name)?.split(' ')[0] || '';

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const activeRequests = requests.filter((r) => r.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen bg-background">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
            <span className="text-sm font-semibold text-foreground">
              Servi<span className="text-primary font-bold">Local</span>
            </span>
          </div>
          <button
            onClick={() => api.auth.logout('/')}
            className="px-3 py-1.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-secondary/50 transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pb-20">
          {!showCategories ? (
            <>
              {/* Greeting card */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
                  <button onClick={() => navigate('/client/profile')} className="shrink-0">
                    {user.photo ? (
                      <img src={user.photo} alt="foto" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                        {firstName?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground">Olá, {firstName} 👋</p>
                    {user.city && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-muted-foreground truncate">{user.city}</span>
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/client/profile')}
                      className="flex items-center gap-0.5 mt-1 text-xs text-primary font-medium"
                    >
                      Editar dados <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Heading + Search */}
              <div className="px-4 pb-5">
                <h2 className="text-lg font-bold text-foreground mb-3">O que você precisa hoje?</h2>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar serviço ou profissional..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowCategories(true)}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder-muted-foreground"
                  />
                </div>
              </div>

              {/* Categorias */}
              <div className="px-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-bold text-foreground">Categorias</p>
                  <button onClick={() => setShowCategories(true)} className="text-xs text-primary font-medium">
                    Ver todas
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat.label}
                      onClick={() => navigate('/client/new-request', { state: { category: cat.label } })}
                      className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className={`w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center shrink-0`}>
                        <span className="text-lg leading-none">{cat.icon}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seus pedidos */}
              {activeRequests.length > 0 && (
                <div className="px-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-base font-bold text-foreground">Seus pedidos</p>
                    <Link to="/client/orders" className="text-xs text-primary font-medium">
                      Ver todos
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {activeRequests.slice(0, 3).map((request) => {
                      const catStyle = getCategoryStyle(`${request.category || ''} ${request.title || ''}`);
                      return (
                        <Link
                          key={request.id}
                          to={`/client/request/${request.id}`}
                          className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:bg-secondary/30 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-full ${catStyle.bg} flex items-center justify-center shrink-0`}>
                            <span className="text-lg leading-none">{catStyle.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate">{request.title}</p>
                            {request.city && (
                              <p className="text-xs text-muted-foreground truncate">{request.city}</p>
                            )}
                            {request.created_date && (
                              <p className="text-xs text-muted-foreground">{formatDate(request.created_date)}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[request.status] || 'bg-secondary text-muted-foreground'}`}>
                              {STATUS_LABELS[request.status] || request.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Profissionais verificados */}
              <div className="px-4 mb-6">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">Profissionais verificados</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Mais segurança e qualidade para você.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                </div>
              </div>
            </>
          ) : (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => { setShowCategories(false); setSearchQuery(''); }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground rotate-180" />
                </button>
                <h3 className="text-sm font-semibold text-foreground">Categorias de serviços</h3>
              </div>
              <ServiceCategoryGrid
                onSelectCategory={(categoryName, subcategoryName) => {
                  navigate('/client/new-request', { state: { category: categoryName, subcategory: subcategoryName } });
                }}
              />
            </div>
          )}
        </div>
      </div>

      <ClientBottomNav active="home" />
    </div>
  );
}
