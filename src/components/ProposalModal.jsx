import { useEffect, useState } from 'react';
import { X, Send, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function ProposalModal({ request, onClose, onSent }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadDefaultProposal = async () => {
      const me = await base44.auth.me();
      setUser(me);

      const services = await base44.entities.ProviderService.filter({ providerId: me.id });
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
    const providerProfiles = await base44.entities.ProviderProfile.filter({ created_by_id: user.id });
    const providerProfile = providerProfiles[0];

    let clientName = 'Cliente';
    try {
      const clientUser = await base44.entities.User.get(request.created_by_id);
      clientName = clientUser?.full_name || 'Cliente';
    } catch {}

    const existingInterests = await base44.entities.ServiceRequestInterest.filter({
      serviceRequestId: request.id,
      providerId: user.id,
    });

    if (existingInterests.length === 0) {
      await base44.entities.ServiceRequestInterest.create({
        serviceRequestId: request.id,
        providerId: user.id,
        providerName: user.full_name,
        specialties: providerProfile?.specialties || [],
        city: providerProfile?.city || user.city || request.city,
        rating: providerProfile?.rating || 0,
        reviewCount: providerProfile?.reviewCount || 0,
        status: 'in_conversation',
      });
      await base44.entities.ServiceRequest.update(request.id, {
        status: 'in_conversation',
      });
    }

    const existingConversations = await base44.entities.Conversation.filter({
      serviceRequestId: request.id,
      providerId: user.id,
    });

    const conversation = existingConversations[0] || await base44.entities.Conversation.create({
      serviceRequestId: request.id,
      clientId: request.created_by_id,
      providerId: user.id,
      clientName,
      providerName: user.full_name,
      status: 'active',
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
      unreadCount: 0,
    });

    await base44.entities.Message.create({
      conversationId: conversation.id,
      senderId: user.id,
      senderName: user.full_name,
      senderType: 'provider',
      text,
      read: false,
    });

    await base44.entities.Conversation.update(conversation.id, {
      lastMessage: text,
      lastMessageTime: new Date().toISOString(),
      unreadCount: (conversation.unreadCount || 0) + 1,
    });

    if (request.created_by_id) {
      await base44.entities.Notification.create({
        userId: request.created_by_id,
        type: 'new_interest',
        title: 'Nova proposta recebida',
        description: `${user.full_name} enviou uma proposta para seu pedido.`,
        relatedId: conversation.id,
        read: false,
      });
    }

    setSending(false);
    onSent?.(conversation);
    navigate(`/chat/${conversation.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="w-full max-w-lg bg-background rounded-t-3xl shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold text-foreground text-lg">Faça sua proposta</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="bg-secondary/40 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Pedido do cliente</p>
                <p className="text-sm font-semibold text-foreground">{request.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{request.description}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Valor sugerido</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Ex.: 120,00"
                    className="flex-1 px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Mensagem</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 space-y-3">
          <button
            onClick={handleSend}
            disabled={loading || sending || !message.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Enviando...' : 'Enviar proposta'}
          </button>
          <button
            onClick={onClose}
            disabled={sending}
            className="w-full bg-card border border-border py-3 rounded-xl font-semibold text-foreground hover:bg-secondary/30 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}