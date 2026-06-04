import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { X, Camera, CheckCircle } from 'lucide-react';

export default function EditProfileModal({ user, onClose, onSaved }) {
  const galleryRef = useRef(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(user.fullName || user.full_name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [photoPreview, setPhotoPreview] = useState(user.photo || null);
  const [photoFile, setPhotoFile] = useState(null);

  const [profile, setProfile] = useState(null);
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState(user.city || '');

  useEffect(() => {
    api.entities.UserProfile.filter({ userId: user.id }).then((profiles) => {
      const p = profiles[0];
      if (p) {
        setProfile(p);
        setAddress(p.address || '');
        setNeighborhood(p.neighborhood || '');
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
        address,
        role: profile?.role || 'client',
        onboardingCompleted: true,
      };

      if (profile) {
        await api.entities.UserProfile.update(profile.id, profileData);
      } else {
        await api.entities.UserProfile.create(profileData);
      }

      return { photo: photoUrl, name, city };
    },
    onSuccess: (updates) => {
      onSaved?.(updates);
      setSaved(true);
      setTimeout(onClose, 1200);
    },
  });

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
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
          {/* Photo — click direto na galeria */}
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

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Endereço</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
            />
          </div>

          {saveMutation.isError && (
            <p className="text-sm text-red-500">{saveMutation.error?.message || 'Erro ao salvar. Tente novamente.'}</p>
          )}

          {saved ? (
            <div className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" /> Alterações salvas!
            </div>
          ) : (
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!name.trim() || saveMutation.isPending}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
