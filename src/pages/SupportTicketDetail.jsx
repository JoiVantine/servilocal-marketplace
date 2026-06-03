import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, LifeBuoy, Loader2, MessageSquare, Paperclip, Send } from 'lucide-react';
import { api } from '@/api/apiClient';
import { toast } from '@/components/ui/use-toast';
import {
  formatSupportDateLong,
  getSupportEventTitle,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS,
  supportBasePath,
} from '@/lib/support';

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
          <img src={attachment} alt="Anexo do ticket" className="h-40 w-full object-cover" />
        </a>
      ))}
    </div>
  );
}

export default function SupportTicketDetail({ audience }) {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const listPath = supportBasePath(audience);
  const onboardingPath = audience === 'provider' ? '/provider/onboarding' : '/client/onboarding';

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => navigate(onboardingPath));
  }, [navigate, onboardingPath]);

  const ticketQuery = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => api.support.get(ticketId),
    enabled: !!ticketId,
  });

  const eventsQuery = useQuery({
    queryKey: ['support-ticket-events', ticketId],
    queryFn: () => api.support.listEvents(ticketId),
    enabled: !!ticketId,
  });

  const ticket = ticketQuery.data;
  const events = eventsQuery.data || [];

  const canReply = ticket?.status !== 'closed';
  const latestContext = useMemo(() => (
    [
      ticket?.relatedServiceRequestId ? `Pedido ${ticket.relatedServiceRequestId.slice(-6)}` : null,
      ticket?.relatedConversationId ? `Conversa ${ticket.relatedConversationId.slice(-6)}` : null,
    ].filter(Boolean)
  ), [ticket?.relatedConversationId, ticket?.relatedServiceRequestId]);

  const handleReplyFilesChange = (event) => {
    setReplyFiles(Array.from(event.target.files || []));
  };

  const handleSendReply = async () => {
    if (!ticket) return;
    if (!replyText.trim() && replyFiles.length === 0) {
      toast({
        title: 'Escreva uma resposta',
        description: 'Voce pode enviar texto, anexo ou os dois.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const attachments = replyFiles.length > 0
        ? await Promise.all(replyFiles.map((file) => api.uploadFile(file)))
        : [];

      await api.support.reply(ticket.id, {
        message: replyText.trim(),
        attachments,
      });

      setReplyText('');
      setReplyFiles([]);
      toast({
        title: 'Resposta enviada',
        description: 'A timeline do atendimento foi atualizada.',
      });

      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-ticket-events', ticketId] });
    } catch (error) {
      toast({
        title: 'Nao foi possivel enviar a resposta',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!user || ticketQuery.isLoading || eventsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background px-4 py-16 text-center">
        <LifeBuoy className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
        <p className="text-base font-semibold text-foreground">Solicitacao nao encontrada</p>
        <button
          onClick={() => navigate(listPath)}
          className="mt-5 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
        >
          Voltar para suporte
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(listPath)}
            className="rounded-lg p-2 transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{ticket.subject}</p>
            <p className="text-xs text-muted-foreground">Ticket #{ticket.id.slice(-6).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SUPPORT_CATEGORY_LABELS[ticket.category] || 'Suporte'}
              </p>
              <h1 className="mt-2 text-lg font-bold text-foreground">{ticket.subject}</h1>
              <p className="mt-2 text-sm text-foreground">{ticket.description}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${SUPPORT_STATUS_COLORS[ticket.status] || 'bg-secondary text-muted-foreground'}`}>
              {SUPPORT_STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary/50 px-2.5 py-1">
              Criado em {formatSupportDateLong(ticket.created_date)}
            </span>
            {latestContext.map((item) => (
              <span key={item} className="rounded-full bg-secondary/50 px-2.5 py-1">
                {item}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {ticket.relatedConversationId && (
              <button
                onClick={() => navigate(`/chat/${ticket.relatedConversationId}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
              >
                <MessageSquare className="h-4 w-4" />
                Abrir conversa
              </button>
            )}
            {audience === 'client' && ticket.relatedServiceRequestId && (
              <button
                onClick={() => navigate(`/client/request/${ticket.relatedServiceRequestId}`)}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/40"
              >
                <ExternalLink className="h-4 w-4" />
                Ver pedido
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
            <button
              onClick={() => {
                ticketQuery.refetch();
                eventsQuery.refetch();
              }}
              className="text-xs font-medium text-primary transition-opacity hover:opacity-80"
            >
              Atualizar
            </button>
          </div>

          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{getSupportEventTitle(event)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSupportDateLong(event.created_date)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary/50 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {event.actorRole === 'admin' ? 'Suporte' : 'Usuario'}
                </span>
              </div>

              {event.message && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{event.message}</p>
              )}

              <EventAttachmentList attachments={event.attachments} />
            </div>
          ))}
        </div>

        {canReply ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Responder ao suporte</h2>
            <textarea
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="Envie mais detalhes, documentos ou atualizacoes importantes."
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
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

              {replyFiles.length > 0 && (
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
              )}
            </div>

            <button
              onClick={handleSendReply}
              disabled={isSending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSending ? 'Enviando...' : 'Enviar resposta'}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm font-semibold text-foreground">Ticket encerrado</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Este atendimento ja foi finalizado pela equipe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
