import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Star } from 'lucide-react';

const STAR_LABELS = ['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Excelente!'];

export default function ClientOrderRating() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [overallRating, setOverallRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  const { data: request } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const me = await api.auth.me();
      const ratings = {
        quality: overallRating,
        service: overallRating,
        punctuality: overallRating,
        cleanliness: overallRating,
      };
      await Promise.all([
        api.entities.ProviderReview.create({
          providerId: request.confirmedProviderId,
          providerName: request.confirmedProviderName,
          clientId: me.id,
          clientName: me.full_name || me.fullName,
          serviceRequestId: requestId,
          rating: overallRating,
          ratings,
          comment,
        }),
        api.entities.ServiceRequest.update(requestId, { ratingStatus: 'COMPLETED' }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      navigate('/client/orders');
    },
  });

  const handleSkip = async () => {
    try {
      await api.entities.ServiceRequest.update(requestId, { ratingStatus: 'SKIPPED' });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch {}
    navigate('/client/orders');
  };

  const activeRating = hover || overallRating;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">

        {/* Provider avatar */}
        {request?.confirmedProviderPhoto ? (
          <img
            src={request.confirmedProviderPhoto}
            alt=""
            className="w-20 h-20 rounded-full object-cover mb-5 ring-4 ring-yellow-200"
          />
        ) : request?.confirmedProviderName ? (
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-5">
            {request.confirmedProviderName[0]?.toUpperCase()}
          </div>
        ) : null}

        {request?.confirmedProviderName && (
          <p className="text-sm text-muted-foreground mb-1">{request.confirmedProviderName}</p>
        )}
        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">
          Como foi sua experiência?
        </h1>
        {request?.category && (
          <p className="text-sm text-muted-foreground mb-8">{request.category}</p>
        )}

        {/* Stars */}
        <div className="flex gap-3 mb-3">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setOverallRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none"
            >
              <Star
                className={`w-12 h-12 transition-all duration-100 ${
                  star <= activeRating
                    ? 'text-yellow-400 fill-yellow-400 scale-110'
                    : 'text-border fill-transparent'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Label */}
        <p className={`text-sm font-medium h-5 mb-8 transition-opacity ${activeRating ? 'text-foreground opacity-100' : 'opacity-0'}`}>
          {STAR_LABELS[activeRating]}
        </p>

        {/* Comment */}
        <div className="w-full max-w-sm">
          <div className="relative">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value.slice(0, 300))}
              placeholder="Conte sobre sua experiência (opcional)"
              rows={3}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {comment.length}/300
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-10 w-full max-w-sm mx-auto space-y-3">
        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || overallRating === 0}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
        </button>
        <button
          onClick={handleSkip}
          className="w-full text-sm text-muted-foreground font-medium text-center py-2 hover:text-foreground transition-colors"
        >
          Avaliar depois
        </button>
      </div>
    </div>
  );
}
