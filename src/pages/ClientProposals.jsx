import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star, Home, ClipboardList, UserCircle2, Lock, Clock, Calendar } from 'lucide-react';

function fmtScheduledDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

function fmtBRLfromString(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  if (isNaN(n) || n === 0) return null;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PROPOSAL_TTL_MS = 72 * 60 * 60 * 1000;

function getExpiryInfo(createdDate) {
  if (!createdDate) return { expired: false, label: null };
  const expiresAt = new Date(createdDate).getTime() + PROPOSAL_TTL_MS;
  const now = Date.now();
  if (now >= expiresAt) return { expired: true, label: 'Expirada' };
  const diffMs = expiresAt - now;
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / 60000);
    return { expired: false, label: `Expira em ${diffMins} min` };
  }
  if (diffHours < 24) return { expired: false, label: `Expira em ${diffHours}h` };
  const d = new Date(expiresAt);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { expired: false, label: `Válida até ${dd}/${mm} às ${hh}:${min}` };
}

function AnonymousAvatar({ index }) {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-violet-100 text-violet-600',
    'bg-teal-100 text-teal-600',
    'bg-orange-100 text-orange-600',
    'bg-rose-100 text-rose-600',
  ];
  const color = colors[index % colors.length];
  return (
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shrink-0`}>
      <UserCircle2 className="w-7 h-7" />
    </div>
  );
}

function getProfessionalLabel(interest, requestCategory) {
  const specialties = interest.specialties;
  if (specialties?.length > 0) return specialties[0];
  if (requestCategory) return requestCategory;
  return 'Profissional';
}

export default function ClientProposals() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const { data: interests = [], isLoading } = useQuery({
    queryKey: ['interests', requestId],
    queryFn: () => api.entities.ServiceRequestInterest.filter(
      { serviceRequestId: requestId },
      '-created_date'
    ),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations-proposals', requestId],
    queryFn: () => api.entities.Conversation.filter({ serviceRequestId: requestId }),
    enabled: !!requestId,
  });

  const convByProvider = new Map(conversations.map(c => [c.providerId, c]));

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate(`/client/request/${requestId}`)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-semibold text-foreground">Propostas recebidas</h1>
          {interests.length > 0 && (
            <p className="text-xs text-muted-foreground">{interests.length} proposta{interests.length !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5">

        {/* Privacy notice */}
        {interests.length > 0 && (
          <div className="flex items-start gap-2.5 bg-secondary/60 border border-border rounded-xl px-4 py-3 mb-4">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Nome, foto e contato são revelados somente após você selecionar um profissional.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : interests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Nenhuma proposta recebida ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interests.map((interest, idx) => {
              const conversation = convByProvider.get(interest.providerId);
              const priceNum = parseFloat(String(interest.price || '').replace(',', '.'));
              const hasPrice = interest.price && !isNaN(priceNum);
              const professionalLabel = getProfessionalLabel(interest, request?.category);

              const expiry = getExpiryInfo(interest.created_date);
              const freightNum = parseFloat(String(interest.freight || '').replace(/\D/g, '')) / 100 || 0;
              const scheduledDateLabel = fmtScheduledDate(interest.scheduledDate);

              return (
                <div key={interest.id} className={`bg-card border rounded-2xl p-4 shadow-sm ${expiry.expired ? 'border-border opacity-60' : 'border-border'}`}>
                  <div className="flex items-start gap-3 mb-3">
                    <AnonymousAvatar index={idx} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">{professionalLabel}</p>
                        {expiry.expired ? (
                          <span className="text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                            Expirada
                          </span>
                        ) : interests.length > 1 && idx === 0 ? (
                          <span className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium shrink-0">
                            Melhor proposta
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-foreground">
                          {interest.rating ? Number(interest.rating).toFixed(1) : '—'}
                        </span>
                        {interest.reviewCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            · {interest.reviewCount} atendimento{interest.reviewCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    {hasPrice && (
                      <p className="text-xl font-bold text-foreground">
                        R$ {priceNum.toFixed(2).replace('.', ',')}
                      </p>
                    )}

                    {/* Detalhes inline */}
                    <div className="space-y-1">
                      {freightNum > 0 && (
                        <p className="text-xs text-muted-foreground">
                          + Frete: R$ {freightNum.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      {interest.materials && (
                        <p className="text-xs text-muted-foreground">
                          Materiais: {interest.materials === 'client' ? 'cliente fornece' : 'prestador fornece'}
                        </p>
                      )}
                      {interest.term && (
                        <p className="text-xs text-muted-foreground">Prazo: {interest.term}</p>
                      )}
                      {scheduledDateLabel && (
                        <div className="flex items-center gap-1 text-xs text-primary font-medium mt-1">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>{scheduledDateLabel}{interest.scheduledTime ? ` · ${interest.scheduledTime}` : ''}</span>
                        </div>
                      )}
                    </div>

                    {expiry.label && (
                      <p className={`text-xs flex items-center gap-1 ${expiry.expired ? 'text-red-500' : 'text-muted-foreground'}`}>
                        <Clock className="w-3 h-3" />
                        {expiry.label}
                      </p>
                    )}
                    {interest.observations && interest.observations !== interest.message && (
                      <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-2 mt-2">
                        "{interest.observations}"
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {conversation && (
                      <button
                        onClick={() => navigate(`/chat/${conversation.id}`)}
                        className="flex-1 py-2.5 text-sm font-medium text-foreground border border-border rounded-xl hover:bg-secondary/50 transition-colors"
                      >
                        Ver conversa
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/client/request/${requestId}/confirm/${interest.id}`)}
                      disabled={expiry.expired}
                      className="flex-1 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Selecionar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/client" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground">
            <Home className="w-5 h-5" />
            <span className="text-xs">Início</span>
          </Link>
          <button className="flex-1 flex flex-col items-center gap-1 py-3 text-primary font-medium">
            <ClipboardList className="w-5 h-5" />
            <span className="text-xs">Pedidos</span>
          </button>
        </div>
      </div>
    </div>
  );
}
