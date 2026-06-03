import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Shield, RefreshCw, Download, Users, Star, MessageSquare,
  ClipboardList, CheckCircle, XCircle, AlertTriangle, Clock,
  MapPin, TrendingUp, Activity, BarChart2, Ticket, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PILOT_CITIES = ['São José do Rio Preto', 'São Paulo', 'Campinas'];

function fmt(val, suffix = '') {
  if (val == null) return '—';
  return `${val}${suffix}`;
}

function fmtHours(h) {
  if (h == null) return '—';
  if (h < 1) return '< 1h';
  if (h < 24) return `${Math.round(h)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  return rem > 0 ? `${d}d ${rem}h` : `${d}d`;
}

function goalColor(current, target) {
  if (current >= target) return 'bg-green-500';
  if (current >= Math.round(target * 0.7)) return 'bg-blue-500';
  if (current >= Math.round(target * 0.37)) return 'bg-yellow-500';
  return 'bg-red-500';
}

function goalLabel(current, target) {
  if (current >= target) return { text: 'Meta atingida', cls: 'text-green-600' };
  if (current >= Math.round(target * 0.7)) return { text: 'Próximo da meta', cls: 'text-blue-600' };
  if (current >= Math.round(target * 0.37)) return { text: 'Em crescimento', cls: 'text-yellow-600' };
  return { text: 'Início de operação', cls: 'text-red-600' };
}

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <p className={`text-2xl font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FunnelStage({ label, count, pct, isLast }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div className="w-full bg-card border border-border rounded-xl p-3 text-center">
        <p className="text-xl font-bold text-foreground">{fmt(count)}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {pct != null && <p className="text-xs font-medium text-primary mt-1">{pct}% do total</p>}
      </div>
      {!isLast && <ChevronRight className="w-4 h-4 text-muted-foreground mt-2 rotate-90 sm:rotate-0" />}
    </div>
  );
}

function ValidationRow({ label, current, target, unit = '', met }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      {met
        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <span className={`text-sm font-semibold ${met ? 'text-green-600' : 'text-red-600'}`}>
        {current}{unit} <span className="text-muted-foreground font-normal">/ {target}{unit}</span>
      </span>
    </div>
  );
}

