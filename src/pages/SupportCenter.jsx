import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, LifeBuoy, Plus, RefreshCw } from 'lucide-react';
import { api } from '@/api/apiClient';
import SupportTicketComposerDialog from '@/components/SupportTicketComposerDialog';
import {
  formatSupportDate,
  getConversationCounterpart,
  getSupportRequestOptionLabel,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS,
  supportBasePath,
  supportTicketPath,
} from '@/lib/support';

export default function SupportCenter({ audience }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(() => Boolean(location.state?.openComposer));
  const [draftContext, setDraftContext] = useState(() => location.state?.supportDraft || null);

  const basePath = supportBasePath(audience);
  const homePath = audience === 'provider' ? '/provider' : '/client';
  const onboardingPath = audience === 'provider' ? '/provider/onboarding' : '/client/onboarding';

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => navigate(onboardingPath));
  }, [navigate, onboardingPath]);

  useEffect(() => {
    if (!location.state) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const ticketsQuery = useQuery({
    queryKey: ['support-tickets', audience, user?.id],
    queryFn: () => api.support.list({ _limit: 50 }),
    enabled: !!user?.id,
  });

  const conversationsQuery = useQuery({
    queryKey: ['support-conversations', audience, user?.id],
    queryFn: () => api.entities.Conversation.filter(
      audience === 'provider' ? { providerId: user.id } : { clientId: user.id },
      '-lastMessageTime',
      100
    ),
    enabled: !!user?.id,
  });

  const clientRequestsQuery = useQuery({
    queryKey: ['support-client-requests', user?.id],
    queryFn: () => api.entities.ServiceRequest.filter({ created_by_id: user.id }, '-created_date', 100),
    enabled: audience === 'client' && !!user?.id,
  });

  const linkedRequestIds = useMemo(() => {
    const ids = (conversationsQuery.data || [])
      .map((conversation) => conversation.serviceRequestId)
      .filter(Boolean);
    return [...new Set(ids)];
  }, [conversationsQuery.data]);

  const linkedRequestsQuery = useQuery({
    queryKey: ['support-linked-requests', linkedRequestIds.join('|')],
    queryFn: async () => {
      const results = await Promise.all(
        linkedRequestIds.map((id) => api.entities.ServiceRequest.get(id).catch(() => null))
      );
      return results.filter(Boolean);
    },
    enabled: linkedRequestIds.length > 0,
  });

  const requestOptions = useMemo(() => {
    const map = new Map();
    const allRequests = [
      ...(clientRequestsQuery.data || []),
      ...(linkedRequestsQuery.data || []),
    ];

    allRequests.forEach((request) => {
      map.set(request.id, {
        id: request.id,
        label: getSupportRequestOptionLabel(request),
        city: request.city || '',
      });
    });

    return Array.from(map.values());
  }, [clientRequestsQuery.data, linkedRequestsQuery.data]);

  const requestLookup = useMemo(() => (
    new Map(requestOptions.map((request) => [request.id, request]))
  ), [requestOptions]);

  const conversationOptions = useMemo(() => (
    (conversationsQuery.data || []).map((conversation) => {
      const relatedRequest = requestLookup.get(conversation.serviceRequestId);
      const counterpart = getConversationCounterpart(conversation, audience);
      return {
        id: conversation.id,
        serviceRequestId: conversation.serviceRequestId || '',
        label: relatedRequest ? `${counterpart} - ${relatedRequest.label}` : counterpart,
      };
    })
  ), [audience, conversationsQuery.data, requestLookup]);

  const tickets = ticketsQuery.data?.items || [];

  const handleCreated = (ticket) => {
    queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    setDraftContext(null);
    navigate(supportTicketPath(audience, ticket.id));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate(homePath)}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
            title="Voltar"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">Ajuda e suporte</p>
            <p className="text-xs text-muted-foreground">Acompanhe e abra solicitacoes</p>
          </div>
          <button
            onClick={() => ticketsQuery.refetch()}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
            title="Atualizar"
          >
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold text-foreground">Central de suporte</h1>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Abra uma solicitacao para falar com a equipe e acompanhe a timeline do atendimento.
              </p>
            </div>
            <button
              onClick={() => {
                setDraftContext(null);
                setIsComposerOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Abrir
            </button>
          </div>
        </div>

        {ticketsQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-border border-t-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <LifeBuoy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-base font-semibold text-foreground">Nenhuma solicitacao ainda</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Quando voce abrir um chamado, o andamento aparece aqui.
            </p>
            <button
              onClick={() => {
                setDraftContext(null);
                setIsComposerOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
            >
              <Plus className="h-4 w-4" />
              Abrir solicitacao
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={supportTicketPath(audience, ticket.id)}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
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
                    <p className="mt-3 line-clamp-2 text-sm text-foreground">
                      {ticket.lastResponsePreview || ticket.description}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SupportTicketComposerDialog
        open={isComposerOpen}
        onOpenChange={setIsComposerOpen}
        audience={audience}
        user={user}
        requestOptions={requestOptions}
        conversationOptions={conversationOptions}
        initialContext={draftContext}
        onCreated={handleCreated}
      />
    </div>
  );
}
