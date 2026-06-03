import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  CircleDot,
  LifeBuoy,
  Loader2,
  MapPin,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Shield,
  UserRound,
  XCircle,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import AdminSectionNav from '@/components/AdminSectionNav';
import { toast } from '@/components/ui/use-toast';
import { ADMIN_EMAIL } from '@/components/AdminRoute';
import {
  formatSupportDate,
  formatSupportDateLong,
  getSupportEventTitle,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_CATEGORY_OPTIONS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS,
} from '@/lib/support';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: SUPPORT_STATUS_LABELS.open },
  { value: 'in_review', label: SUPPORT_STATUS_LABELS.in_review },
  { value: 'waiting_user', label: SUPPORT_STATUS_LABELS.waiting_user },
  { value: 'resolved', label: SUPPORT_STATUS_LABELS.resolved },
  { value: 'closed', label: SUPPORT_STATUS_LABELS.closed },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: SUPPORT_PRIORITY_LABELS.low },
  { value: 'medium', label: SUPPORT_PRIORITY_LABELS.medium },
  { value: 'high', label: SUPPORT_PRIORITY_LABELS.high },
  { value: 'urgent', label: SUPPORT_PRIORITY_LABELS.urgent },
];

function personLabel(user) {
  return user?.full_name || user?.fullName || user?.email || user?.id || 'Usuario';
}

