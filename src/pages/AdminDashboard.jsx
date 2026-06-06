import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import {
  Bell, Menu, Users, UserCheck, MessageSquare, CheckCircle,
  ChevronRight, BarChart2, LayoutGrid, AlertTriangle,
} from 'lucide-react';
import AdminBottomNav from '@/components/AdminBottomNav';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Há ${h}h`;
  return `Há ${Math.floor(h / 24)}d`;
}

function MetricCard({ label, value, icon: Icon, iconBg }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value ?? '—'}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function Shortcut({ label, description, icon: Icon, onClick, urgent }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 transition-colors text-left ${urgent ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-secondary/30'}`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${urgent ? 'bg-red-100' : 'bg-primary/10'}`}>
        <Icon className={`w-5 h-5 ${urgent ? 'text-red-600' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${urgent ? 'text-red-800' : 'text-foreground'}`}>{label}</p>
        <p className={`text-xs ${urgent ? 'text-red-600' : 'text-muted-foreground'}`}>{description}</p>
      </div>
      <ChevronRight className={`w-4 h-4 shrink-0 ${urgent ? 'text-red-400' : 'text-muted-foreground'}`} />
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-stats', 'São José do Rio Preto'],
    queryFn: () => api.admin.stats('São José do Rio Preto'),
    staleTime: 60_000,
  });

  const { data: ticketsData } = useQuery({
    queryKey: ['admin-support-tickets-brief'],
    queryFn: () => api.support.list({ _limit: 5, _sort: '-lastUpdatedAt', status: 'open' }),
    staleTime: 30_000,
  });

  const openCount = stats?.operations?.ticketsOpen ?? 0;
  const badgeCount = openCount > 0 ? (openCount > 99 ? '99+' : String(openCount)) : null;

  const shortcuts = [
    { label: 'Pedidos em Risco', description: 'Sem proposta, ignorados ou parados', icon: AlertTriangle, to: '/admin/at-risk', urgent: true },
    { label: 'Ver todos os chamados', description: 'Acompanhe e gerencie', icon: MessageSquare, to: '/admin/support' },
    { label: 'Usuários', description: 'Gerencie usuários da plataforma', icon: Users, to: '/admin/users' },
    { label: 'Prestadores', description: 'Gerencie prestadores', icon: UserCheck, to: '/admin/users' },
    { label: 'Serviços', description: 'Categorias e serviços', icon: LayoutGrid, to: '/diagnostics' },
    { label: 'Relatórios', description: 'Métricas e indicadores', icon: BarChart2, to: '/diagnostics' },
  ];

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">Painel de controle</h1>
        </div>
        <button className="relative p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {badgeCount && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {badgeCount}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Usuários"
            value={stats?.overview?.clientsTotal?.toLocaleString('pt-BR')}
            icon={Users}
            iconBg="bg-blue-50"
          />
          <MetricCard
            label="Prestadores"
            value={stats?.overview?.providersTotal?.toLocaleString('pt-BR')}
            icon={UserCheck}
            iconBg="bg-purple-50"
          />
          <MetricCard
            label="Chamados abertos"
            value={stats?.operations?.ticketsOpen}
            icon={MessageSquare}
            iconBg="bg-orange-50"
          />
          <MetricCard
            label="Chamados resolvidos"
            value={stats?.operations?.ticketsResolved}
            icon={CheckCircle}
            iconBg="bg-green-50"
          />
        </div>

        {/* Atalhos rápidos */}
        <div>
          <p className="text-sm font-bold text-foreground mb-3">Atalhos rápidos</p>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {shortcuts.map((s) => (
              <Shortcut
                key={s.label}
                label={s.label}
                description={s.description}
                icon={s.icon}
                urgent={s.urgent}
                onClick={() => navigate(s.to)}
              />
            ))}
          </div>
        </div>

        {/* Chamados recentes */}
        {ticketsData?.items?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-foreground">Chamados recentes</p>
              <button
                onClick={() => navigate('/admin/support')}
                className="text-xs text-primary font-medium"
              >
                Ver todos
              </button>
            </div>
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              {ticketsData.items.slice(0, 3).map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => navigate(`/admin/support/${ticket.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/20 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                    {(ticket.requesterName || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ticket.requesterName || 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(ticket.lastUpdatedAt || ticket.updated_date)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <AdminBottomNav active="home" />
    </div>
  );
}
