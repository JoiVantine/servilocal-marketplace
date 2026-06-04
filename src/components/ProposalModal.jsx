import { useEffect, useState } from 'react';
import { X, Send, Loader2, MapPin, Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';

export default function ProposalModal({ request, onClose, onSent }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [price, setPrice] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadDefaultProposal = async () => {
      const me = await api.auth.me();
      setUser(me);

      const services = await api.entities.ProviderService.filter({ providerId: me.id });
      const matchedService = services.find((service) =>
        service.specialty === request?.subcategory || service.serviceName === request?.category
      );
      const defaultPrice = matchedService?.price || '';
      setPrice(defaultPrice);
      setMessage(
        `Olá! Tenho interesse no seu pedido "${request?.title || request?.subcategory || 'serviço'}".${defaultPrice ? ` Normalmente cobro R$ ${defaultPrice} por esse serviço.` : ''} Posso te ajudar?`
      );
      setLoading(false);
    };

    loadDefaultProposal();
  }, [request]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !user || !request) return;

    setSending(true);
    const providerProfiles = await api.entities.ProviderProfile.filter({ created_by_id: user.id });
    const providerProfile = providerProfiles[0];

    let clientName = 'Cliente';
    try {
      const clientUser = await api.entities.User.get(request.created_by_id);
      clientName = clientUser?.full_name || 'Cliente';
    } catch {}

    const existingInterests = await api.entities.ServiceRequestInterest.filter({
      serviceRequestId: request.id,
      providerId: user.id,
    });

    if (existingInterests.length === 0) {
      await api.entities.ServiceRequestInterest.create({
        serviceRequestId: request.id,
        providerId: user.id,
        providerName: user.fullName || user.full_name,
        providerPhoto: providerProfile?.profilePhoto || null,
        specialties: providerProfile?.specialties || [],
        city: providerProfile?.city || user.city || request.city,
        rating: providerProfile?.rating || 0,
        reviewCount: providerProfile?.reviewCount || 0,
        price: price || null,
        arrivalTime: arrivalTime || null,
        status: 'in_conversation',
      });
      await api.entities.ServiceRequest.update(request.id, {
        status: 'in_conversation',
      });
    }

    const existingConversations = await api.entities.Conversation.filter({
      serviceRequestId: request.id,
      providerId: user.id,
    });

    const conversation = existingConversations[0] || await api.entities.Conversation.create({
      serviceRequestId: request.id,
      clientId: request.created_by_id,
      providerId: user.id,
      clientName,
      providerName: user.fullName || user.full_name,
      status: 'active',
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    });

    await api.entities.Message.create({
      conversationId: conversation.id,
      senderId: user.id,
      senderName: user.fullName || user.full_name,
      senderType: 'provider',
      content: text,
      text,
      read: false,
    });

    await api.entities.Conversation.update(conversation.id, {
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
      unreadCount: (conversation.unreadCount || 0) + 1,
    });

    if (request.created_by_id) {
      await api.entities.Notification.create({
        userId: request.created_by_id,
        type: 'new_interest',
        title: 'Nova proposta recebida',
        body: `${user.fullName || user.full_name} enviou uma proposta para seu pedido.`,
        description: `${user.fullName || user.full_name} enviou uma proposta para seu pedido.`,
        data: { relatedId: conversation.id },
        relatedId: conversation.id,
        read: false,
      });
    }

    setSending(false);
    onSent?.(conversation);
    navigate(`/chat/${conversation.id}`);
  };

  const WHEN_LABELS = {
    today: 'Hoje', tomorrow: 'Amanhã', this_week: 'Esta semana',
    next_30: 'Próximos 30 dias', scheduled: 'Com hora marcada',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">Faça sua proposta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Responder rápido aumenta suas chances</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Service request card */}
              <div className="bg-secondary/30 border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {request.category || 'Serviço'}
                  </span>
                  {request.when && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {WHEN_LABELS[request.when] || request.when}
                    </span>
                  )}
                  {request.city && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <MapPin className="w-3 h-3" />
                      {request.city}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground leading-snug">{request.title}</p>
                {request.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{request.description}</p>
                )}
              </div>

              {/* Price + Arrival */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Valor <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </label>
                  <div className="flex items-center border border-border rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/50">
                    <span className="px-3 py-3 text-sm font-semibold text-muted-foreground bg-secondary/40 border-r border-border select-none">R$</span>
                    <input
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="120,00"
                      className="flex-1 px-3 py-3 bg-transparent text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Chega até <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full px-3 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Você pode combinar os detalhes no chat.</p>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Apresente-se brevemente e mostre por que você é a escolha certa..."
                  className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{message.length} caracteres</p>
              </div>

              {/* Tip */}
              <div className="flex items-start gap-2 px-3 py-2.5 bg-primary/5 border border-primary/15 rounded-lg">
                <Zap className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Clientes escolhem prestadores com foto de perfil e bio preenchida. <span className="text-primary font-medium">Complete seu perfil</span> para se destacar.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleSend}
            disabled={loading || sending || !message.trim()}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando...' : 'Enviar proposta'}
          </button>
        </div>
      </div>
    </div>
  );
}
