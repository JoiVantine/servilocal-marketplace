import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const CATEGORIES = [
  { key: 'quality',      label: 'Qualidade do serviço' },
  { key: 'service',      label: 'Atendimento' },
  { key: 'punctuality',  label: 'Pontualidade' },
  { key: 'cleanliness',  label: 'Limpeza e organização' },
];

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 focus:outline-none"
        >
          <Star
            className={`w-8 h-8 transition-colors ${
              star <= (hover || value)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-border fill-transparent'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ClientOrderRating() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [ratings, setRatings] = useState({ quality: 0, service: 0, punctuality: 0, cleanliness: 0 });
  const [comment, setComment] = useState('');

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const me = await api.auth.me();
      const overall = Math.round(
        (ratings.quality + ratings.service + ratings.punctuality + ratings.cleanliness) / 4
      );
      await Promise.all([
        api.entities.ProviderReview.create({
          providerId: request.confirmedProviderId,
          providerName: request.confirmedProviderName,
          clientId: me.id,
          clientName: me.full_name || me.fullName,
          serviceRequestId: requestId,
          rating: overall,
          ratings,
          comment,
        }),
        api.entities.ServiceRequest.update(requestId, { ratingStatus: 'COMPLETED' }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      toast({ title: 'Obrigado pela avaliação.' });
      navigate('/client/orders');
    },
  });

  const handleSkip = async () => {
    try {
      await api.entities.ServiceRequest.update(requestId, { ratingStatus: 'SKIPPED' });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch {}
    toast({ title: 'Você pode avaliar este atendimento depois.' });
    navigate('/client/orders');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
        <button onClick={() => navigate('/client')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Avaliação do profissional</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Provider card */}
        {request?.confirmedProviderName && (
          <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="shrink-0">
              {request.confirmedProviderPhoto ? (
                <img src={request.confirmedProviderPhoto} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {request.confirmedProviderName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">{request.confirmedProviderName}</p>
              <p className="text-xs text-muted-foreground">{request.category}</p>
            </div>
          </div>
        )}

        {/* Category ratings */}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-medium text-foreground">{cat.label}</p>
              <StarRating
                value={ratings[cat.key]}
                onChange={(val) => setRatings(prev => ({ ...prev, [cat.key]: val }))}
              />
            </div>
          ))}
        </div>

        {/* Comment */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Comentário <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
          </label>
          <div className="relative">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="Conte sobre sua experiência com o profissional..."
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {comment.length}/300
            </span>
          </div>
        </div>

        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || Object.values(ratings).some(v => v === 0)}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
        </button>

        <button
          onClick={handleSkip}
          className="w-full text-sm text-muted-foreground font-medium hover:text-foreground text-center py-2"
        >
          Pular por enquanto
        </button>
      </div>
    </div>
  );
}
