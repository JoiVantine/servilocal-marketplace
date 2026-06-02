import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Check, Upload, MapPin, Phone, Camera, Image, X, Home, Mail, ShieldCheck } from 'lucide-react';
import AddressFormWithMap from '../components/AddressFormWithMap';

const STEPS = [
  { id: 1, label: 'Foto e Perfil' },
  { id: 2, label: 'Localização' },
  { id: 3, label: 'Resumo' },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    photo: null,
    photoPreview: null,
    name: '',
    email: '',
    address: null,
    city: '',
    phone: '',
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [validateAddress, setValidateAddress] = useState(false);

  const validateStep0 = () => {
    const errors = {};
    if (!formData.name.trim() || formData.name.trim().length < 3)
      errors.name = 'Digite seu nome completo (mínimo 3 caracteres)';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errors.email = 'Digite um e-mail válido';
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11)
      errors.phone = 'Digite um celular válido com DDD (10 ou 11 dígitos)';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        setFormData((prev) => ({ ...prev, city: me.city || '' }));
      
      } catch (error) {
        // app público: visitante pode preencher o formulário
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const updateMutation = useMutation({
    mutationFn: (data) => api.auth.updateMe(data),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await api.integrations.Core.UploadFile({ file });
      return result.file_url;
    },
  });

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        photo: file,
        photoPreview: URL.createObjectURL(file),
      }));
      setShowPhotoModal(false);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStep0Submit = async () => {
    // Já autenticado — só atualizar e avançar
    if (user) {
      const updates = { full_name: formData.name, email: formData.email };
      if (formData.photo) {
        const photoUrl = await uploadMutation.mutateAsync(formData.photo);
        updates.photo = photoUrl;
      }
      await updateMutation.mutateAsync(updates);
      setCurrentStep(s => s + 1);
      return;
    }

    // Enviar OTP
    if (!otpSent) {
      if (!validateStep0()) return;
      setOtpLoading(true);
      try {
        await api.auth.sendOtp({ email: formData.email, fullName: formData.name, phone: formData.phone, role: 'client' });
        setOtpSent(true);
      } catch (err) {
        setFieldErrors(p => ({ ...p, email: err.message }));
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    // Verificar OTP
    setOtpLoading(true);
    try {
      const res = await api.auth.verifyOtp({ email: formData.email, otp: otpCode });
      setUser(res.user);
      setCurrentStep(1);
    } catch (err) {
      setFieldErrors(p => ({ ...p, otp: err.message }));
    } finally {
      setOtpLoading(false);
    }
  };

  const handleStep1Submit = async () => {
    if (!isAddressComplete) {
      setValidateAddress(true);
      return;
    }
    if (user) {
      await updateMutation.mutateAsync({
        city: formData.address?.cidade || formData.city,
      });
    }
    setCurrentStep(s => s + 1);
  };

  const handleAddressChange = useCallback((addressData) => {
    setFormData((prev) => ({
      ...prev,
      address: addressData,
      city: addressData?.cidade || prev.city,
    }));
  }, []);

  const isAddressComplete =
    formData.address?.endereco &&
    formData.address?.cidade &&
    (formData.address?.numero?.trim());

  // Auto-detect location when step 1 is reached
  useEffect(() => {
    if (currentStep === 1 && !formData.address && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'pt-BR' } }
            );
            const data = await response.json();
            const addr = data.address || {};
            const addressData = {
              coords: { lat: latitude, lng: longitude },
              endereco: addr.road || addr.street || addr.path || '',
              numero: addr.house_number || '',
              bairro: addr.suburb || addr.neighborhood || addr.village || '',
              cidade: addr.city || addr.town || addr.municipality || '',
              estado: addr.state || '',
              cep: addr.postcode || '',
            };
            handleAddressChange(addressData);
            if (!addressData.cidade) setShowAddressForm(true);
          } catch (error) {
            console.error('Erro ao obter endereço:', error);
            setShowAddressForm(true);
          } finally {
            setLocationLoading(false);
          }
        },
        () => { setLocationLoading(false); setShowAddressForm(true); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [currentStep, handleAddressChange]);

  const handleStep2Submit = async () => {
    if (!user) {
      navigate('/');
      return;
    }
    try {
      await updateMutation.mutateAsync({ phone: formData.phone });
      const existing = await api.entities.UserProfile.filter({ userId: user.id });
      const profileData = {
        userId: user.id,
        neighborhood: formData.address?.bairro || '',
        address: formData.address
          ? `${formData.address.endereco || ''} ${formData.address.numero || ''}, ${formData.address.bairro || ''} - ${formData.address.cidade || ''}`
          : '',
        role: 'client',
        onboardingCompleted: true,
      };
      if (existing.length > 0) {
        await api.entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await api.entities.UserProfile.create(profileData);
      }
      navigate('/client');
    } catch (err) {
      console.error('[onboarding] Erro ao finalizar:', err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ServiLocal" className="w-6 h-6" />
          <span className="text-sm font-semibold text-foreground">ServiLocal</span>
        </div>
        <button
          onClick={() => navigate('/client')}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Home className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  idx <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {idx < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{step.label}</span>
              {idx < STEPS.length - 1 && (
                <div className="w-8 h-0.5 bg-border mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Foto e Perfil */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-2">
                Bem-vindo!
              </h2>
              <p className="text-muted-foreground text-sm">
                Vamos completar seu perfil para começar
              </p>
            </div>

            {/* Photo Upload */}
            <div className="flex flex-col items-center">
              {formData.photoPreview ? (
                <img
                  src={formData.photoPreview}
                  alt="Preview"
                  className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-primary"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-secondary border-2 border-border flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <button
                onClick={() => galleryInputRef.current?.click()}
                className="text-sm font-medium text-primary hover:opacity-80 transition-opacity"
              >
                {formData.photoPreview ? 'Mudar foto' : 'Adicionar foto'}
              </button>

              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                JPG ou PNG, máx 5MB
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Digite seu nome completo"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="seu@email.com"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${fieldErrors.email ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                WhatsApp/Telefone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                  const formatted = val.length <= 2 ? `(${val}` : val.length <= 7 ? `(${val.slice(0, 2)}) ${val.slice(2)}` : `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                  handleInputChange({ target: { name: 'phone', value: val.length > 0 ? formatted : '' } });
                }}
                placeholder="(11) 98765-4321"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${fieldErrors.phone ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.phone
                ? <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                : <p className="text-xs text-muted-foreground mt-1">Com DDD (11 ou outro código)</p>
              }
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Código de verificação <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Digite o código de 6 dígitos enviado para <strong>{formData.email}</strong>.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setFieldErrors(p => ({ ...p, otp: undefined })); }}
                  placeholder="000000"
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm text-center tracking-widest text-lg font-mono ${fieldErrors.otp ? 'border-red-400' : 'border-border'}`}
                />
                {fieldErrors.otp && <p className="text-xs text-red-500 mt-1">{fieldErrors.otp}</p>}
                <button
                  onClick={async () => {
                    setOtpLoading(true);
                    try { await api.auth.sendOtp({ email: formData.email, fullName: formData.name, phone: formData.phone, role: 'client' }); } catch {}
                    setOtpLoading(false);
                  }}
                  className="text-xs text-primary underline mt-2 block"
                >
                  Reenviar código
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Localização */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {locationLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 bg-secondary/30 rounded-lg">
                <div className="w-6 h-6 border-3 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                <p className="text-muted-foreground text-sm">Detectando sua localização...</p>
              </div>
            )}

            {!locationLoading && formData.address?.cidade && !showAddressForm && (
              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Localização detectada</p>
                  <p className="font-medium text-foreground">
                    {formData.address.endereco} {formData.address.numero && `, ${formData.address.numero}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.address.bairro} - {formData.address.cidade}, {formData.address.estado}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="w-full px-4 py-3 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
                >
                  Informar endereço correto
                </button>
              </div>
            )}

            {showAddressForm && (
              <AddressFormWithMap
                onAddressChange={handleAddressChange}
                initialData={formData.address}
                validateNow={validateAddress}
              />
            )}
          </div>
        )}

        {/* Step 2: Resumo */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              {formData.photoPreview ? (
                <img src={formData.photoPreview} alt="foto" className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-primary shadow" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl mx-auto mb-3 shadow">
                  {formData.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <h2 className="font-heading text-xl font-bold text-foreground mb-1">Você está pronto!</h2>
              <p className="text-muted-foreground text-sm">Revise seus dados antes de começar</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-card border border-border rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium text-foreground truncate">{formData.name}</p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground truncate">{formData.email}</p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">WhatsApp</p>
                  <p className="font-medium text-foreground">{formData.phone}</p>
                </div>
              </div>
              <div className="p-4 bg-card border border-border rounded-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Endereço</p>
                  <p className="font-medium text-foreground text-sm">
                    {formData.address
                      ? [formData.address.endereco, formData.address.numero, formData.address.complemento, formData.address.bairro, formData.address.cidade, formData.address.estado].filter(Boolean).join(', ')
                      : formData.city}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="flex-1 px-4 py-3 border border-border rounded-lg font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              Voltar
            </button>
          )}
          <button
            onClick={
              currentStep === 0
                ? handleStep0Submit
                : currentStep === 1
                ? handleStep1Submit
                : handleStep2Submit
            }
            disabled={
              (currentStep === 0 && otpSent && otpCode.length < 6) ||
              (currentStep === 1 && !isAddressComplete) ||
              updateMutation.isPending ||
              uploadMutation.isPending ||
              otpLoading
            }
            className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {otpLoading ? 'Aguarde...' :
              currentStep === STEPS.length - 1 ? 'Começar' :
              currentStep === 0 && !user && otpSent ? 'Verificar código' :
              currentStep === 0 && !user ? 'Enviar código' :
              'Próximo'}
          </button>
        </div>

      </div>

    </div>
  );
}