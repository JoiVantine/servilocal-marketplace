import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, TrendingUp, Star, CheckCircle2 } from 'lucide-react';

function fmt(value) {
  return parseFloat(value || 0).toFixed(2).replace('.', ',');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ProviderEarnings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/provider'));
  }, []);

  const { data: completedOrders = [], isLoading } = useQuery({
    queryKey: ['provider-earnings', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ confirmedProviderId: user.id, status: 'completed' }),
    enabled: !!user?.id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-earnings-reviews', user?.id],
    queryFn: () => api.entities.ProviderReview.filter({ providerId: user.id }),
    enabled: !!user?.id,
  });

  const totalGross = completedOrders.reduce((s, r) => s + parseFloat(r.agreedPrice || 0), 0);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-secondary/30 pb-10">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate('/provider')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Meus ganhos</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          {/* Summary card */}
          <div className="bg-primary rounded-2xl p-5 text-primary-foreground space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <p className="text-sm font-medium opacity-80">Total recebido</p>
            </div>
            <p className="text-4xl font-bold">R$ {fmt(totalGross)}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{completedOrders.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Serviços</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{avgRating ?? '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-0.5">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" /> Média
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-foreground">{reviews.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Avaliações</p>
            </div>
          </div>

          {/* Order list */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Histórico de pagamentos</p>
            </div>
            {completedOrders.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum serviço concluído ainda.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {completedOrders.map(req => {
                  const gross = parseFloat(req.agreedPrice || 0);
                  return (
                    <div key={req.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {req.title || req.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {req.clientName || 'Cliente'} · {formatDate(req.created_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-primary">R$ {fmt(gross)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
