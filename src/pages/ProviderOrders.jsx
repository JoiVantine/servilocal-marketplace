import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Search, MapPin, Clock, Navigation, CheckCircle2, X } from 'lucide-react';
import ProviderBottomNav from '@/components/ProviderBottomNav';

const STATUS_LABELS = {
  agreed: 'Em andamento',
  open: 'Aberto',
  in_conversation: 'Em conversa',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  agreed: 'bg-blue-100 text-blue-700',
  open: 'bg-primary/10 text-primary',
  in_conversation: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_ORDER = ['agreed', 'in_conversation', 'open', 'completed', 'cancelled'];

function norm(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ProviderOrders() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [providerSpecialties, setProviderSpecialties] = useState([]);
  const [providerServiceAreas, setProviderServiceAreas] = useState([]);

  useEffect(() => {
    api.auth.me().then(async (u) => {
      setUser(u);
      try {
        const pp = await api.entities.ProviderProfile.filter({ created_by_id: u.id });
        if (pp[0]) {
          setProviderSpecialties(pp[0].specialties || []);
          setProviderServiceAreas(pp[0].serviceAreas || []);
        }
      } catch { /* ignora */ }
    }).catch(() => navigate('/'));
  }, []);

  const { data: allRequests = [], isLoading } = useQuery({
    queryKey: ['provider-all-orders', user?.id],
    queryFn: async () => {
      const [agreed, open, inConv, completed] = await Promise.all([
        api.entities.ServiceRequest.filter({ confirmedProviderId: user.id }, '-created_date', 200),
        api.entities.ServiceRequest.filter({ status: 'open' }, '-created_date', 200),
        api.entities.ServiceRequest.filter({ status: 'in_conversation' }, '-created_date', 200),
        api.entities.ServiceRequest.filter({ status: 'completed', confirmedProviderId: user.id }, '-created_date', 100),
      ]);
      const seen = new Set();
      return [...agreed, ...open, ...inConv, ...completed].filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  // Aplica filtro de cidade + especialidade nos pedidos abertos/em_conversa (igual ao ProviderHome)
  const cityFiltered = useMemo(() => {
    const providerCities = providerServiceAreas.length
      ? providerServiceAreas.map(a => norm((a.city || '').split(' - ')[0]))
      : [norm((user?.city || '').split(' - ')[0])];
    const hasCityFilter = providerCities.some(c => c.length > 0);

    return allRequests.filter(r => {
      // Pedidos já confirmados/concluídos do próprio prestador — sempre exibir
      if (r.confirmedProviderId === user?.id) return true;
      if (r.status === 'completed' || r.status === 'cancelled') return true;
      // Para abertos/em conversa — aplica filtros
      if (hasCityFilter) {
        const reqCity = norm((r.city || '').split(' - ')[0]);
        if (reqCity && !providerCities.includes(reqCity)) return false;
      }
      if (providerSpecialties.length) {
        const reqCat = norm(r.category || '');
        const reqSub = norm(r.subcategory || '');
        const reqTitle = norm(r.title || '');
        const matches = providerSpecialties.some(sp => {
          const s = norm(sp);
          return reqCat.includes(s) || s.includes(reqCat) ||
                 reqSub.includes(s) || s.includes(reqSub) ||
                 reqTitle.includes(s) || s.includes(reqTitle);
        });
        if (!matches) return false;
      }
      return true;
    });
  }, [allRequests, user, providerServiceAreas, providerSpecialties]);

  const sorted = useMemo(() => {
    return [...cityFiltered].sort((a, b) => {
      const pa = PRIORITY_ORDER.indexOf(a.status);
      const pb = PRIORITY_ORDER.indexOf(b.status);
      if (pa !== pb) return pa - pb;
      return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    });
  }, [allRequests]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = norm(search);
    return sorted.filter(r =>
      norm(r.city).includes(q) ||
      norm(r.clientName).includes(q) ||
      norm(r.title).includes(q) ||
      norm(r.category).includes(q) ||
      norm(r.agreedPrice?.toString()).includes(q) ||
      norm(formatDate(r.scheduledAt)).includes(q) ||
      norm(formatDate(r.created_date)).includes(q)
    );
  }, [sorted, search]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-foreground">Pedidos</h1>
            <p className="text-xs text-muted-foreground">{allRequests.length} pedidos</p>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cidade, cliente, serviço, data, valor..."
              className="w-full pl-9 pr-9 py-2.5 text-sm bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-semibold text-foreground mb-1">Nenhum pedido encontrado</p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Tente outro termo de busca.' : 'Pedidos compatíveis com sua cidade e especialidades aparecerão aqui.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const isActive = req.status === 'agreed';
              const priceNum = parseFloat(req.agreedPrice || req.price || 0);
              return (
                <button
                  key={req.id}
                  onClick={() => isActive
                    ? navigate(`/provider/request/${req.id}/progress`)
                    : navigate(`/provider/request/${req.id}`)
                  }
                  className={`w-full text-left bg-card border rounded-2xl p-4 hover:border-primary/40 transition-colors shadow-sm ${isActive ? 'border-primary/30 bg-primary/[0.02]' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{req.title || req.category}</p>
                      {req.clientName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{req.clientName}</p>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[req.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {req.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{req.city}
                      </span>
                    )}
                    {req.scheduledAt ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(req.scheduledAt)}
                      </span>
                    ) : req.created_date ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{formatDate(req.created_date)}
                      </span>
                    ) : null}
                    {priceNum > 0 && (
                      <span className="font-semibold text-primary">
                        R$ {priceNum.toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Acompanhar pedido</span>
                    </div>
                  )}

                  {req.status === 'completed' && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Concluído</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <ProviderBottomNav active="orders" />
    </div>
  );
}
