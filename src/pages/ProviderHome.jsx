import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Star, Inbox, MapPin, Clock,
  ChevronRight, LifeBuoy, Navigation, LogOut, MessageCircle,
} from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import ProviderBottomNav from '@/components/ProviderBottomNav';

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff} min atrás`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h atrás`;
  return formatDate(iso);
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function progressLabel(ps) {
  if (!ps) return 'Confirmado';
  const map = {
    on_the_way: 'A caminho',
    arrived: 'Chegou ao local',
    in_progress: 'Em execução',
    provider_done: 'Aguardando confirmação',
    completed: 'Concluído',
  };
  return map[ps] || ps;
}

function progressColor(ps) {
  if (!ps) return 'bg-blue-100 text-blue-700';
  if (ps === 'completed') return 'bg-green-100 text-green-700';
  if (ps === 'provider_done') return 'bg-yellow-100 text-yellow-700';
  return 'bg-primary/10 text-primary';
}

export default function ProviderHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'active' ? 'active' : tabParam === 'talking' ? 'talking' : 'available';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [providerSpecialties, setProviderSpecialties] = useState([]);
  const [hasProviderServices, setHasProviderServices] = useState(null);
  const [accepting, setAccepting] = useState(true);
  const [userProfileId, setUserProfileId] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [providerServiceAreas, setProviderServiceAreas] = useState([]);

  useEffect(() => {
    api.auth.me()
      .then(async (u) => {
        setUser(u);
        try {
          const provProfiles = await api.entities.ProviderProfile.filter({ created_by_id: u.id });
          if (provProfiles.length === 0) { navigate('/provider/onboarding'); return; }
          setProviderSpecialties(provProfiles[0].specialties || []);
          setProviderServiceAreas(provProfiles[0].serviceAreas || []);
        } catch { /* mantém home sem redirecionar */ }
        try {
          const userProfiles = await api.entities.UserProfile.filter({ userId: u.id });
          const up = userProfiles.find(p => p.role === 'provider') || userProfiles[0];
          if (up) { setUserProfileId(up.id); setAccepting(up.active !== false); }
        } catch { /* ignora */ }
        try {
          const services = await api.entities.ProviderService.filter({ providerId: u.id });
          setHasProviderServices(services.length > 0);
        } catch { /* ignora */ }
      })
      .catch(() => navigate('/'));
  }, []);

  const handleToggleAccepting = async () => {
    const next = !accepting;
    setAccepting(next);
    if (userProfileId) {
      await api.entities.UserProfile.update(userProfileId, { active: next });
    }
  };

  const { data: rawRequests = [], isLoading } = useQuery({
    queryKey: ['provider-requests'],
    queryFn: async () => {
      const [open, inConv] = await Promise.all([
        api.entities.ServiceRequest.filter({ status: 'open' }, '-created_date', 100),
        api.entities.ServiceRequest.filter({ status: 'in_conversation' }, '-created_date', 100),
      ]);
      return [...open, ...inConv];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: agreedRequests = [] } = useQuery({
    queryKey: ['provider-agreed', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ confirmedProviderId: user.id }),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const providerCities = providerServiceAreas.length
    ? providerServiceAreas.map(a => norm((a.city || '').split(' - ')[0]))
    : [norm((user?.city || '').split(' - ')[0])];
  const hasCityFilter = providerCities.some(c => c.length > 0);
  const cityFiltered = rawRequests.filter(r => {
    if (!hasCityFilter) return true;
    const reqCity = norm((r.city || '').split(' - ')[0]);
    if (!reqCity) return true;
    return providerCities.includes(reqCity);
  });
  const openRequests = cityFiltered.filter(r => r.status === 'open');
  const inConvRequests = cityFiltered.filter(r => r.status === 'in_conversation');

  const visibleOpenRequests = openRequests.filter(r => !dismissed.has(r.id));

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', user?.id],
    queryFn: () => api.entities.ProviderReview.filter({ providerId: user.id }),
    enabled: !!user?.id,
  });

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const completed = agreedRequests.filter(r => r.status === 'completed').length;
  const activeOrders = agreedRequests.filter(r => r.status === 'agreed');

  const handleLogout = () => api.auth.logout('/');
  const firstName = (user?.fullName || user?.full_name)?.split(' ')[0] || '';

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Olá, {firstName || '...'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-secondary/50 transition-colors border border-border"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Toggle recebendo pedidos */}
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${accepting ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            <div>
              <p className="text-sm font-semibold text-foreground">Recebendo pedidos</p>
              <p className="text-xs text-muted-foreground">
                {accepting ? 'Você está visível para novos clientes.' : 'Você está invisível.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAccepting}
            className={`relative w-12 h-6 rounded-full transition-colors ${accepting ? 'bg-primary' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${accepting ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{activeOrders.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Em andamento</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{completed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Concluídos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{avgRating ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Avaliação
            </p>
          </div>
        </div>

        {/* Suporte */}
        <Link
          to="/provider/support"
          className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">Ajuda e suporte</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Link>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'available', label: 'Disponíveis', count: visibleOpenRequests.length },
            { id: 'talking',   label: 'Em conversa', count: inConvRequests.length },
            { id: 'active',    label: 'Em andamento', count: activeOrders.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-foreground'
              }`}
            >
              <span className="font-bold text-base leading-none">{tab.count}</span>
              <span className="mt-0.5 leading-tight text-center">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Em andamento ────────────────────────────────────────────────── */}
        {activeTab === 'active' && (
          <>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <Navigation className="w-12 h-12 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Nenhum pedido em andamento</p>
                <p className="text-sm text-muted-foreground">Pedidos confirmados aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(req => (
                  <button
                    key={req.id}
                    onClick={() => navigate(`/provider/request/${req.id}/progress`)}
                    className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-semibold text-foreground text-sm">{req.title || req.category}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${progressColor(req.progressStatus)}`}>
                        {progressLabel(req.progressStatus)}
                      </span>
                    </div>
                    {(req.address || req.city) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{req.address ? `${req.address}, ` : ''}{req.city}</span>
                      </div>
                    )}
                    {req.agreedPrice && (
                      <p className="text-sm font-bold text-primary">
                        R$ {parseFloat(req.agreedPrice).toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                      <span>Acompanhar pedido</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Em conversa ─────────────────────────────────────────────────── */}
        {activeTab === 'talking' && (
          <>
            {inConvRequests.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Nenhuma conversa em andamento</p>
                <p className="text-sm text-muted-foreground">Pedidos onde você enviou orçamento aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {inConvRequests.map(req => (
                  <button
                    key={req.id}
                    onClick={() => navigate(`/provider/request/${req.id}`)}
                    className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-semibold text-foreground text-sm">{req.title || req.category}</p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">Em conversa</span>
                    </div>
                    {(req.address || req.city) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{req.address ? `${req.address}, ` : ''}{req.city}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Disponíveis ─────────────────────────────────────────────────── */}
        {activeTab === 'available' && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
              </div>
            ) : visibleOpenRequests.length === 0 || !accepting ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <Inbox className="w-14 h-14 text-muted-foreground/40" />
                <p className="font-semibold text-foreground text-base">Nenhum pedido disponível</p>
                {hasProviderServices === false ? (
                  <>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                      Você ainda não cadastrou serviços.{' '}
                      <button
                        onClick={() => navigate('/provider/onboarding?step=services')}
                        className="text-primary underline"
                      >
                        Complete seu perfil
                      </button>{' '}
                      para receber pedidos.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    Ainda não há pedidos compatíveis na sua área. Volte mais tarde.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleOpenRequests.map(request => (
                  <div key={request.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    {/* New badge */}
                    <div className="px-4 pt-3 pb-0 flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">Novo pedido disponível!</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Novo
                      </span>
                    </div>

                    <div className="p-4 space-y-3">
                      {/* Service */}
                      <div>
                        <p className="text-xs text-muted-foreground">Serviço</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">
                          {request.title || request.category}
                        </p>
                      </div>

                      {/* Location */}
                      {(request.address || request.city) && (
                        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            {request.address ? `${request.address}, ` : ''}
                            {request.city}
                          </span>
                        </div>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{timeAgo(request.created_date)}</span>
                      </div>

                      {/* Price */}
                      {(request.price || request.suggestedPrice) && (
                        <div>
                          <p className="text-xs text-muted-foreground">Preço proposto pelo cliente</p>
                          <p className="text-base font-bold text-primary mt-0.5">
                            R$ {parseFloat(request.price || request.suggestedPrice).toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => navigate(`/provider/request/${request.id}`)}
                          className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          Ver detalhes
                        </button>
                        <button
                          onClick={() => navigate(`/provider/request/${request.id}`)}
                          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          Aceitar pedido
                        </button>
                      </div>

                      <button
                        onClick={() => setDismissed(prev => new Set([...prev, request.id]))}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ProviderBottomNav active="home" />
    </div>
  );
}
