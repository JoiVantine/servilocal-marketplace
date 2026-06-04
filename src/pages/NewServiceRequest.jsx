import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ChevronLeft, Home, ClipboardList, ChevronDown, Camera, X, Loader2 } from 'lucide-react';
import { useServices } from '@/hooks/useServices';

const LOGO_URL = "/logo.png";

export default function NewServiceRequest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { categories } = useServices();
  const fileRef = useRef(null);

  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(state?.category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(state?.subcategory || '');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [address, setAddress] = useState('');
  const [userCache, setUserCache] = useState(null);
  const [profileCache, setProfileCache] = useState(null);

  useEffect(() => {
    api.auth.me().then(async (user) => {
      setUserCache(user);
      const profiles = await api.entities.UserProfile.filter({ userId: user.id });
      const profile = profiles[0];
      setProfileCache(profile);
      const parts = [profile?.address, profile?.neighborhood, user.city].filter(Boolean);
      setAddress(parts.join(', '));
    }).catch(() => navigate('/'));
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceRequest.create(data),
    onSuccess: (result) => navigate(`/client/request/${result.id || result._id}`),
  });

  const handlePhotoAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoLoading(true);
    setPhotoError(false);
    try {
      const url = await api.uploadFile(file);
      setPhotos(prev => [...prev, url]);
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = () => {
    if (!userCache) return;
    createMutation.mutate({
      title: selectedSubcategory,
      description,
      category: selectedCategory,
      subcategory: selectedSubcategory,
      city: userCache.city || '',
      neighborhood: profileCache?.neighborhood || '',
      address: address || profileCache?.address || '',
      clientPhone: userCache.phone || '',
      when: scheduledAt ? 'scheduled' : '',
      scheduledAt: scheduledAt || undefined,
      photos,
      urgency: 'medium',
      status: 'open',
    });
  };

  const isValid = selectedSubcategory !== '';
  const minDT = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate('/client')} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
          <span className="text-sm font-semibold text-foreground">
            Servi<span className="text-primary font-bold">Local</span>
          </span>
        </div>
        <span className="text-sm font-semibold text-foreground">Criar pedido</span>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Service */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Qual serviço você precisa? <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setCategoryExpanded(!categoryExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm transition-colors ${
              selectedSubcategory
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            <span>{selectedSubcategory || 'Selecione a categoria'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} />
          </button>

          {categoryExpanded && (
            <div className="mt-2 border border-border rounded-xl overflow-hidden bg-card shadow-sm max-h-72 overflow-y-auto">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isExp = expandedCat === cat.name;
                return (
                  <div key={cat.name}>
                    <button
                      onClick={() => setExpandedCat(isExp ? null : cat.name)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/20 border-b border-border last:border-0 text-sm"
                    >
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="flex-1 font-medium text-foreground">{cat.name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExp ? 'rotate-180' : ''}`} />
                    </button>
                    {isExp && (
                      <div className="p-3 flex flex-wrap gap-2 bg-secondary/10 border-b border-border">
                        {cat.subcategories.map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setSelectedSubcategory(sub);
                              setCategoryExpanded(false);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Descreva o que precisa</label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none bg-card"
            />
            <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 270 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {description.length}/300
            </span>
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Adicione fotos (opcional)</label>
          <div className="flex gap-2 flex-wrap">
            {photos.map((url, i) => (
              <div key={i} className="relative">
                <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                <button
                  onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoLoading}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-secondary/20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-secondary/40 transition-colors disabled:opacity-50"
              >
                {photoLoading
                  ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  : <Camera className="w-5 h-5 text-muted-foreground" />
                }
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
          {photoError && (
            <p className="text-xs text-red-500 mt-1.5">Falha ao enviar foto. Tente novamente.</p>
          )}
        </div>

        {/* When */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Quando você precisa? <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minDT}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Endereço do serviço</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={userCache ? 'Endereço não cadastrado' : 'Carregando...'}
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Publicando...' : 'Publicar pedido'}
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <Link to="/client" className="flex-1 flex flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground transition-colors">
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
