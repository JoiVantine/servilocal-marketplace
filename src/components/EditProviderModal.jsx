import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { X, Camera, ImagePlus, Trash2 } from 'lucide-react';

export default function EditProviderModal({ user, onClose, onSaved }) {
  const galleryRef = useRef(null);

  const [name, setName] = useState(user.fullName || user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [photoPreview, setPhotoPreview] = useState(user.photo || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [city, setCity] = useState(user.city || '');

  const [profile, setProfile] = useState(null);
  const [neighborhood, setNeighborhood] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [providerProfile, setProviderProfile] = useState(null);
  const [portfolioPhotos, setPortfolioPhotos] = useState([]);
  const portfolioInputRef = useRef(null);

  useEffect(() => {
    api.entities.UserProfile.filter({ userId: user.id }).then((profiles) => {
      const p = profiles[0];
      if (p) {
        setProfile(p);
        setNeighborhood(p.neighborhood || '');
        setState(p.state || '');
      }
    });
    api.entities.ProviderProfile.filter({ userId: user.id }).then((profiles) => {
      const p = profiles[0];
      if (p) {
        setProviderProfile(p);
        setDescription(p.description || '');
        if (p.portfolioPhotos?.length) setPortfolioPhotos(p.portfolioPhotos);
      }
    });
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (file) => api.uploadFile(file),
  });

  const formatPhone = (val) => {
    const d = val.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let photoUrl = user.photo;
      if (photoFile) photoUrl = await uploadMutation.mutateAsync(photoFile);

      const fmt = formatPhone(phone);

      await api.auth.updateMe({
        full_name: name,
        phone: fmt,
        city,
        ...(photoUrl ? { photo: photoUrl } : {}),
      });

      const profileData = {
        userId: user.id,
        neighborhood,
        state,
        role: profile?.role || 'provider',
        onboardingCompleted: true,
      };

      if (profile) {
        await api.entities.UserProfile.update(profile.id, profileData);
      } else {
        await api.entities.UserProfile.create(profileData);
      }

      const providerUpdate = { portfolioPhotos, description };
      if (photoUrl) providerUpdate.profilePhoto = photoUrl;
      if (providerProfile) {
        await api.entities.ProviderProfile.update(providerProfile.id, providerUpdate);
      }

      return { photo: photoUrl, name, city };
    },
    onSuccess: (updates) => {
      onSaved?.(updates);
      onClose();
    },
  });

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handlePortfolioAdd = async (e) => {
    const file = e.target.files?.[0];
    if (!file || portfolioPhotos.length >= 5) return;
    e.target.value = '';
    try {
      const url = await api.uploadFile(file);
      setPortfolioPhotos(prev => [...prev, url]);
    } catch {
      // silently ignore — upload error doesn't block other saves
    }
  };

  const handlePortfolioRemove = (index) => {
    setPortfolioPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-background rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-heading text-base font-bold text-foreground">Editar perfil</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Photo */}
          <div className="flex flex-col items-center gap-1 pb-2">
            <button onClick={() => galleryRef.current?.click()} className="relative group">
              {photoPreview ? (
                <img src={photoPreview} alt="foto" className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl border-2 border-primary">
                  {name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            </button>
            <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Nome completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* Email — readonly */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">E-mail</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-secondary text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">WhatsApp / Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(DDD) 90000-0000"
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* Neighborhood */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Bairro</label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Estado</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="Ex: SP"
              maxLength={2}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card uppercase"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Sobre você <span className="text-muted-foreground font-normal text-xs">({description.length}/300)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Conte um pouco sobre sua experiência, diferenciais e o que você faz de melhor..."
              rows={3}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card resize-none"
            />
          </div>

          {/* Portfolio */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Portfólio <span className="text-muted-foreground font-normal">({portfolioPhotos.length}/5)</span>
            </label>
            <p className="text-xs text-muted-foreground mb-2">Mostre exemplos do seu trabalho. Isso aumenta a chance de ser escolhido.</p>
            <div className="grid grid-cols-3 gap-2">
              {portfolioPhotos.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
                  <img src={url} alt={`portfolio ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handlePortfolioRemove(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {portfolioPhotos.length < 5 && (
                <button
                  onClick={() => portfolioInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-secondary/50 transition-colors"
                >
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Adicionar</span>
                </button>
              )}
            </div>
            <input ref={portfolioInputRef} type="file" accept="image/*" onChange={handlePortfolioAdd} className="hidden" />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-red-500">{saveMutation.error?.message || 'Erro ao salvar. Tente novamente.'}</p>
          )}

          <button
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
