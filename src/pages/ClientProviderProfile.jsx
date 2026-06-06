import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { ChevronLeft, Star, MapPin, Briefcase, ImageIcon } from 'lucide-react';

export default function ClientProviderProfile() {
  const { providerId } = useParams();
  const navigate = useNavigate();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['provider-public-profile', providerId],
    queryFn: () => api.entities.ProviderProfile.filter({ userId: providerId }),
    enabled: !!providerId,
  });
  const profile = profiles[0];

  const { data: reviews = [] } = useQuery({
    queryKey: ['provider-reviews', providerId],
    queryFn: () => api.entities.ProviderReview.filter({ providerId }),
    enabled: !!providerId,
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 pb-10">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate('/client')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Perfil do profissional</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Header */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              {profile?.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                  {(profile?.name || '?')[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-lg leading-tight">
                {profile?.name || 'Profissional'}
              </p>
              {profile?.city && (
                <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-sm">{profile.city}</span>
                </div>
              )}
              {avgRating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold">{avgRating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações'})
                  </span>
                </div>
              )}
            </div>
          </div>

          {profile?.description && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
              {profile.description}
            </p>
          )}
        </div>

        {/* Specialties */}
        {profile?.specialties?.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">Especialidades</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1 bg-secondary text-foreground text-xs font-medium rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {profile?.portfolioPhotos?.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-sm">
                Portfólio ({profile.portfolioPhotos.length} foto{profile.portfolioPhotos.length !== 1 ? 's' : ''})
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-0.5 p-0.5">
              {profile.portfolioPhotos.map((url, idx) => (
                <div key={idx} className="aspect-square overflow-hidden">
                  <img
                    src={url}
                    alt={`Trabalho ${idx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">
                Avaliações ({reviews.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground">
                      {review.clientName || 'Cliente'}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= review.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-border fill-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews.length === 0 && !isLoading && (
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