function EventAttachmentList({ attachments }) {
  if (!attachments?.length) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {attachments.map((attachment) => (
        <a
          key={attachment}
          href={attachment}
          target="_blank"
          rel="noreferrer"
          className="overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-primary/40"
        >
          <img src={attachment} alt="Anexo do ticket" className="h-36 w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export default function AdminSupportDesk() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    city: '',
    relatedClientId: '',
    relatedProviderId: '',
  });
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [draftStatus, setDraftStatus] = useState('');
  const [draftPriority, setDraftPriority] = useState('medium');
  const [draftAssignedAdminId, setDraftAssignedAdminId] = useState('unassigned');
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);

  const currentAdminQuery = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => api.auth.me(),
  });

  const ticketsQuery = useQuery({
    queryKey: ['admin-support-tickets', filters],
    queryFn: () => api.support.list({
      _limit: 100,
      _sort: '-lastUpdatedAt',
      search: filters.search || undefined,
      status: filters.status || undefined,
      category: filters.category || undefined,
      city: filters.city || undefined,
      relatedClientId: filters.relatedClientId || undefined,
      relatedProviderId: filters.relatedProviderId || undefined,
    }),
  });

  const usersQuery = useQuery({
    queryKey: ['admin-support-users'],
    queryFn: () => api.entities.User.list('-created_date', 300),
  });

  const userProfilesQuery = useQuery({
    queryKey: ['admin-support-user-profiles'],
    queryFn: () => api.entities.UserProfile.list('-created_date', 300),
  });

  const providerProfilesQuery = useQuery({
    queryKey: ['admin-support-provider-profiles'],
    queryFn: () => api.entities.ProviderProfile.list('-created_date', 300),
  });

  const tickets = ticketsQuery.data?.items || [];

  useEffect(() => {
    if (tickets.length === 0) {
      setSelectedTicketId(null);
      return;
    }

    if (!selectedTicketId || !tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [selectedTicketId, tickets]);

  const selectedTicketQuery = useQuery({
    queryKey: ['admin-support-ticket', selectedTicketId],
    queryFn: () => api.support.get(selectedTicketId),
    enabled: !!selectedTicketId,
  });

  const ticketEventsQuery = useQuery({
    queryKey: ['admin-support-ticket-events', selectedTicketId],
    queryFn: () => api.support.listEvents(selectedTicketId),
    enabled: !!selectedTicketId,
  });

  const selectedTicket = selectedTicketQuery.data;
  const ticketEvents = ticketEventsQuery.data || [];

  useEffect(() => {
    if (!selectedTicket) return;
    setDraftStatus(selectedTicket.status || 'open');
    setDraftPriority(selectedTicket.priority || 'medium');
    setDraftAssignedAdminId(selectedTicket.assignedAdminId || 'unassigned');
    setReplyText('');
    setReplyFiles([]);
  }, [selectedTicket]);

  const users = usersQuery.data || [];
  const userProfiles = userProfilesQuery.data || [];
  const providerProfiles = providerProfilesQuery.data || [];

  const usersById = useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );

  const clientOptions = useMemo(() => {
    const clientIds = new Set(
      userProfiles
        .filter((profile) => profile.role === 'client' || profile.role === 'both')
        .map((profile) => profile.userId)
    );

    tickets.forEach((ticket) => {
      if (ticket.relatedClientId) clientIds.add(ticket.relatedClientId);
    });

    return Array.from(clientIds)
      .map((userId) => usersById.get(userId))
      .filter(Boolean)
      .sort((a, b) => personLabel(a).localeCompare(personLabel(b), 'pt-BR'))
      .map((user) => ({
        value: user.id,
        label: personLabel(user),
      }));
  }, [tickets, userProfiles, usersById]);

  const providerOptions = useMemo(() => {
    const providerIds = new Set(providerProfiles.map((profile) => profile.userId));

    userProfiles
      .filter((profile) => profile.role === 'provider' || profile.role === 'both')
      .forEach((profile) => providerIds.add(profile.userId));

    tickets.forEach((ticket) => {
      if (ticket.relatedProviderId) providerIds.add(ticket.relatedProviderId);
    });

    return Array.from(providerIds)
      .map((userId) => usersById.get(userId))
      .filter(Boolean)
      .sort((a, b) => personLabel(a).localeCompare(personLabel(b), 'pt-BR'))
      .map((user) => ({
        value: user.id,
        label: personLabel(user),
      }));
  }, [providerProfiles, tickets, userProfiles, usersById]);

  const adminOptions = useMemo(() => {
    return users
      .filter((user) => user.role === 'admin' || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())
      .sort((a, b) => personLabel(a).localeCompare(personLabel(b), 'pt-BR'))
      .map((user) => ({
        value: user.id,
        label: personLabel(user),
      }));
  }, [users]);

  const currentAdminId = currentAdminQuery.data?.id || '';
  const assignedAdminLabel = selectedTicket?.assignedAdminId
    ? personLabel(usersById.get(selectedTicket.assignedAdminId))
    : '';

  const statusCounts = useMemo(() => {
    return tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
  }, [tickets]);

  const updateTicketMutation = useMutation({
    mutationFn: (payload) => api.support.update(selectedTicketId, payload),
    onSuccess: () => {
      toast({
        title: 'Ticket atualizado',
        description: 'As informacoes da fila foram sincronizadas.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-events', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-events', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (error) => {
      toast({
        title: 'Nao foi possivel salvar',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTicket) return;
      const attachments = replyFiles.length > 0
        ? await Promise.all(replyFiles.map((file) => api.uploadFile(file)))
        : [];

      return api.support.reply(selectedTicket.id, {
        message: replyText.trim(),
        attachments,
      });
    },
    onSuccess: () => {
      setReplyText('');
      setReplyFiles([]);
      toast({
        title: 'Resposta enviada',
        description: 'A timeline do atendimento foi atualizada.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-events', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-events', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (error) => {
      toast({
        title: 'Nao foi possivel responder',
        description: error.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    },
  });

  const handleReplyFilesChange = (event) => {
    setReplyFiles(Array.from(event.target.files || []));
  };

  const handleSaveMeta = () => {
    if (!selectedTicket) return;
    updateTicketMutation.mutate({
      status: draftStatus,
      priority: draftPriority,
      assignedAdminId: draftAssignedAdminId === 'unassigned' ? '' : draftAssignedAdminId,
    });
  };

  const handleQuickStatus = (status) => {
    if (!selectedTicket) return;
    setDraftStatus(status);
    updateTicketMutation.mutate({
      status,
      priority: draftPriority,
      assignedAdminId: draftAssignedAdminId === 'unassigned' ? '' : draftAssignedAdminId,
    });
  };

  const handleAssignToMe = () => {
    if (!currentAdminId) return;
    setDraftAssignedAdminId(currentAdminId);
    updateTicketMutation.mutate({
      status: draftStatus,
      priority: draftPriority,
      assignedAdminId: currentAdminId,
    });
  };

  const handleSendReply = () => {
    if (!selectedTicket) return;
    if (!replyText.trim() && replyFiles.length === 0) {
      toast({
        title: 'Adicione uma resposta',
        description: 'Envie um texto, um anexo ou os dois.',
        variant: 'destructive',
      });
      return;
    }

    replyMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">Painel Admin</p>
                <p className="text-sm text-muted-foreground">Fila de suporte com contexto de cliente, prestador e pedido.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  ticketsQuery.refetch();
                  if (selectedTicketId) {
                    selectedTicketQuery.refetch();
                    ticketEventsQuery.refetch();
                  }
                }}
                className="rounded-xl border border-border p-2.5 transition-colors hover:bg-secondary/50"
                title="Atualizar"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
              <Link
                to="/"
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
              >
                Ir para inicio
              </Link>
            </div>
          </div>

          <AdminSectionNav />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tickets na fila"
            value={ticketsQuery.data?.total || tickets.length}
            hint="Total carregado nesta consulta"
          />
          <StatCard
            label="Abertos"
            value={(statusCounts.open || 0) + (statusCounts.in_review || 0)}
            hint="Abertos e em analise"
          />
          <StatCard
            label="Aguardando usuario"
            value={statusCounts.waiting_user || 0}
            hint="Esperando retorno de cliente ou prestador"
          />
          <StatCard
            label="Finalizados"
            value={(statusCounts.resolved || 0) + (statusCounts.closed || 0)}
            hint="Resolvidos ou encerrados"
          />
        </div>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <FilterField label="Busca geral">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Assunto, descricao ou nome"
                  className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </FilterField>

            <FilterField label="Status">
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Categoria">
              <select
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Todas as categorias</option>
                {SUPPORT_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Cliente">
              <select
                value={filters.relatedClientId}
                onChange={(event) => setFilters((current) => ({ ...current, relatedClientId: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Todos os clientes</option>
                {clientOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Prestador">
              <select
                value={filters.relatedProviderId}
                onChange={(event) => setFilters((current) => ({ ...current, relatedProviderId: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Todos os prestadores</option>
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Cidade">
              <input
                value={filters.city}
                onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))}
                placeholder="Ex.: Sao Paulo"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              />
            </FilterField>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {tickets.length} ticket(s) carregado(s) nesta visao.
            </p>
            <button
              onClick={() => setFilters({
                search: '',
                status: '',
                category: '',
                city: '',
                relatedClientId: '',
                relatedProviderId: '',
              })}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
            >
              Limpar filtros
            </button>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
          <section className="space-y-3">
            {ticketsQuery.isLoading ? (
              <div className="flex justify-center rounded-2xl border border-border bg-card py-12">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-primary" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
                <LifeBuoy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">Nenhum ticket encontrado</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ajuste os filtros ou aguarde novos chamados entrarem na fila.
                </p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const isActive = ticket.id === selectedTicketId;

                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SUPPORT_STATUS_COLORS[ticket.status] || 'bg-secondary text-muted-foreground'}`}>
                            {SUPPORT_STATUS_LABELS[ticket.status] || ticket.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {SUPPORT_CATEGORY_LABELS[ticket.category] || 'Categoria'} • Atualizado em {formatSupportDate(ticket.lastUpdatedAt || ticket.updated_date)}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        {SUPPORT_PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2.5 py-1">
                        <UserRound className="h-3 w-3" />
                        {ticket.requesterName || 'Sem nome'}
                      </span>
                      {ticket.relatedClientName ? (
                        <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                          Cliente: {ticket.relatedClientName}
                        </span>
                      ) : null}
                      {ticket.relatedProviderName ? (
                        <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                          Prestador: {ticket.relatedProviderName}
                        </span>
                      ) : null}
                      {ticket.citySnapshot ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2.5 py-1">
                          <MapPin className="h-3 w-3" />
                          {ticket.citySnapshot}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-foreground">
                      {ticket.lastResponsePreview || ticket.description}
                    </p>
                  </button>
                );
              })
            )}
          </section>

          <section className="space-y-5">
            {!selectedTicketId || selectedTicketQuery.isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
              </div>
            ) : !selectedTicket ? (
              <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
                <LifeBuoy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">Selecione um ticket</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Os detalhes do atendimento aparecem aqui.
                </p>
              </div>
            ) : (
              <>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ticket #{selectedTicket.id.slice(-6).toUpperCase()}
                      </p>
                      <h1 className="mt-2 text-xl font-bold text-foreground">{selectedTicket.subject}</h1>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{selectedTicket.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${SUPPORT_STATUS_COLORS[selectedTicket.status] || 'bg-secondary text-muted-foreground'}`}>
                        {SUPPORT_STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                      </span>
                      <span className="rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-foreground">
                        {SUPPORT_PRIORITY_LABELS[selectedTicket.priority] || selectedTicket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                      Solicitante: {selectedTicket.requesterName || 'Usuario'}
                    </span>
                    <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                      Papel: {selectedTicket.requesterRole === 'provider' ? 'Prestador' : selectedTicket.requesterRole === 'client' ? 'Cliente' : 'Admin'}
                    </span>
                    {selectedTicket.relatedClientName ? (
                      <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                        Cliente: {selectedTicket.relatedClientName}
                      </span>
                    ) : null}
                    {selectedTicket.relatedProviderName ? (
                      <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                        Prestador: {selectedTicket.relatedProviderName}
                      </span>
                    ) : null}
                    {selectedTicket.citySnapshot ? (
                      <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                        Cidade: {selectedTicket.citySnapshot}
                      </span>
                    ) : null}
                    {assignedAdminLabel ? (
                      <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                        Responsavel: {assignedAdminLabel}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-secondary/40 px-2.5 py-1">
                      Criado em {formatSupportDateLong(selectedTicket.created_date)}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTicket.relatedConversationId ? (
                      <Link
                        to={`/chat/${selectedTicket.relatedConversationId}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Abrir conversa
                      </Link>
                    ) : null}
                    {selectedTicket.relatedServiceRequestId ? (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground">
                        <ArrowUpRight className="h-4 w-4" />
                        Pedido #{selectedTicket.relatedServiceRequestId.slice(-6).toUpperCase()}
                      </span>
                    ) : null}
                    <button
                      onClick={() => handleQuickStatus('closed')}
                      disabled={selectedTicket.status === 'closed' || updateTicketMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Encerrar
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Gestao do atendimento</h2>
                      <p className="text-sm text-muted-foreground">Atualize fila, prioridade e responsavel.</p>
                    </div>

                    <button
                      onClick={handleAssignToMe}
                      disabled={!currentAdminId || updateTicketMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Atribuir a mim
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <FilterField label="Status">
                      <select
                        value={draftStatus}
                        onChange={(event) => setDraftStatus(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Prioridade">
                      <select
                        value={draftPriority}
                        onChange={(event) => setDraftPriority(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FilterField>

                    <FilterField label="Responsavel">
                      <select
                        value={draftAssignedAdminId}
                        onChange={(event) => setDraftAssignedAdminId(event.target.value)}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <option value="unassigned">Sem responsavel</option>
                        {adminOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FilterField>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={handleSaveMeta}
                      disabled={updateTicketMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleDot className="h-4 w-4" />}
                      Salvar ajustes
                    </button>
                    <button
                      onClick={() => handleQuickStatus('in_review')}
                      disabled={updateTicketMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Em analise
                    </button>
                    <button
                      onClick={() => handleQuickStatus('waiting_user')}
                      disabled={updateTicketMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aguardar usuario
                    </button>
                    <button
                      onClick={() => handleQuickStatus('resolved')}
                      disabled={updateTicketMutation.isPending}
                      className="rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Marcar resolvido
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
                      <p className="text-sm text-muted-foreground">Tudo o que ja aconteceu neste atendimento.</p>
                    </div>
                    <button
                      onClick={() => {
                        selectedTicketQuery.refetch();
                        ticketEventsQuery.refetch();
                      }}
                      className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
                    >
                      Atualizar
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {ticketEventsQuery.isLoading ? (
                      <div className="flex justify-center py-10">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-primary" />
                      </div>
                    ) : ticketEvents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhuma atualizacao registrada ainda.
                      </div>
                    ) : (
                      ticketEvents.map((event) => (
                        <div key={event.id} className="rounded-2xl border border-border bg-background p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{getSupportEventTitle(event)}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatSupportDateLong(event.created_date)}</p>
                            </div>
                            <span className="rounded-full bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                              {event.actorRole === 'admin' ? 'Suporte' : event.actorName || 'Usuario'}
                            </span>
                          </div>

                          {event.message ? (
                            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{event.message}</p>
                          ) : null}

                          <EventAttachmentList attachments={event.attachments} />
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  {selectedTicket.status === 'closed' ? (
                    <div className="rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
                      <p className="text-sm font-semibold text-foreground">Ticket encerrado</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Reabra o status antes de enviar novas mensagens por aqui.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">Responder ticket</h2>
                        <p className="text-sm text-muted-foreground">Envie contexto, orientacao ou solicite novas evidencias.</p>
                      </div>

                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Escreva a resposta da equipe de suporte."
                        rows={5}
                        className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                      />

                      <div className="mt-3 space-y-3">
                        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-background px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
                          <span className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            Anexar imagens
                          </span>
                          <span>{replyFiles.length > 0 ? `${replyFiles.length} arquivo(s)` : 'Opcional'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleReplyFilesChange}
                          />
                        </label>

                        {replyFiles.length > 0 ? (
                          <div className="space-y-2">
                            {replyFiles.map((file) => (
                              <div
                                key={`${file.name}-${file.lastModified}`}
                                className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs text-foreground"
                              >
                                {file.name}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Depois de responder, a fila e a timeline sao atualizadas automaticamente.
                        </p>
                        <button
                          onClick={handleSendReply}
                          disabled={replyMutation.isPending}
                          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          {replyMutation.isPending ? 'Enviando...' : 'Enviar resposta'}
                        </button>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
