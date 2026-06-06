import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Star, Inbox, MapPin, Clock,
  Navigation, LogOut, MessageCircle, ChevronRight, CalendarDays,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

function whenLabel(request) {
  const opts = request?.scheduleOptions;
  const dateStr = opts?.[0]?.date || (request?.scheduledAt ? request.scheduledAt.slice(0, 10) : null);
  if (!dateStr && request?.when !== 'scheduled') return 'O mais rápido possível';
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.floor((d - today) / 86400000);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff <= 7) return `Em ${diff} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function ProviderHome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'active' ? 'active' : tabParam === 'talking' ? 'talking' : tabParam === 'agenda' ? 'agenda' : 'available';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [providerSpecialties, setProviderSpecialties] = useState([]);
  const [hasProviderServices, setHasProviderServices] = useState(null);
  const [accepting, setAccepting] = useState(true);
  const [userProfileId, setUserProfileId] = useState(null);
  const [dismissed, setDismissed] = useState(new Set());
  const [providerServiceAreas, setProviderServiceAreas] = useState([]);
  const [providerCoords, setProviderCoords] = useState(null);
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    api.auth.me()
      .then(async (u) => {
        setUser(u);
        try {
          const provProfiles = await api.entities.ProviderProfile.filter({ created_by_id: u.id });
          if (provProfiles.length === 0) { navigate('/provider/onboarding'); return; }
          setProviderSpecialties(provProfiles[0].specialties || []);
          setProviderServiceAreas(provProfiles[0].serviceAreas || []);
          setProviderName(provProfiles[0].name || u.fullName || u.full_name || '');
          if (provProfiles[0].lat && provProfiles[0].lng) {
            setProviderCoords({ lat: provProfiles[0].lat, lng: provProfiles[0].lng });
          }
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

  const { data: myInterests = [] } = useQuery({
    queryKey: ['provider-my-interests', user?.id],
    queryFn: () => api.entities.ServiceRequestInterest.filter({ providerId: user.id }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  const myInterestRequestIds = new Set(myInterests.map(i => i.serviceRequestId));

  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const d = (x) => x * Math.PI / 180;
    const a = Math.sin(d(lat2 - lat1) / 2) ** 2
      + Math.cos(d(lat1)) * Math.cos(d(lat2)) * Math.sin(d(lon2 - lon1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const providerCities = providerServiceAreas.length
    ? providerServiceAreas.map(a => norm((a.city || '').split(' - ')[0]))
    : [norm((user?.city || '').split(' - ')[0])];
  const hasCityFilter = providerCities.some(c => c.length > 0);

  const distanceMap = new Map();
  const locationFiltered = rawRequests.filter(r => {
    if (providerCoords?.lat && providerCoords?.lng && r.lat && r.lng) {
      const km = haversineKm(providerCoords.lat, providerCoords.lng, r.lat, r.lng);
      distanceMap.set(r.id, km);
      return km <= 20;
    }
    // fallback: match por cidade
    if (!hasCityFilter) return true;
    const reqCity = norm((r.city || '').split(' - ')[0]);
    if (!reqCity) return true;
    return providerCities.includes(reqCity);
  });

  const specialtyFiltered = locationFiltered.filter(r => {
    if (!providerSpecialties.length) return true;
    const reqCat = norm(r.category || '');
    const reqSub = norm(r.subcategory || '');
    const reqTitle = norm(r.title || '');
    return providerSpecialties.some(sp => {
      const s = norm(sp);
      return reqCat.includes(s) || s.includes(reqCat) ||
             reqSub.includes(s) || s.includes(reqSub) ||
             reqTitle.includes(s) || s.includes(reqTitle);
    });
  });

  const openRequests = specialtyFiltered.filter(r => r.status === 'open');
  const inConvRequests = specialtyFiltered.filter(r =>
    r.status === 'in_conversation' && myInterestRequestIds.has(r.id)
  );

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
  const newlyAgreed = activeOrders.filter(r => !r.progressStatus);

  const handleLogout = () => api.auth.logout('/');
  const firstName = providerName.split(' ')[0] || (user?.fullName || user?.full_name)?.split(' ')[0] || '';

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
            {avgRating ? (
              <>
                <p className="text-2xl font-bold text-foreground">{avgRating}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Avaliação
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-primary mt-1">Novo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Sem avaliações</p>
              </>
            )}
          </div>
        </div>


        {/* Proposta aceita — notificação */}
        {newlyAgreed.map(req => (
          <button
            key={req.id}
            onClick={() => navigate(`/provider/request/${req.id}/progress`)}
            className="w-full flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3 text-left"
          >
            <span className="text-xl mt-0.5">🎉</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Sua proposta foi aceita!</p>
              <p className="text-xs text-green-700 mt-0.5 leading-snug">
                {req.title || req.category} — Entre em contato com o cliente para os últimos detalhes.
              </p>
            </div>
          </button>
        ))}

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

        {/* ── Agenda ──────────────────────────────────────────────────────── */}
        {activeTab === 'agenda' && (
          <>
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-3 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
                <p className="font-semibold text-foreground">Nenhum pedido confirmado</p>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                  Pedidos aceitos pelo cliente aparecerão aqui com a data agendada.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(req => {
                  const dateStr = req.agreedScheduledDate || req.scheduleOptions?.[0]?.date || null;
                  const dateLabel = dateStr
                    ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                    : 'Data a combinar';
                  const timeLabel = req.agreedScheduledTime || req.scheduleOptions?.[0]?.startTime || null;
                  return (
                    <button
                      key={req.id}
                      onClick={() => navigate(`/provider/request/${req.id}/progress`)}
                      className="w-full bg-card border border-primary/30 bg-primary/[0.02] rounded-2xl p-4 text-left hover:border-primary/60 transition-colors shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-xl px-3 py-2 text-center shrink-0">
                          <p className="text-xs font-bold text-primary uppercase">
                            {dateStr ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('pt-BR', { month: 'short' }) : '—'}
                          </p>
                          <p className="text-2xl font-black text-primary leading-none">
                            {dateStr ? new Date(`${dateStr}T00:00:00`).getDate() : '?'}
                          </p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm">{req.title || req.category}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}</p>
                          {req.clientName && (
                            <p className="text-xs text-muted-foreground mt-0.5">{req.clientName}</p>
                          )}
                          {req.agreedPrice && (
                            <p className="text-xs font-bold text-primary mt-1">
                              R$ {parseFloat(req.agreedPrice).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${progressColor(req.progressStatus)}`}>
                          {progressLabel(req.progressStatus)}
                        </span>
                      </div>
                    </button>
                  );
                })}
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
                <p className="font-semibold text-foreground text-base">Nenhum pedido disponível agora</p>
                {hasProviderServices === false ? (
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
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                    Continue visível para receber novas solicitações da sua região.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleOpenRequests.map(request => {
                  const when = whenLabel(request);
                  const cityName = request.city?.split(' - ')[0] || request.city || '';
                  const location = request.neighborhood
                    ? `${request.neighborhood}${cityName ? ` · ${cityName}` : ''}`
                    : cityName;
                  const km = distanceMap.get(request.id);
                  const distLabel = km != null ? (km < 1 ? '< 1km' : `${Math.round(km)}km`) : null;
                  return (
                  <div key={request.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-foreground leading-snug">
                          {request.title || request.category}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          Novo pedido
                        </span>
                      </div>

                      {/* Tags: quando + localização */}
                      <div className="flex flex-wrap gap-2">
                        {when && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{when}</span>
                          </div>
                        )}
                        {location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{location}</span>
                          </div>
                        )}
                        {distLabel && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                            <Navigation className="w-3 h-3 shrink-0" />
                            <span>{distLabel} de você</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{timeAgo(request.created_date)}</span>
                        </div>
                      </div>

                      {/* Price */}
                      {(request.price || request.suggestedPrice) && (
                        <p className="text-base font-bold text-primary">
                          R$ {parseFloat(request.price || request.suggestedPrice).toFixed(2).replace('.', ',')}
                        </p>
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
                          Enviar orçamento
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
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <ProviderBottomNav active="home" />
    </div>
  );
}