function exportCSV(stats, city) {
  if (!stats) return;
  const rows = [
    ['Seção', 'Métrica', 'Valor'],
    ['Visão Geral', 'Prestadores cadastrados', stats.overview.providersTotal],
    ['Visão Geral', 'Prestadores ativos (7d)', stats.overview.providersActive7d],
    ['Visão Geral', 'Clientes cadastrados', stats.overview.clientsTotal],
    ['Visão Geral', 'Pedidos criados', stats.overview.ordersTotal],
    ['Visão Geral', 'Pedidos concluídos', stats.overview.ordersCompleted],
    ['Visão Geral', 'Conversas iniciadas', stats.overview.conversationsTotal],
    ['Visão Geral', 'Avaliações', stats.overview.reviewsTotal],
    ['Funil', 'Pedidos criados', stats.funnel.ordersCreated],
    ['Funil', 'Com proposta', stats.funnel.ordersWithProposal],
    ['Funil', 'Conversas iniciadas', stats.funnel.conversationsStarted],
    ['Funil', 'Serviços concluídos', stats.funnel.servicesCompleted],
    ['Funil', 'Taxa pedido → proposta', `${stats.funnel.rates.orderToProposal}%`],
    ['Funil', 'Taxa proposta → conversa', `${stats.funnel.rates.proposalToConversation}%`],
    ['Funil', 'Taxa conversa → conclusão', `${stats.funnel.rates.conversationToCompletion}%`],
    ['Funil', 'Taxa pedido → conclusão', `${stats.funnel.rates.orderToCompletion}%`],
    ['Velocidade', 'Tempo médio 1ª proposta (h)', stats.velocity.avgTimeToFirstProposal ?? '—'],
    ['Velocidade', 'Tempo médio 1ª conversa (h)', stats.velocity.avgTimeToFirstConversation ?? '—'],
    ['Velocidade', 'Tempo médio conclusão (h)', stats.velocity.avgTimeToCompletion ?? '—'],
    ['Velocidade', 'Pedidos sem proposta +24h', stats.velocity.ordersWithoutProposal24h],
    ['Velocidade', 'Pedidos sem proposta +48h', stats.velocity.ordersWithoutProposal48h],
    ['Prestadores', 'Ativos 7d', stats.providerHealth.active7d],
    ['Prestadores', 'Ativos 30d', stats.providerHealth.active30d],
    ['Prestadores', 'Inativos +30d', stats.providerHealth.inactive30d],
    ['Prestadores', 'Média de avaliações', stats.providerHealth.avgRating ?? '—'],
    ['Clientes', 'Ativos 30d', stats.clientHealth.active30d],
    ['Clientes', 'Recorrentes', stats.clientHealth.recurring],
    ['Clientes', 'Com múltiplos concluídos', stats.clientHealth.withMultipleCompleted],
    ['Operações', 'Tickets abertos', stats.operations.ticketsOpen],
    ['Operações', 'Tickets em análise', stats.operations.ticketsInProgress],
    ['Operações', 'Tickets resolvidos', stats.operations.ticketsResolved],
    [`Cidade: ${city}`, 'Prestadores ativos (30d)', stats.pilotCity.providersActive],
    [`Cidade: ${city}`, 'Clientes ativos (30d)', stats.pilotCity.clientsActive],
    [`Cidade: ${city}`, 'Pedidos criados', stats.pilotCity.ordersCreated],
    [`Cidade: ${city}`, 'Pedidos concluídos', stats.pilotCity.ordersCompleted],
    [`Cidade: ${city}`, 'Taxa de conversão', `${stats.pilotCity.conversion}%`],
    ['Validação', 'Marketplace validado', stats.validation.isValidated ? 'Sim' : 'Não'],
  ];
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `servilocal-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const [city, setCity] = useState('São José do Rio Preto');

  const { data: stats, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-stats', city],
    queryFn: () => api.admin.stats(city),
    staleTime: 60_000,
  });

  const updatedAt = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-foreground">Painel Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/users" className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-secondary/50 text-foreground">Usuários</Link>
          <Link to="/diagnostics" className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-secondary/50 text-foreground">Diagnóstico</Link>
          <Link to="/" className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-secondary/50 text-foreground">← Início</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Page title + controls */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Dashboard Executivo
            </h1>
            {updatedAt && <p className="text-xs text-muted-foreground mt-0.5">Atualizado às {updatedAt}</p>}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {PILOT_CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <button
              onClick={() => exportCSV(stats, city)}
              disabled={!stats}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary/50 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg border border-border hover:bg-secondary/50"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isError && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Erro ao carregar dados: {error?.message || 'Tente atualizar.'}
          </div>
        )}

        {isLoading && !stats && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {stats && (
          <>
            {/* ── Visão Geral ─────────────────────────────────────────── */}
            <Section title="Visão Geral" icon={Activity}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Prestadores cadastrados" value={fmt(stats.overview.providersTotal)} />
                <StatCard label="Prestadores ativos (7d)" value={fmt(stats.overview.providersActive7d)} accent />
                <StatCard label="Clientes cadastrados" value={fmt(stats.overview.clientsTotal)} />
                <StatCard label="Pedidos criados" value={fmt(stats.overview.ordersTotal)} />
                <StatCard label="Pedidos concluídos" value={fmt(stats.overview.ordersCompleted)} />
                <StatCard label="Conversas iniciadas" value={fmt(stats.overview.conversationsTotal)} />
                <StatCard label="Avaliações realizadas" value={fmt(stats.overview.reviewsTotal)} />
              </div>
            </Section>

            {/* ── Funil Principal ─────────────────────────────────────── */}
            <Section title="Funil Principal" icon={TrendingUp}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 sm:gap-1">
                <FunnelStage
                  label="Pedidos Criados"
                  count={stats.funnel.ordersCreated}
                  pct={100}
                />
                <div className="hidden sm:flex flex-col items-center justify-center gap-1 px-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">{stats.funnel.rates.orderToProposal}%</span>
                </div>
                <FunnelStage
                  label="Com Proposta"
                  count={stats.funnel.ordersWithProposal}
                  pct={stats.funnel.rates.orderToProposal}
                />
                <div className="hidden sm:flex flex-col items-center justify-center gap-1 px-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">{stats.funnel.rates.proposalToConversation}%</span>
                </div>
                <FunnelStage
                  label="Conversas Iniciadas"
                  count={stats.funnel.conversationsStarted}
                  pct={stats.funnel.rates.orderToCompletion > 0 ? Math.round(stats.funnel.conversationsStarted / (stats.funnel.ordersCreated || 1) * 100) : null}
                />
                <div className="hidden sm:flex flex-col items-center justify-center gap-1 px-1">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-primary">{stats.funnel.rates.conversationToCompletion}%</span>
                </div>
                <FunnelStage
                  label="Serviços Concluídos"
                  count={stats.funnel.servicesCompleted}
                  pct={stats.funnel.rates.orderToCompletion}
                  isLast
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-foreground">{stats.funnel.rates.orderToProposal}%</p>
                  <p className="text-xs text-muted-foreground">Pedido → Proposta</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-foreground">{stats.funnel.rates.proposalToConversation}%</p>
                  <p className="text-xs text-muted-foreground">Proposta → Conversa</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-foreground">{stats.funnel.rates.conversationToCompletion}%</p>
                  <p className="text-xs text-muted-foreground">Conversa → Conclusão</p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-2 text-center">
                  <p className="text-sm font-semibold text-foreground">{stats.funnel.rates.orderToCompletion}%</p>
                  <p className="text-xs text-muted-foreground">Pedido → Conclusão</p>
                </div>
              </div>
            </Section>

            {/* ── Velocidade ──────────────────────────────────────────── */}
            <Section title="Velocidade do Marketplace" icon={Clock}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <StatCard label="Tempo médio 1ª proposta" value={fmtHours(stats.velocity.avgTimeToFirstProposal)} />
                <StatCard label="Tempo médio 1ª conversa" value={fmtHours(stats.velocity.avgTimeToFirstConversation)} />
                <StatCard label="Tempo médio conclusão" value={fmtHours(stats.velocity.avgTimeToCompletion)} />
              </div>
              <div className="space-y-2">
                {stats.velocity.ordersWithoutProposal24h > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                    <span className="text-sm text-yellow-800">
                      <strong>{stats.velocity.ordersWithoutProposal24h}</strong> pedido(s) aberto(s) há mais de 24h sem proposta
                    </span>
                  </div>
                )}
                {stats.velocity.ordersWithoutProposal48h > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span className="text-sm text-red-800">
                      <strong>{stats.velocity.ordersWithoutProposal48h}</strong> pedido(s) aberto(s) há mais de 48h sem proposta
                    </span>
                  </div>
                )}
                {stats.velocity.ordersWithoutProposal24h === 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-800">Nenhum pedido parado sem proposta — ótimo sinal!</span>
                  </div>
                )}
              </div>
            </Section>

            {/* ── Meta CEO ────────────────────────────────────────────── */}
            <Section title="Meta do CEO" icon={TrendingUp}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">30 Prestadores Ativos (últimos 7 dias)</p>
                    <p className={`text-xs font-medium mt-0.5 ${goalLabel(stats.ceoGoal.current, stats.ceoGoal.target).cls}`}>
                      {goalLabel(stats.ceoGoal.current, stats.ceoGoal.target).text}
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-foreground">{stats.ceoGoal.current}<span className="text-base text-muted-foreground">/{stats.ceoGoal.target}</span></span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${goalColor(stats.ceoGoal.current, stats.ceoGoal.target)}`}
                    style={{ width: `${Math.min(100, Math.round(stats.ceoGoal.current / stats.ceoGoal.target * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span className="text-yellow-600">10</span>
                  <span className="text-yellow-600">20</span>
                  <span className="text-blue-600">29</span>
                  <span className="text-green-600">30</span>
                </div>
              </div>
            </Section>

            {/* ── Validação ───────────────────────────────────────────── */}
            <Section title="Indicadores de Validação" icon={CheckCircle}>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                  {stats.validation.isValidated
                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                    : <XCircle className="w-5 h-5 text-red-500" />}
                  <span className="font-semibold text-foreground">
                    Marketplace {stats.validation.isValidated ? 'validado ✓' : 'ainda não validado'}
                  </span>
                </div>
                <ValidationRow label="30+ prestadores ativos (7d)" current={stats.validation.criteria.activeProviders.current} target={stats.validation.criteria.activeProviders.target} met={stats.validation.criteria.activeProviders.met} />
                <ValidationRow label="≥ 70% dos pedidos recebem proposta" current={stats.validation.criteria.proposalRate.current} target={stats.validation.criteria.proposalRate.target} unit="%" met={stats.validation.criteria.proposalRate.met} />
                <ValidationRow label="≥ 50% dos pedidos geram conversa" current={stats.validation.criteria.conversationRate.current} target={stats.validation.criteria.conversationRate.target} unit="%" met={stats.validation.criteria.conversationRate.met} />
                <ValidationRow label="≥ 20 serviços concluídos" current={stats.validation.criteria.completedServices.current} target={stats.validation.criteria.completedServices.target} met={stats.validation.criteria.completedServices.met} />
              </div>
            </Section>

            {/* ── Cidade Piloto ────────────────────────────────────────── */}
            <Section title={`Cidade Piloto — ${stats.pilotCity.name}`} icon={MapPin}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Prestadores ativos (30d)" value={fmt(stats.pilotCity.providersActive)} accent />
                <StatCard label="Clientes ativos (30d)" value={fmt(stats.pilotCity.clientsActive)} />
                <StatCard label="Pedidos criados" value={fmt(stats.pilotCity.ordersCreated)} />
                <StatCard label="Pedidos concluídos" value={fmt(stats.pilotCity.ordersCompleted)} />
                <StatCard label="Conversão" value={fmt(stats.pilotCity.conversion, '%')} />
              </div>
            </Section>

            {/* ── Saúde dos Prestadores ───────────────────────────────── */}
            <Section title="Saúde dos Prestadores" icon={Users}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Ativos (7d)" value={fmt(stats.providerHealth.active7d)} accent />
                <StatCard label="Ativos (30d)" value={fmt(stats.providerHealth.active30d)} />
                <StatCard label="Inativos +30d" value={fmt(stats.providerHealth.inactive30d)} />
                <StatCard label="Média de avaliações" value={stats.providerHealth.avgRating != null ? `${stats.providerHealth.avgRating} ★` : '—'} />
                <StatCard label="Com denúncias" value={fmt(stats.providerHealth.withReports)} />
              </div>
            </Section>

            {/* ── Saúde dos Clientes ──────────────────────────────────── */}
            <Section title="Saúde dos Clientes" icon={Activity}>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Ativos (30d)" value={fmt(stats.clientHealth.active30d)} accent />
                <StatCard label="Recorrentes" value={fmt(stats.clientHealth.recurring)} />
                <StatCard label="Com múltiplos concluídos" value={fmt(stats.clientHealth.withMultipleCompleted)} />
              </div>
            </Section>

            {/* ── Operações ───────────────────────────────────────────── */}
            <Section title="Operações" icon={Ticket}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <StatCard label="Tickets abertos" value={fmt(stats.operations.ticketsOpen)} />
                <StatCard label="Tickets em análise" value={fmt(stats.operations.ticketsInProgress)} />
                <StatCard label="Tickets resolvidos" value={fmt(stats.operations.ticketsResolved)} />
                <StatCard label="Denúncias abertas" value={fmt(stats.operations.reportsOpen)} />
                <StatCard label="Usuários bloqueados" value={fmt(stats.operations.blockedUsers)} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
