import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star, Loader2, Banknote, QrCode, CheckCircle2, Copy, Phone } from 'lucide-react';

const PAYMENT_OPTIONS = [
  { value: 'PIX',      label: 'Pix',      icon: QrCode,   desc: 'Transferência para a chave Pix do prestador' },
  { value: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, desc: 'Pagamento em espécie no local' },
];

export default function ClientConfirmProvider() {
  const { requestId, interestId } = useParams();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const { data: interest } = useQuery({
    queryKey: ['interest', interestId],
    queryFn: () => api.entities.ServiceRequestInterest.get(interestId),
  });

  const { data: providerProfiles = [] } = useQuery({
    queryKey: ['provider-profile-confirm', interest?.providerId],
    queryFn: () => api.entities.ProviderProfile.filter({ userId: interest.providerId }),
    enabled: !!interest?.providerId,
  });
  const providerProfile = providerProfiles[0];

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-confirm', requestId, interest?.providerId],
    queryFn: () => api.entities.Conversation.filter({
      serviceRequestId: requestId,
      providerId: interest.providerId,
    }),
    enabled: !!interest?.providerId,
  });
  const conversation = conversations[0];

  const handleConfirm = async () => {
    if (!interest || !request) return;
    setConfirming(true);
    try {
      const priceNum = parseFloat(String(interest.price || '').replace(',', '.'));
      await api.progress.confirmProvider(requestId, {
        interestId,
        status: 'agreed',
        confirmedProviderId: interest.providerId,
        confirmedProviderName: interest.providerName,
        confirmedProviderPhoto: interest.providerPhoto || providerProfile?.profilePhoto,
        confirmedProviderPixKey: providerProfile?.pixKey || null,
        confirmedProviderPixKeyType: providerProfile?.pixKeyType || null,
        confirmedProviderPhone: providerProfile?.phone || interest.providerPhone || null,
        agreedPrice: interest.price,
        agreedScheduledDate: interest.scheduledDate || null,
        agreedScheduledTime: interest.scheduledTime || null,
        paymentMethod,
        paymentStatus: 'PENDENTE',
        paymentAmount: !isNaN(priceNum) ? priceNum : null,
      });
      if (conversation) {
        const systemText = `✅ Proposta aceita pelo cliente${hasPrice ? ` · R$ ${priceNum.toFixed(2).replace('.', ',')}` : ''}`;
        await Promise.all([
          api.entities.Message.create({
            conversationId: conversation.id,
            senderId: interest.providerId,
            senderName: 'ServiLocal',
            senderType: 'system',
            content: systemText,
            text: systemText,
            read: false,
            attachments: [],
          }),
          api.entities.Conversation.update(conversation.id, {
            lastMessage: 'Proposta aceita pelo cliente',
            lastMessageTime: new Date().toISOString(),
            status: 'active',
          }),
        ]).catch(() => {});
      }
      setConfirmed(true);
    } catch {
      setConfirming(false);
    }
  };

  const handleCopyPix = () => {
    const key = providerProfile?.pixKey;
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const photo = interest?.providerPhoto || providerProfile?.profilePhoto;
  const priceNum = parseFloat(String(interest?.price || '').replace(',', '.'));
  const hasPrice = interest?.price && !isNaN(priceNum);
  const pixKey = providerProfile?.pixKey;
  const pixKeyType = providerProfile?.pixKeyType;
  const PIX_TYPE_LABELS = { ALEATORIA: 'Chave aleatória', CPF: 'CPF', CNPJ: 'CNPJ', EMAIL: 'E-mail', TELEFONE: 'Telefone' };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
          <div className="w-8" />
          <h1 className="font-semibold text-foreground">Profissional confirmado!</h1>
        </div>
        <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <p className="font-bold text-foreground text-lg text-center">Proposta aceita!</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              O profissional foi notificado e entrará em contato em breve.
            </p>
          </div>

          {/* Provider info */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Seu profissional</p>
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                {photo ? (
                  <img src={photo} alt={interest?.providerName} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {interest?.providerName?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground">{interest?.providerName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{interest?.rating ? Number(interest.rating).toFixed(1) : '—'}</span>
                  <span className="text-xs text-muted-foreground">({interest?.reviewCount || 0} avaliações)</span>
                </div>
                {providerProfile?.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{providerProfile.description}</p>
                )}
                {providerProfile?.phone && (
                  <a
                    href={`tel:${providerProfile.phone.replace(/\D/g, '')}`}
                    className="mt-2 flex items-center gap-1.5 text-xs text-primary font-semibold hover:opacity-80"
                    onClick={e => e.stopPropagation()}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {providerProfile.phone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Payment + PIX */}
          {paymentMethod === 'PIX' && pixKey && (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chave Pix para pagamento</p>
              <div className="bg-secondary/50 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground mb-0.5">{PIX_TYPE_LABELS[pixKeyType] || pixKeyType || 'Chave Pix'}</p>
                <p className="text-sm font-semibold text-foreground break-all">{pixKey}</p>
              </div>
              <button
                onClick={handleCopyPix}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-primary/30 text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Copiado!' : 'Copiar chave'}
              </button>
              {hasPrice && (
                <p className="text-center text-sm text-muted-foreground">
                  Valor combinado: <span className="font-bold text-foreground">R$ {priceNum.toFixed(2).replace('.', ',')}</span>
                </p>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2">
            {conversation && (
              <button
                onClick={() => navigate(`/chat/${conversation.id}`)}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Abrir conversa
              </button>
            )}
            <button
              onClick={() => navigate(`/client/request/${requestId}`)}
              className="w-full py-3.5 border border-border rounded-xl font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              Ver pedido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Confirmar profissional</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Provider card */}
        {interest && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {photo ? (
                  <img src={photo} alt={interest.providerName} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                    {interest.providerName?.[0]?.toUpperCase() || 'P'}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-base">{interest.providerName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{interest.rating ? Number(interest.rating).toFixed(1) : '—'}</span>
                  <span className="text-xs text-muted-foreground">({interest.reviewCount || 0} avaliações)</span>
                </div>
                {providerProfile?.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{providerProfile.description}</p>
                )}
                {interest?.providerId && (
                  <button
                    onClick={() => navigate(`/client/provider/${interest.providerId}`)}
                    className="mt-2 text-xs text-primary font-semibold hover:opacity-80"
                  >
                    Ver perfil completo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Order summary */}
        {request && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h2 className="font-semibold text-foreground">Resumo do pedido</h2>

            <div>
              <p className="text-xs text-muted-foreground">Serviço</p>
              <p className="text-sm font-medium text-foreground">{request.category}</p>
            </div>

            {request.description && (
              <div>
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm text-foreground">{request.description}</p>
              </div>
            )}

            {request.scheduledAt && (
              <div>
                <p className="text-xs text-muted-foreground">Data</p>
                <p className="text-sm text-foreground">
                  {new Date(request.scheduledAt).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )}

            {(request.address || request.city) && (
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm text-foreground">
                  {[request.address, request.neighborhood, request.city].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {hasPrice && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Valor combinado</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  R$ {priceNum.toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payment method */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <h2 className="font-semibold text-foreground">Como você vai pagar?</h2>
          <p className="text-xs text-muted-foreground -mt-1">
            O pagamento é feito diretamente ao profissional, sem intermediação do ServiLocal.
          </p>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all text-left ${
                  paymentMethod === value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-background hover:border-primary/30'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  paymentMethod === value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${paymentMethod === value ? 'text-primary' : 'text-foreground'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                  paymentMethod === value ? 'border-primary bg-primary' : 'border-border'
                }`}>
                  {paymentMethod === value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={confirming || !interest}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {confirming && <Loader2 className="w-5 h-5 animate-spin" />}
            {confirming ? 'Confirmando...' : 'Confirmar profissional'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-4 border border-border rounded-xl font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
