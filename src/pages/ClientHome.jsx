import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronRight, MapPin, ShieldCheck, LogOut, X, ArrowLeft, Users, Star, Search } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import ClientBottomNav from '../components/ClientBottomNav';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useServices } from '@/hooks/useServices';

const CAT_COLORS = [
  'bg-yellow-100', 'bg-blue-100', 'bg-rose-100', 'bg-teal-100',
  'bg-purple-100', 'bg-orange-100', 'bg-green-100', 'bg-indigo-100',
];

function normalize(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function searchCategories(query, categories) {
  if (!query.trim()) return [];
  const q = normalize(query.trim());
  const results = [];
  const seen = new Set();

  categories.forEach(cat => {
    if (normalize(cat.name).includes(q) && !seen.has(cat.name)) {
      seen.add(cat.name);
      results.push({ category: cat.name, subcategories: cat.subcategories, icon: cat.icon });
    }
    (cat.subcategories || []).forEach(sub => {
      if (normalize(sub).includes(q)) {
        const key = `${cat.name}::${sub}`;
        if (!seen.has(key)) {
          seen.add(key);
          results.push({ category: cat.name, subcategory: sub, icon: cat.icon });
        }
      }
    });
  });

  return results.slice(0, 6);
}

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

function matchesCategory(provider, categoryName) {
  if (!categoryName) return true;
  const name = categoryName.toLowerCase();
  return provider.specialties?.some(s =>
    s.toLowerCase().includes(name) || name.includes(s.toLowerCase())
  );
}

export default function ClientHome() {
  const navigate = useNavigate();
  const [categorySheet, setCategorySheet] = useState(null);
  const [showOthersModal, setShowOthersModal] = useState(false);
  const [modalCat, setModalCat] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: user, isLoading } = useCurrentUser({ redirectOnError: false });
  const { categories } = useServices();

  const { data: requests = [] } = useQuery({
    queryKey: ['client-requests', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ clientId: user?.id }, '-created_date'),
    enabled: !!user?.id,
  });

  const { data: cityProviders = [] } = useQuery({
    queryKey: ['city-providers-active', user?.city],
    queryFn: () => api.entities.ProviderProfile.filter({ city: user?.city, active: true }),
    enabled: !!user?.city,
    staleTime: 5 * 60 * 1000,
  });

  const firstName = (user?.fullName || user?.full_name)?.split(' ')[0] || '';
  const availableCount = cityProviders.length;

  const ratingsWithValue = cityProviders.filter(p => p.rating && parseFloat(p.rating) > 0);
  const avgRating = ratingsWithValue.length > 0
    ? (ratingsWithValue.reduce((sum, p) => sum + parseFloat(p.rating), 0) / ratingsWithValue.length).toFixed(1)
    : null;

  const getSubcategories = (name) => categories.find(c => c.name === name)?.subcategories || [];
  const searchResults = searchCategories(searchQuery, categories);

  const quickCategories = categories.slice(0, 5).map((cat, i) => ({
    name: cat.name,
    label: cat.name.split(' ')[0],
    icon: cat.icon,
    bg: CAT_COLORS[i % CAT_COLORS.length],
  }));

  const handleQuickCatClick = (cat) => {
    const subs = getSubcategories(cat.name);
    const provCount = cityProviders.filter(p => matchesCategory(p, cat.name)).length;
    const catRatings = cityProviders.filter(p => matchesCategory(p, cat.name) && p.rating && parseFloat(p.rating) > 0);
    const catAvg = catRatings.length > 0
      ? (catRatings.reduce((sum, p) => sum + parseFloat(p.rating), 0) / catRatings.length).toFixed(1)
      : null;
    setCategorySheet({ ...cat, subcategories: subs, providerCount: provCount, avgRating: catAvg });
  };

  const closeModal = () => {
    setShowOthersModal(false);
    setModalCat(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  const requireAuth = (navState) => {
    if (user) {
      navigate('/client/new-request', navState ? { state: navState } : undefined);
    } else {
      navigate('/client/onboarding', navState
        ? { state: { returnTo: '/client/new-request', returnState: navState } }
        : undefined
      );
    }
  };

  const activeRequests = requests.filter((r) => r.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col min-h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-20">

          {/* Logo topo */}
          <div className="flex items-center justify-center pt-4 pb-1">
            <img src="/onboarding-city.png" alt="ServiLocal" className="w-14 h-14 object-contain" />
          </div>

          {/* Greeting card */}
          <div className="px-4 pt-4 pb-3">
            {user ? (
              <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
                <button onClick={() => navigate('/client/profile')} className="shrink-0">
                  {user.photo ? (
                    <img src={user.photo} alt="foto" className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      {firstName?.[0]?.toUpperCase() || '?'}
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
                </div>
                <button
                  onClick={() => api.auth.logout('/')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg px-2 py-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-card rounded-2xl p-4 border border-border">
                <div>
                  <p className="font-bold text-foreground">Bem-vindo!</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Entre ou crie sua conta para publicar pedidos</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/login?role=client')}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => navigate('/client/welcome')}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Criar conta
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="O que você precisa hoje?"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-secondary rounded-lg"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search results */}
            {searchQuery && (
              <div className="mt-2 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum serviço encontrado.</p>
                ) : (
                  searchResults.map((result, i) => {
                    const Icon = result.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery('');
                          if (result.subcategory) {
                            requireAuth({ category: result.category, subcategory: result.subcategory });
                          } else {
                            const subs = result.subcategories || [];
                            const provCount = cityProviders.filter(p => matchesCategory(p, result.category)).length;
                            const catRatings = cityProviders.filter(p => matchesCategory(p, result.category) && p.rating && parseFloat(p.rating) > 0);
                            const catAvg = catRatings.length > 0
                              ? (catRatings.reduce((sum, p) => sum + parseFloat(p.rating), 0) / catRatings.length).toFixed(1)
                              : null;
                            setCategorySheet({ label: result.category, name: result.category, bg: 'bg-primary/10', icon: null, subcategories: subs, providerCount: provCount, avgRating: catAvg });
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left border-t border-border first:border-t-0"
                      >
                        {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {result.subcategory ? result.subcategory : result.category}
                          </p>
                          {result.subcategory && (
                            <p className="text-xs text-muted-foreground">{result.category}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Categorias */}
          {!searchQuery && quickCategories.length > 0 && (
          <div className="px-4 mb-4">
            <div className="grid grid-cols-3 gap-3">
              {quickCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => handleQuickCatClick(cat)}
                    className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    <div className={`w-12 h-12 rounded-full ${cat.bg} flex items-center justify-center shrink-0`}>
                      {Icon && <Icon className="w-6 h-6 text-foreground/70" />}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight text-foreground">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => { setShowOthersModal(true); setModalCat(null); }}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xl text-foreground/50 font-bold">···</span>
                </div>
                <span className="text-xs font-medium text-center leading-tight text-foreground">Outros</span>
              </button>
            </div>
          </div>
          )}

          {/* Profissionais disponíveis na sua região */}
          {user?.city && availableCount > 0 && (
            <div className="px-4 mb-4">
              <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">Profissionais na sua região</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-semibold">✓</span>
                    <span className="text-sm text-foreground">
                      <span className="font-bold text-primary">{availableCount}</span> disponíveis em {user?.city}
                    </span>
                  </div>
                  {avgRating && (
                    <div className="flex items-center gap-2">
                      <span className="text-primary text-sm font-semibold">✓</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-foreground">
                          Avaliação média de
                        </span>
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-bold text-foreground">{avgRating}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-primary text-sm font-semibold">✓</span>
                    <span className="text-sm text-foreground">Atende por chat ou telefone</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profissionais verificados */}
          <div className="px-4 mb-5">
            <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Profissionais verificados</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mais segurança e qualidade para você.</p>
              </div>
            </div>
          </div>

          {/* Seus pedidos */}
          {user && <div className="px-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-foreground">Seus pedidos</p>
              {activeRequests.length > 0 && (
                <Link to="/client/orders" className="text-xs text-primary font-medium">
                  Ver todos
                </Link>
              )}
            </div>
            {activeRequests.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-5 flex flex-col items-center text-center gap-2">
                <p className="text-sm text-muted-foreground">Você ainda não tem pedidos.</p>
                <button
                  onClick={() => requireAuth(null)}
                  className="text-sm font-semibold text-primary hover:opacity-80"
                >
                  Criar primeiro pedido
                </button>
              </div>
            ) : (
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
            )}
          </div>}

        </div>
      </div>


      {/* Category bottom sheet */}
      {categorySheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCategorySheet(null)} />
          <div className="relative bg-background rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full ${categorySheet.bg || 'bg-primary/10'} flex items-center justify-center`}>
                  {categorySheet.icon
                    ? (() => { const Icon = categorySheet.icon; return <Icon className="w-5 h-5 text-foreground/70" />; })()
                    : null}
                </div>
                <div>
                  <p className="font-bold text-foreground text-base">{categorySheet.label || categorySheet.name}</p>
                  {categorySheet.providerCount > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {categorySheet.providerCount} profissional{categorySheet.providerCount !== 1 ? 'is' : ''} disponível{categorySheet.providerCount !== 1 ? 'is' : ''} na sua região
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Serviço disponível</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setCategorySheet(null)}
                className="p-2 rounded-xl hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Stats row */}
            {(categorySheet.providerCount > 0 || categorySheet.avgRating) && (
              <div className="px-5 pb-3 shrink-0">
                <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3 flex items-center gap-4">
                  {categorySheet.providerCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-semibold text-foreground">{categorySheet.providerCount}</span>
                      <span className="text-xs text-muted-foreground">disponíveis</span>
                    </div>
                  )}
                  {categorySheet.avgRating && (
                    <div className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-semibold text-foreground">{categorySheet.avgRating}</span>
                      <span className="text-xs text-muted-foreground">média</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="px-5 pb-2 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selecione o tipo de serviço
              </p>
            </div>

            {/* Subcategories */}
            <div className="overflow-y-auto flex-1 px-5 pb-6">
              {categorySheet.subcategories.length > 0 ? (
                <div className="space-y-2">
                  {categorySheet.subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => {
                        requireAuth({ category: categorySheet.name, subcategory: sub });
                        setCategorySheet(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3.5 bg-card border border-border rounded-xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                    >
                      <span className="text-sm font-medium text-foreground">{sub}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => {
                    requireAuth({ category: categorySheet.name });
                    setCategorySheet(null);
                  }}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
                >
                  Solicitar atendimento
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Outros — todos os serviços */}
      {showOthersModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          <div className="bg-card border-b border-border px-4 h-14 flex items-center justify-between shrink-0">
            {modalCat ? (
              <button
                onClick={() => setModalCat(null)}
                className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
            ) : (
              <div className="w-9" />
            )}
            <span className="font-semibold text-base text-foreground">
              {modalCat ? modalCat.name : 'Todos os serviços'}
            </span>
            <button
              onClick={closeModal}
              className="p-2 -mr-2 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
            {!modalCat ? (
              <div className="grid grid-cols-3 gap-3">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => setModalCat(cat)}
                      className="flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">Selecione o tipo de serviço:</p>
                <div className="flex flex-wrap gap-2">
                  {modalCat.subcategories.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => {
                        requireAuth({ category: modalCat.name, subcategory: sub });
                        closeModal();
                      }}
                      className="px-4 py-2.5 rounded-full border border-border bg-card text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ClientBottomNav active="home" />
    </div>
  );
}
