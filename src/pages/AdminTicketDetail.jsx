import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Calendar, CheckCircle, Mail, MoreVertical,
  Paperclip, Phone, Send, Tag,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import {
  formatSupportDateLong,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_COLORS,
  SUPPORT_STATUS_LABELS,
} from '@/lib/support';
import { toast } from '@/components/ui/use-toast';

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
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default function AdminTicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const chatBottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const ticketQuery = useQuery({
    queryKey: ['admin-ticket', ticketId],
    queryFn: () => api.support.get(ticketId),
    enabled: !!ticketId,
  });

  const eventsQuery = useQuery({
    queryKey: ['admin-ticket-events', ticketId],
    queryFn: () => api.support.listEvents(ticketId),
    enabled: !!ticketId,
    refetchInterval: 15_000,
  });

  const ticket = ticketQuery.data;
  const events = eventsQuery.data || [];

  // Load the requester's user profile for phone/email
  const userQuery = useQuery({
    queryKey: ['admin-ticket-user', ticket?.relatedClientId || ticket?.relatedProviderId],
    queryFn: async () => {
      const userId = ticket?.relatedClientId || ticket?.relatedProviderId;
      if (!userId) return null;
      const profiles = await api.entities.UserProfile.filter({ userId });
      return profiles?.[0] || null;
    },
    enabled: !!(ticket?.relatedClientId || ticket?.relatedProviderId),
  });

  // Load user entity for phone/email
  const userEntityQuery = useQuery({
    queryKey: ['admin-ticket-user-entity', ticket?.relatedClientId || ticket?.relatedProviderId],
    queryFn: async () => {
      const userId = ticket?.relatedClientId || ticket?.relatedProviderId;
      if (!userId) return null;
      const users = await api.entities.User.list('-created_date', 500);
      return users?.find((u) => u.id === userId) || null;
    },
    enabled: !!(ticket?.relatedClientId || ticket?.relatedProviderId),
  });

  const userEntity = userEntityQuery.data;
  const phone = userEntity?.phone || userEntity?.whatsapp || ticket?.requesterPhone;
  const email = userEntity?.email || ticket?.requesterEmail;

  useEffect(() => {
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [events.length]);

  const replyMutation = useMutation({
    mutationFn: async () => {
      const attachments = replyFiles.length > 0
        ? await Promise.all(replyFiles.map((f) => api.uploadFile(f)))
        : [];
      return api.support.reply(ticketId, { message: replyText.trim(), attachments });
    },
    onSuccess: () => {
      setReplyText('');
      setReplyFiles([]);
      queryClient.invalidateQueries({ queryKey: ['admin-ticket-events', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets-list'] });
    },
    onError: (err) => {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => api.support.update(ticketId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets-list'] });
    },
  });

  const handleSend = () => {
    if (!replyText.trim() && replyFiles.length === 0) return;
    replyMutation.mutate();
  };

  const handleResolve = () => {
    updateMutation.mutate({ status: 'resolved' });
    setMenuOpen(false);
  };

  const handleClose = () => {
    updateMutation.mutate({ status: 'closed' });
    setMenuOpen(false);
  };

  if (ticketQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-sm text-muted-foreground">Chamado não encontrado.</p>
        <button onClick={() => navigate('/admin/support')} className="text-sm text-primary font-medium">
          ← Voltar
        </button>
      </div>
    );
  }

  const initial = (ticket.requesterName || '?')[0].toUpperCase();
  const bg = avatarColor(ticket.requesterName || '');
  const statusLabel = SUPPORT_STATUS_LABELS[ticket.status] || ticket.status;
  const statusColor = SUPPORT_STATUS_COLORS[ticket.status] || 'bg-secondary text-muted-foreground';
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';
  const shortId = ticket.id?.slice(-4)?.toUpperCase() || '';

  // Separate system events from chat messages
  const chatEvents = events.filter((e) => e.type === 'user_reply' || e.type === 'admin_reply');

  return (
    <div className="min-h-screen bg-secondary/20 flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3.5 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/admin/support')}
          className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-base font-bold text-foreground">Detalhes do chamado</h1>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <button
                onClick={handleResolve}
                disabled={updateMutation.isPending || isClosed}
                className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary/50 disabled:opacity-40"
              >
                Marcar resolvido
              </button>
              <button
                onClick={handleClose}
                disabled={updateMutation.isPending || isClosed}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-t border-border disabled:opacity-40"
              >
                Encerrar chamado
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">

          {/* User info card */}
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center shrink-0`}>
              <span className="text-lg font-bold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">{ticket.requesterName || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">
                {ticket.requesterRole === 'provider' ? 'Prestador' : 'Usuário'}
                {shortId ? ` • ID ${shortId}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColor}`}>
                {statusLabel}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">
                {timeAgo(ticket.created_date)}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Descrição</p>
            <p className="text-sm text-foreground leading-relaxed">
              {ticket.description || ticket.subject || 'Sem descrição.'}
            </p>
          </div>

          {/* Informações */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Informações</p>

            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 group"
              >
                <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {phone}
                </span>
              </a>
            )}

            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-3 group">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                  {email}
                </span>
              </a>
            )}

            {ticket.created_date && (
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">
                  {formatSupportDateLong(ticket.created_date)}
                </span>
              </div>
            )}

            {ticket.category && (
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-foreground">
                  {SUPPORT_CATEGORY_LABELS[ticket.category] || ticket.category}
                </span>
              </div>
            )}
          </div>

          {/* Conversas */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground">Conversas</p>
            </div>

            {/* Chat messages */}
            <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
              {chatEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma mensagem ainda
                </p>
              ) : (
                chatEvents.map((event) => {
                  const isAdmin = event.actorRole === 'admin';
                  return (
                    <div key={event.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      {!isAdmin && (
                        <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center shrink-0 mr-2 mt-0.5`}>
                          <span className="text-xs font-bold text-white">{initial}</span>
                        </div>
                      )}
                      <div className={`max-w-[75%] ${isAdmin ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {isAdmin ? 'Suporte / Admin' : (event.actorName || 'Usuário')}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {timeAgo(event.created_date)}
                          </span>
                        </div>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAdmin
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-secondary/60 text-foreground rounded-tl-sm'
                        }`}>
                          {event.message}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Reply input */}
            {!isClosed && (
              <div className="border-t border-border px-3 py-2.5 flex items-end gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite sua resposta..."
                  className="flex-1 text-sm bg-transparent text-foreground placeholder-muted-foreground focus:outline-none py-1.5"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setReplyFiles(Array.from(e.target.files || []))}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={replyMutation.isPending || (!replyText.trim() && replyFiles.length === 0)}
                  className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            )}
          </div>

          {replyFiles.length > 0 && (
            <div className="bg-card border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground">
              {replyFiles.length} arquivo(s) selecionado(s)
            </div>
          )}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="bg-card border-t border-border px-4 py-3 flex gap-3 shrink-0">
        <button
          onClick={() => navigate('/admin/support')}
          disabled={updateMutation.isPending}
          className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary/50 disabled:opacity-50 transition-colors"
        >
          Transferir
        </button>
        <button
          onClick={handleResolve}
          disabled={updateMutation.isPending || isClosed}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <CheckCircle className="w-4 h-4" />
          {isClosed ? 'Encerrado' : 'Resolver chamado'}
        </button>
      </div>
    </div>
  );
}
