import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronRight, Filter, Menu, SlidersHorizontal } from 'lucide-react';
import AdminBottomNav from '@/components/AdminBottomNav';
import {
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS,
} from '@/lib/support';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `Há ${h}h`;
  return `Há ${Math.floor(h / 24)}d`;
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
  'bg-teal-500', 'bg-rose-500', 'bg-indigo-500',
];

function avatarColor(name = '') {
  const code = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

const TAB_STATUS = {
  all:         null,
  open:        ['open'],
  inprogress:  ['in_review', 'waiting_user'],
  resolved:    ['resolved', 'closed'],
};

const TABS = [
  { key: 'all',        label: 'Todos' },
  { key: 'open',       label: 'Abertos' },
  { key: 'inprogress', label: 'Em andamento' },
  { key: 'resolved',   label: 'Concluídos' },
];

export default function AdminSupportDesk() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['admin-support-tickets-list'],
    queryFn: () => api.support.list({ _limit: 100, _sort: '-lastUpdatedAt' }),
    staleTime: 30_000,
  });

  const tickets = ticketsData?.items || [];

  const tabCounts = useMemo(() => {
    const counts = { all: tickets.length, open: 0, inprogress: 0, resolved: 0 };
    tickets.forEach((t) => {
      if (['open'].includes(t.status)) counts.open++;
      else if (['in_review', 'waiting_user'].includes(t.status)) counts.inprogress++;
      else if (['resolved', 'closed'].includes(t.status)) counts.resolved++;
    });
    return counts;
  }, [tickets]);

  const filtered = useMemo(() => {
    const allowed = TAB_STATUS[activeTab];
    if (!allowed) return tickets;
    return tickets.filter((t) => allowed.includes(t.status));
  }, [tickets, activeTab]);

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-base font-bold text-foreground">Chamados</h1>
        </div>
        <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border px-4 py-2.5 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          const count = tabCounts[key];
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {label}
              <span className={`text-[10px] font-bold ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="max-w-md mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Filter className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhum chamado encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">Tente outro filtro ou aguarde novos chamados</p>
          </div>
        ) : (
          <div className="divide-y divide-border bg-card">
            {filtered.map((ticket) => {
              const initial = (ticket.requesterName || '?')[0].toUpperCase();
              const bg = avatarColor(ticket.requesterName || '');
              const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] || ticket.status;
              const statusColor = SUPPORT_STATUS_COLORS[ticket.status] || 'bg-secondary text-muted-foreground';

              return (
                <button
                  key={ticket.id}
                  onClick={() => navigate(`/admin/support/${ticket.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-secondary/20 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <span className="text-sm font-bold text-white">{initial}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {ticket.requesterName || 'Usuário'}
                      </p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ticket.subject}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {statusLabel} • {timeAgo(ticket.lastUpdatedAt || ticket.updated_date)}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AdminBottomNav active="tickets" />
    </div>
  );
}
