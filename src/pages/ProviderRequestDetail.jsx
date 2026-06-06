import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  ChevronLeft, MapPin, Calendar, Clock, User,
  MessageCircle, X, ChevronRight,
} from 'lucide-react';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getScheduleOptions(request) {
  if (request?.scheduleOptions?.length) return request.scheduleOptions;
  if (!request?.scheduledAt) return [];
  return [{
    date: new Date(request.scheduledAt).toISOString().slice(0, 10),
    startTime: formatTime(request.scheduledAt),
    endTime: '',
  }];
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'agora';
  if (diff < 60) return `${diff} min atrás`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// Armazena centavos como string de dígitos; exibe formatado em tempo real
const toMoneyDigits = (v) => v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
const fmtCurrency = (digits) => {
  if (!digits) return '';
  const n = parseInt(digits, 10) || 0;
  const reais = Math.floor(n / 100);
  const cents = n % 100;
  return `${reais.toLocaleString('pt-BR')},${String(cents).padStart(2, '0')}`;
};
const parseMoney = (digits) => Math.floor(parseInt(digits || '0', 10) / 100);
const fmtBRL = (n) => `R$ ${n.toLocaleString('pt-BR')},00`;

export default function ProviderRequestDetail() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);

  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMaterials, setQuoteMaterials] = useState('provider');
  const [quoteFreight, setQuoteFreight] = useState('');
  const [quoteTerm, setQuoteTerm] = useState('');
  const [quoteObs, setQuoteObs] = useState('');

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => navigate('/'));
  }, []);

  const { data: request, isLoading } = useQuery({
    queryKey: ['provider-request-detail', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
    enabled: !!requestId,
  });

  const serviceVal = parseMoney(quotePrice);
  const freightVal = parseMoney(quoteFreight);
  const totalVal = serviceVal + freightVal;

  const canSend = quotePrice.trim().length > 0;

  const handleSendQuote = async () => {
    if (!user || !request || !canSend) return;
    setSending(true);
    setError('');
    try {
      const provProfiles = await api.entities.ProviderProfile.filter({ userId: user.id });
      const pp = provProfiles[0];

      await api.entities.ServiceRequestInterest.create({
        serviceRequestId: requestId,
        providerId: user.id,
        providerName: user.fullName || user.full_name || '',
        providerPhoto: pp?.profilePhoto || user.photo || '',
        price: String(totalVal),
        servicePrice: String(serviceVal),
        freight: quoteFreight,
        materials: quoteMaterials,
        observations: quoteObs,
        message: quoteObs || 'Orçamento enviado.',
      });

      const existing = await api.entities.Conversation.filter({
        serviceRequestId: requestId,
        providerId: user.id,
      });
      let conv;
      if (existing.length > 0) {
        conv = existing[0];
      } else {
        conv = await api.entities.Conversation.create({
          serviceRequestId: requestId,
          providerId: user.id,
          providerName: user.fullName || user.full_name || '',
          clientId: request.userId || request.created_by_id,
          clientName: request.clientName || 'Cliente',
          status: 'active',
        });
      }

      const materialsLabel = quoteMaterials === 'client' ? 'Cliente fornece' : 'Prestador fornece';
      const quoteLines = [
        `💼 Orçamento para: ${request.title || request.category}`,
        ``,
        `• Serviço: ${fmtBRL(serviceVal)}`,
        freightVal > 0 ? `• Frete: ${fmtBRL(freightVal)}` : null,
        `• Materiais: ${materialsLabel}`,
        quoteTerm ? `• Prazo estimado: ${quoteTerm}` : null,
        `• Total: ${fmtBRL(totalVal)}`,
        quoteObs ? `\n📝 ${quoteObs}` : null,
      ].filter(Boolean).join('\n');

      await api.entities.Message.create({
        conversationId: conv.id,
        senderId: user.id,
        senderName: user.fullName || user.full_name,
        senderType: 'provider',
        content: quoteLines,
        text: quoteLines,
        attachments: [],
        read: false,
      });

      await api.entities.Conversation.update(conv.id, {
        lastMessage: `Orçamento enviado: ${fmtBRL(totalVal)}`,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 1,
      });

      if (request.status === 'open') {
        await api.entities.ServiceRequest.update(requestId, { status: 'in_conversation' });
      }

      setConversationId(conv.id);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Erro ao enviar orçamento. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Proposta enviada!</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              O cliente irá avaliar seu orçamento. Você será notificado quando ele responder.
            </p>
          </div>
          <button
            onClick={() => navigate(`/chat/${conversationId}`)}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
          >
            <span className="flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5" /> Ver conversa
            </span>
          </button>
          <button
            onClick={() => navigate('/provider')}
            className="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-24">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Detalhes do pedido</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : !request ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Pedido não encontrado.</div>
      ) : (
        <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Serviço</p>
                <p className="text-base font-semibold text-foreground">{request.title || request.category}</p>
              </div>

              {request.description && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Descrição</p>
                  <p className="text-sm text-foreground leading-relaxed">{request.description}</p>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-0.5">Quando precisa</p>
                  {getScheduleOptions(request).length > 0 ? (
                    getScheduleOptions(request).map((option, index) => (
                      <div key={`${option.date}-${option.startTime}-${index}`}>
                        <p className="text-sm text-foreground">
                          {option.date
                            ? new Date(`${option.date}T00:00:00`).toLocaleDateString('pt-BR')
                            : formatDate(request.scheduledAt)}
                        </p>
                        {(option.startTime || option.endTime) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {option.startTime && option.endTime
                              ? `Entre ${option.startTime} e ${option.endTime}`
                              : `A partir das ${option.startTime}`}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground">O mais rápido possível</p>
                  )}
                </div>
              </div>

              {request.urgency && request.urgency !== 'medium' && (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    request.urgency === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {request.urgency === 'high' ? '⚡ Urgente' : '📅 Sem pressa'}
                  </span>
                </div>
              )}

              {(request.address || request.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    {request.address && <p className="text-sm text-foreground">{request.address}</p>}
                    <p className="text-sm text-foreground">{request.city}</p>
                    {request.zipCode && <p className="text-xs text-muted-foreground">{request.zipCode}</p>}
                  </div>
                </div>
              )}

              {(request.price || request.suggestedPrice) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Preço proposto pelo cliente</p>
                  <p className="text-lg font-bold text-primary mt-0.5">
                    R$ {parseFloat(request.price || request.suggestedPrice).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {request.photos?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground font-medium mb-3">Fotos do local</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {request.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Foto ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-xl shrink-0 border border-border" />
                ))}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground font-medium mb-3">Cliente</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{request.clientName || 'Cliente'}</p>
                <p className="text-xs text-muted-foreground">{timeAgo(request.created_date)}</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
          )}
        </div>
      )}

      {!isLoading && request && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-background border-t border-border">
          <div className="max-w-lg mx-auto space-y-2">
            <button
              onClick={() => setShowQuoteForm(true)}
              className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
            >
              Enviar orçamento
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Quote form overlay */}
      {showQuoteForm && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b border-border bg-card">
            <h2 className="font-semibold text-foreground">Montar orçamento</h2>
            <button onClick={() => setShowQuoteForm(false)} className="p-2 hover:bg-secondary rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">
            <p className="text-sm text-muted-foreground">
              Serviço: <span className="font-semibold text-foreground">{request?.title || request?.category}</span>
            </p>

            {/* Valor do serviço */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Valor do serviço <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl bg-card focus-within:ring-2 focus-within:ring-primary/50">
                <span className="text-sm text-muted-foreground font-medium">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtCurrency(quotePrice)}
                  onChange={e => setQuotePrice(toMoneyDigits(e.target.value))}
                  placeholder="0,00"
                  className="flex-1 focus:outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Materiais */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Quem fornece os materiais?</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'client', label: 'Cliente leva' },
                  { value: 'provider', label: 'Eu forneço' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setQuoteMaterials(opt.value)}
                    className={`py-3 rounded-xl border text-sm font-medium transition-colors ${
                      quoteMaterials === opt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:bg-secondary/30'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frete */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Frete / deslocamento</label>
              <div className="flex items-center gap-2 px-4 py-3 border border-border rounded-xl bg-card focus-within:ring-2 focus-within:ring-primary/50">
                <span className="text-sm text-muted-foreground font-medium">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fmtCurrency(quoteFreight)}
                  onChange={e => setQuoteFreight(toMoneyDigits(e.target.value))}
                  placeholder="0,00"
                  className="flex-1 focus:outline-none text-sm bg-transparent"
                />
              </div>
            </div>

            {/* Prazo estimado */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Prazo estimado</label>
              <div className="flex flex-wrap gap-2">
                {['Hoje', 'Amanhã', '2-3 dias', '1 semana', 'A combinar'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setQuoteTerm(quoteTerm === opt ? '' : opt)}
                    className={`px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
                      quoteTerm === opt
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border text-foreground hover:bg-secondary/30'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">Observações</label>
              <textarea
                value={quoteObs}
                onChange={e => setQuoteObs(e.target.value.slice(0, 300))}
                placeholder="Informações adicionais sobre o serviço..."
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right mt-1">{quoteObs.length}/300</p>
            </div>

            {/* Resumo */}
            {quotePrice && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resumo do orçamento</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium text-foreground">{fmtBRL(serviceVal)}</span>
                </div>
                {freightVal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="font-medium text-foreground">{fmtBRL(freightVal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Materiais</span>
                  <span className="font-medium text-foreground">
                    {quoteMaterials === 'client' ? 'Cliente fornece' : 'Eu forneço'}
                  </span>
                </div>
                {quoteTerm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prazo</span>
                    <span className="font-medium text-foreground">{quoteTerm}</span>
                  </div>
                )}
                <div className="border-t border-primary/20 pt-2 flex justify-between">
                  <span className="text-sm font-semibold text-primary">Total</span>
                  <span className="text-lg font-bold text-primary">{fmtBRL(totalVal)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
            )}

            <button
              onClick={handleSendQuote}
              disabled={!canSend || sending}
              className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Enviar orçamento'}
              {!sending && <ChevronRight className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowQuoteForm(false)}
              className="w-full py-3 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary/30 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
