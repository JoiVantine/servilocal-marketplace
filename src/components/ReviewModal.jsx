import { useState } from 'react';
import { X, Star, Loader } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function ReviewModal({ conversation, onClose, onReviewed }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await api.entities.ProviderReview.create({
        conversationId: conversation.id,
        providerId: conversation.providerId,
        clientId: conversation.clientId,
        rating,
        comment: comment.trim(),
      });

      const reviews = await api.entities.ProviderReview.filter({ providerId: conversation.providerId });
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      const providerProfiles = await api.entities.ProviderProfile.filter({ created_by_id: conversation.providerId });
      if (providerProfiles[0]) {
        await api.entities.ProviderProfile.update(providerProfiles[0].id, {
          rating: parseFloat(avg.toFixed(1)),
          reviewCount: reviews.length,
        });
      }

      onReviewed?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
      <div className="w-full bg-background rounded-t-3xl shadow-lg">
        <div className="sticky top-0 bg-background border-b border-border flex items-center justify-between px-6 py-4">
          <h2 className="font-semibold text-foreground text-lg">Avaliar serviço</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Como foi o serviço de</p>
            <p className="font-semibold text-foreground">{conversation.providerName}?</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    star <= (hover || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Comentário (opcional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Como foi a experiência?"
              rows={3}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader className="w-4 h-4 animate-spin" />}
            {submitting ? 'Enviando...' : 'Enviar avaliação'}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-full bg-card border border-border py-3 rounded-xl font-semibold text-foreground hover:bg-secondary/30 transition-colors"
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}
