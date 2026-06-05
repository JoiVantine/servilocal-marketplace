import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Home,
  ClipboardList,
  ChevronDown,
  Camera,
  X,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';

const LOGO_URL = '/logo.png';

const emptyScheduleOption = () => ({
  date: '',
  startTime: '',
  endTime: '',
});

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeCityState(city, state) {
  return [city, state].filter(Boolean).join(' - ');
}

export default function NewServiceRequest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { categories } = useServices();
  const fileRef = useRef(null);

  const [description, setDescription] = useState('');
  const [scheduleOptions, setScheduleOptions] = useState([emptyScheduleOption()]);
  const [selectedCategory, setSelectedCategory] = useState(state?.category || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(state?.subcategory || '');
  const [categoryExpanded, setCategoryExpanded] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [addressData, setAddressData] = useState({
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [userCache, setUserCache] = useState(null);
  const [profileCache, setProfileCache] = useState(null);

  useEffect(() => {
    api.auth.me().then(async (user) => {
      setUserCache(user);
      const profiles = await api.entities.UserProfile.filter({ userId: user.id });
      const profile = profiles[0];
      setProfileCache(profile);
      setAddressData({
        cep: formatCep(profile?.cep || ''),
        street: profile?.addressStreet || profile?.address?.split(',')[0] || '',
        number: profile?.addressNumber || '',
        complement: profile?.addressComplement || '',
        neighborhood: profile?.neighborhood || '',
        city: profile?.addressCity || user.city?.split(' - ')[0] || '',
        state: profile?.addressState || user.city?.split(' - ')[1] || '',
      });
      if (!profile?.address && !profile?.addressStreet) setEditAddress(true);
    }).catch(() => navigate('/'));
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.ServiceRequest.create(data),
    onSuccess: (result) => navigate(`/client/request/${result.id || result._id}`),
  });

  const handlePhotoAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError(true);
      e.target.value = '';
      return;
    }
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

  const updateScheduleOption = (index, field, value) => {
    setScheduleOptions((current) => current.map((option, i) => (
      i === index ? { ...option, [field]: value } : option
    )));
  };

  const removeScheduleOption = (index) => {
    setScheduleOptions((current) => (
      current.length === 1 ? [emptyScheduleOption()] : current.filter((_, i) => i !== index)
    ));
  };

  const handleCepChange = async (value) => {
    const formatted = formatCep(value);
    setAddressData((current) => ({ ...current, cep: formatted }));
    setCepError('');

    const cep = onlyDigits(formatted);
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setAddressData((current) => ({
        ...current,
        street: data.logradouro || current.street,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf || current.state,
      }));
    } catch {
      setCepError('Não foi possível consultar o CEP agora.');
    } finally {
      setCepLoading(false);
    }
  };

  const validScheduleOptions = scheduleOptions
    .filter((option) => option.date && option.startTime && option.endTime)
    .map((option) => ({
      ...option,
      label: `${option.date} entre ${option.startTime} e ${option.endTime}`,
    }));

  const firstSchedule = validScheduleOptions[0];
  const scheduledAt = firstSchedule
    ? `${firstSchedule.date}T${firstSchedule.startTime}`
    : '';

  const addressLine = [
    addressData.street,
    addressData.number,
  ].filter(Boolean).join(', ');
  const fullAddress = [
    addressLine,
    addressData.complement,
    addressData.neighborhood,
    normalizeCityState(addressData.city, addressData.state),
  ].filter(Boolean).join(' - ');

  const savedAddress = [
    profileCache?.address,
    profileCache?.neighborhood,
    userCache?.city,
  ].filter(Boolean).join(', ');

  const handleSubmit = () => {
    if (!userCache || !isValid) return;

    createMutation.mutate({
      title: selectedSubcategory,
      description: description.trim(),
      category: selectedCategory,
      subcategory: selectedSubcategory,
      city: editAddress ? normalizeCityState(addressData.city, addressData.state) : (userCache.city || ''),
      neighborhood: editAddress ? addressData.neighborhood : (profileCache?.neighborhood || ''),
      address: editAddress ? fullAddress : (savedAddress || profileCache?.address || ''),
      zipCode: editAddress ? onlyDigits(addressData.cep) : onlyDigits(profileCache?.cep),
      addressStreet: editAddress ? addressData.street : (profileCache?.addressStreet || ''),
      addressNumber: editAddress ? addressData.number : (profileCache?.addressNumber || ''),
      addressComplement: editAddress ? addressData.complement : (profileCache?.addressComplement || ''),
      addressCity: editAddress ? addressData.city : (profileCache?.addressCity || ''),
      addressState: editAddress ? addressData.state : (profileCache?.addressState || ''),
      clientPhone: userCache.phone || '',
      when: validScheduleOptions.length > 0 ? 'scheduled' : '',
      scheduledAt: scheduledAt || undefined,
      scheduleOptions: validScheduleOptions,
      photos,
      urgency: 'medium',
      status: 'open',
    });
  };

  const isDescriptionValid = description.trim().length > 0;
  const isAddressValid = !editAddress || Boolean(addressData.street && addressData.number && addressData.city && addressData.state);
  const isValid = selectedSubcategory !== '' && isDescriptionValid && isAddressValid;
  const minDate = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background pb-24">
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
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Qual serviço você precisa? <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setCategoryExpanded(!categoryExpanded)}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded-lg text-sm transition-colors ${
              selectedCategory
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            <span>{selectedCategory || 'Selecione a categoria'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${categoryExpanded ? 'rotate-180' : ''}`} />
          </button>

          {categoryExpanded && (
            <div className="mt-2 border border-border rounded-xl overflow-hidden bg-card shadow-sm max-h-56 overflow-y-auto">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setSelectedSubcategory('');
                      setCategoryExpanded(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-0 text-sm transition-colors ${
                      selectedCategory === cat.name
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-secondary/20 text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedCategory && (() => {
            const cat = categories.find(c => c.name === selectedCategory);
            if (!cat?.subcategories?.length) return null;
            return (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Selecione o serviço específico:</p>
                <div className="flex flex-wrap gap-2">
                  {cat.subcategories.map(sub => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubcategory(sub === selectedSubcategory ? '' : sub)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        selectedSubcategory === sub
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">
            Descreva o que precisa <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 300))}
              placeholder="Descreva os detalhes do serviço..."
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none bg-card ${
                !isDescriptionValid && description.length > 0 ? 'border-red-400' : 'border-border'
              }`}
            />
            <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 270 ? 'text-orange-500' : 'text-muted-foreground'}`}>
              {description.length}/300
            </span>
          </div>
          {!isDescriptionValid && (
            <p className="text-xs text-red-500 mt-1.5">A descrição é obrigatória para publicar o pedido.</p>
          )}
        </div>

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

        <div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-semibold text-foreground">
              Quando você precisa? <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </label>
            <button
              onClick={() => setScheduleOptions((current) => [...current, emptyScheduleOption()])}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {scheduleOptions.map((option, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">Opção {index + 1}</span>
                  <button
                    onClick={() => removeScheduleOption(index)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
                    aria-label="Remover opção de data"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="date"
                    value={option.date}
                    min={minDate}
                    onChange={(e) => updateScheduleOption(index, 'date', e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  />
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <input
                      type="time"
                      value={option.startTime}
                      onChange={(e) => updateScheduleOption(index, 'startTime', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                    />
                    <span className="text-xs text-muted-foreground">até</span>
                    <input
                      type="time"
                      value={option.endTime}
                      onChange={(e) => updateScheduleOption(index, 'endTime', e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Formato: entre o horário inicial e final.</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <input
              id="edit-service-address"
              type="checkbox"
              checked={editAddress}
              onChange={(e) => setEditAddress(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-primary"
            />
            <label htmlFor="edit-service-address" className="flex-1 cursor-pointer">
              <span className="block text-sm font-semibold text-foreground">Editar endereço deste pedido</span>
              <span className="block text-xs text-muted-foreground mt-1">
                {savedAddress || 'Nenhum endereço salvo. Preencha os dados abaixo.'}
              </span>
            </label>
          </div>

          {editAddress && (
            <div className="mt-3 rounded-xl border border-border bg-card p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">CEP</label>
                <div className="relative">
                  <input
                    aria-label="CEP"
                    type="text"
                    inputMode="numeric"
                    value={addressData.cep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-4 py-3 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                </div>
                {cepError && <p className="text-xs text-red-500 mt-1.5">{cepError}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Rua <span className="text-red-500">*</span>
                </label>
                <input
                  aria-label="Rua"
                  type="text"
                  value={addressData.street}
                  onChange={(e) => setAddressData((current) => ({ ...current, street: e.target.value }))}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                />
              </div>

              <div className="grid grid-cols-[1fr_1.4fr] gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-label="Número"
                    type="text"
                    value={addressData.number}
                    onChange={(e) => setAddressData((current) => ({ ...current, number: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Complemento</label>
                  <input
                    aria-label="Complemento"
                    type="text"
                    value={addressData.complement}
                    onChange={(e) => setAddressData((current) => ({ ...current, complement: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bairro</label>
                <input
                  aria-label="Bairro"
                  type="text"
                  value={addressData.neighborhood}
                  onChange={(e) => setAddressData((current) => ({ ...current, neighborhood: e.target.value }))}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                />
              </div>

              <div className="grid grid-cols-[1.5fr_0.8fr] gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-label="Cidade"
                    type="text"
                    value={addressData.city}
                    onChange={(e) => setAddressData((current) => ({ ...current, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    UF <span className="text-red-500">*</span>
                  </label>
                  <input
                    aria-label="UF"
                    type="text"
                    value={addressData.state}
                    onChange={(e) => setAddressData((current) => ({ ...current, state: e.target.value.toUpperCase().slice(0, 2) }))}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-background uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!isValid || createMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Publicando...' : 'Publicar pedido'}
        </button>
      </div>

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
