import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList, MapPin, Clock, ChevronRight,
  Plus, Headphones, CheckCircle2, Star,
} from 'lucide-react';
import ClientBottomNav from '@/components/ClientBottomNav';

const STATUS_CONFIG = {
  open: {
    getBadge: () => 'Procurando profissional',
    badgeClass: 'bg-orange-50 text-orange-500 border border-orange-200',
    nextStep: 'Próxima etapa: receber propostas de profissionais',
    nextStepDotClass: 'bg-orange-400',
    actionLabel: 'Ver detalhes',
  },
  in_conversation: {
    getBadge: (count) =>
      count > 0
        ? `${count} proposta${count !== 1 ? 's' : ''} recebida${count !== 1 ? 's' : ''}`
        : 'Propostas recebidas',
    badgeClass: 'bg-blue-50 text-blue-600 border border-blue-200',
    nextStep: 'Próxima etapa: escolher um profissional',
    nextStepDotClass: 'bg-blue-500',
    actionLabel: 'Ver propostas',
  },
  agreed: {
    getBadge: () => 'Profissional selecionado',
    badgeClass: 'bg-teal-50 text-teal-600 border border-teal-200',
    nextStep: 'Aguardando execução do serviço',
    nextStepDotClass: 'bg-teal-500',
    actionLabel: 'Ver detalhes',
  },
  completed: {
    getBadge: () => 'Concluído',
    badgeClass: 'bg-green-50 text-green-600 border border-green-200',
    nextStep: null,
    actionLabel: 'Ver detalhes',
    isCompleted: true,
  },
  cancelled: {
    getBadge: () => 'Cancelado',
    badgeClass: 'bg-gray-100 text-gray-500 border border-gray-200',
    nextStep: null,
    actionLabel: 'Ver detalhes',
    isCancelled: true,
  },
};

const TABS = [
  { key: 'all',       label: 'Todos' },
  { key: 'open',      label: 'Abertos' },
  { key: 'active',    label: 'Em andamento' },
  { key: 'completed', label: 'Concluídos' },
  { key: 'cancelled', label: 'Cancelados' },
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

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Criado agora';
  if (mins < 60) return `Criado há ${mins} minuto${mins !== 1 ? 's' : ''}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Criado há ${hours} hora${hours !== 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Criado há ${days} dia${days !== 1 ? 's' : ''}`;
  return `Criado há ${Math.floor(days / 30)} ${Math.floor(days / 30) !== 1 ? 'meses' : 'mês'}`;
}

function formatCompletedDate(dateStr) {
  if (!dateStr) return 'Serviço finalizado';
  const d = new Date(dateStr);
  return `Concluído em ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ClientOrders() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    api.auth.me().then((u) => setUserId(u.id)).catch(() => navigate('/'));
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-orders', userId],
    queryFn: () => api.entities.ServiceRequest.filter({ created_by_id: userId }, '-created_date'),
    enabled: !!userId,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['client-conversations', userId],
    queryFn: () => api.entities.Conversation.filter({ clientId: userId }),
    enabled: !!userId,
  });

  const proposalCounts = {};
  conversations.forEach((conv) => {
    if (conv.serviceRequestId) {
      proposalCounts[conv.serviceRequestId] = (proposalCounts[conv.serviceRequestId] || 0) + 1;
    }
  });

  const filteredRequests = requests.filter((r) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return r.status === 'open';
    if (activeTab === 'active') return r.status === 'in_conversation' || r.status === 'agreed';
    if (activeTab === 'completed') return r.status === 'completed';
    if (activeTab === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <img src="/onboarding-city.png" alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">Servi<span className="text-primary font-bold">Local</span></span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Meus pedidos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Acompanhe o andamento dos seus pedidos.</p>
          </div>
          <Link
            to="/client/new-request"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Novo pedido
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3 max-w-md mx-auto">
        {/* Pending rating reminder */}
        {(() => {
          const pending = requests.filter(r => r.status === 'completed' && (!r.ratingStatus || r.ratingStatus === 'PENDING'));
          if (!pending.length) return null;
          return (
            <button
              onClick={() => navigate(`/client/request/${pending[0].id}/rate`)}
              className="w-full flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-left hover:bg-yellow-100/70 transition-colors"
            >
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-800 flex-1 font-medium">
                {pending.length === 1
                  ? 'Você tem um atendimento para avaliar.'
                  : `Você tem ${pending.length} atendimentos para avaliar.`}
              </p>
              <ChevronRight className="w-4 h-4 text-yellow-500 shrink-0" />
            </button>
          );
        })()}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
            <Link to="/client/new-request" className="mt-4 inline-block text-sm font-medium text-primary hover:opacity-80">
              Criar novo pedido →
            </Link>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const config = STATUS_CONFIG[req.status] || STATUS_CONFIG.open;
            const catStyle = getCategoryStyle(`${req.category || ''} ${req.title || ''}`);
            const count = proposalCounts[req.id] || 0;

            return (
              <div key={req.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {/* Card row */}
                <button
                  onClick={() => {
                    if (req.status === 'in_conversation') return navigate(`/client/request/${req.id}/proposals`);
                    if (req.status === 'agreed') return navigate(`/client/request/${req.id}/progress`);
                    navigate(`/client/request/${req.id}`);
                  }}
                  className="w-full flex items-center gap-3 p-4 hover:bg-secondary/20 transition-colors text-left"
                >
                  <div className={`w-12 h-12 rounded-xl ${catStyle.bg} flex items-center justify-center shrink-0`}>
                    <span className="text-xl leading-none">{catStyle.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">{req.title}</p>
                      <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${config.badgeClass}`}>
                        {config.getBadge(count)}
                      </span>
                    </div>
                    {req.city && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground">{req.city}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{timeAgo(req.created_date)}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                </button>

                {/* Footer bar */}
                {config.isCompleted ? (
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between bg-green-50/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-xs text-green-600 font-medium">
                        {formatCompletedDate(req.updated_date)}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/client/request/${req.id}`)}
                      className="text-xs text-primary font-semibold hover:opacity-80"
                    >
                      Ver detalhes
                    </button>
                  </div>
                ) : !config.isCancelled && config.nextStep ? (
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${config.nextStepDotClass}`} />
                      <span className="text-xs text-muted-foreground truncate">{config.nextStep}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (req.status === 'in_conversation') return navigate(`/client/request/${req.id}/proposals`);
                        if (req.status === 'agreed') return navigate(`/client/request/${req.id}/progress`);
                        navigate(`/client/request/${req.id}`);
                      }}
                      className="shrink-0 ml-3 px-3 py-1.5 border border-primary/30 text-xs text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
                    >
                      {config.actionLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}

        {/* Help card */}
        <button
          onClick={() => navigate('/client/help')}
          className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:bg-secondary/20 transition-colors text-left shadow-sm"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">Precisa de ajuda?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fale com nossa equipe de suporte.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      <ClientBottomNav active="orders" />
    </div>
  );
}
