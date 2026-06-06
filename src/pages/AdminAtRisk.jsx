import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { AlertTriangle, Clock, MessageSquare, ChevronRight, RefreshCw, ArrowLeft } from 'lucide-react';
import AdminBottomNav from '@/components/AdminBottomNav';

function minutesToLabel(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function RiskCard({ item, urgency, onView }) {
  const borderColor = urgency === 'high' ? 'border-red-200' : urgency === 'medium' ? 'border-orange-200' : 'border-yellow-200';
  const badgeBg = urgency === 'high' ? 'bg-red-50 text-red-600' : urgency === 'medium' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600';
  const dotColor = urgency === 'high' ? 'bg-red-500' : urgency === 'medium' ? 'bg-orange-500' : 'bg-yellow-500';

  return (
    <button
      onClick={onView}
      className={`w-full flex items-start gap-3 p-4 bg-card border ${borderColor} rounded-xl hover:bg-secondary/20 transition-colors text-left`}
    >
      <div className={`w-2 h-2 rounded-full ${dotColor} mt-2 shrink-0`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{item.title || 'Pedido sem título'}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {item.category && (
            <span className="text-xs text-muted-foreground">{item.category}</span>
          )}
          {item.city && (
            <span className="text-xs text-muted-foreground">• {item.city}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${badgeBg}`}>
            {item.proposalCount != null
              ? item.proposalCount === 0
                ? `Sem proposta há ${minutesToLabel(item.minutesOpen)}`
                : `${item.proposalCount} proposta${item.proposalCount > 1 ? 's' : ''} ignorada${item.proposalCount > 1 ? 's' : ''} há ${minutesToLabel(item.minutesSinceUpdate)}`
              : `Parado há ${minutesToLabel(item.minutesSinceUpdate)}`
            }
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

function Section({ title, subtitle, icon: Icon, iconBg, items, urgency, onView, emptyText }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{title}</p>
            {items.length > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                urgency === 'high' ? 'bg-red-500 text-white' :
                urgency === 'medium' ? 'bg-orange-500 text-white' :
                'bg-yellow-500 text-white'
              }`}>
                {items.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl px-4 py-3">
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <RiskCard key={item.id} item={item} urgency={urgency} onView={() => onView(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAtRisk() {
  const navigate = useNavigate();

  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['admin-at-risk'],
    queryFn: () => api.admin.atRisk(),
    staleTime: 2 * 60_000,
    refetchInterval: 2 * 60_000,
  });

  const noProposals = data?.no_proposals ?? [];
  const ignoredProposals = data?.ignored_proposals ?? [];
  const stalled = data?.stalled ?? [];
  const total = noProposals.length + ignoredProposals.length + stalled.length;

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  const goToRequest = (id) => navigate(`/admin/request/${id}`);

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/admin/dashboard')}
          className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">Pedidos em Risco</p>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">Atualizado às {lastUpdate}</p>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl hover:bg-secondary/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-5">

        {/* Resumo */}
        {!isLoading && total === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center mb-6">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-bold text-green-800 text-sm">Nenhum pedido em risco</p>
            <p className="text-xs text-green-700 mt-1">Todos os pedidos estão ativos e dentro do prazo esperado.</p>
          </div>
        ) : total > 0 ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">{total} pedido{total > 1 ? 's' : ''} precisa{total === 1 ? '' : 'm'} de atenção</p>
              <p className="text-xs text-red-700 mt-0.5">Atualização automática a cada 2 minutos.</p>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <Section
              title="Sem proposta"
              subtitle="Abertos há +30 min sem nenhum prestador interessado"
              icon={AlertTriangle}
              iconBg="bg-red-100 text-red-600"
              items={noProposals}
              urgency="high"
              onView={goToRequest}
              emptyText="Nenhum pedido sem proposta no momento."
            />

            <Section
              title="Propostas ignoradas"
              subtitle="Cliente recebeu propostas mas não respondeu há +3h"
              icon={Clock}
              iconBg="bg-orange-100 text-orange-600"
              items={ignoredProposals}
              urgency="medium"
              onView={goToRequest}
              emptyText="Nenhum cliente ignorando propostas no momento."
            />

            <Section
              title="Conversa parada"
              subtitle="Em conversa mas sem atividade há +3h"
              icon={MessageSquare}
              iconBg="bg-yellow-100 text-yellow-600"
              items={stalled}
              urgency="low"
              onView={goToRequest}
              emptyText="Nenhuma conversa parada no momento."
            />
          </>
        )}
      </div>

      <AdminBottomNav active="dashboard" />
    </div>
  );
}
