import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Check, Upload, MapPin, Phone, Camera, Image, X, Mail, ShieldCheck } from 'lucide-react';
import AddressFormWithMap from '../components/AddressFormWithMap';

const STEPS = [
  { id: 1, label: 'Foto e Perfil' },
  { id: 2, label: 'Localização' },
  { id: 3, label: 'Resumo' },
];

export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [submitError, setSubmitError] = useState(null);

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
  const otpRefs = useRef([]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
        setFormData((prev) => ({
          ...prev,
          city: me.city || '',
          name: me.fullName || '',
          email: me.email || '',
          phone: me.phone || '',
        }));
        if (searchParams.get('step') === '1') setCurrentStep(1);
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
    mutationFn: (file) => api.uploadFile(file),
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

  const handleOtpBoxChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const chars = Array.from({ length: 6 }, (_, i) => otpCode[i] || '');
    chars[idx] = val;
    setOtpCode(chars.join(''));
    setFieldErrors(p => ({ ...p, otp: undefined }));
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpBoxKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otpCode[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtpCode(pasted);
    setFieldErrors(p => ({ ...p, otp: undefined }));
    setTimeout(() => otpRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
  };

  const handleStep0Submit = async () => {
    // Já autenticado — só atualizar e avançar
    if (user) {
      const updates = { full_name: formData.name, email: formData.email };
      if (formData.photo) {
        try {
          const photoUrl = await uploadMutation.mutateAsync(formData.photo);
          if (photoUrl) updates.photo = photoUrl;
        } catch {
          setFieldErrors(prev => ({ ...prev, photo: 'Erro ao enviar foto. Tente novamente.' }));
          return;
        }
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
      if (res?.token) api.auth.setToken(res.token);
      if (formData.photo) {
        try {
          const photoUrl = await api.uploadFile(formData.photo);
          if (photoUrl) await api.auth.updateMe({ photo: photoUrl });
        } catch { /* best effort */ }
      }
      navigate(`/setup-password?email=${encodeURIComponent(formData.email)}&next=${encodeURIComponent('/client/onboarding?step=1')}`);
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
    formData.address?.numero?.trim() &&
    (!formData.address?.sn || formData.address?.complemento?.trim());

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
    setSubmitError(null);
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
        firstAccess: false,
      };
      if (existing.length > 0) {
        await api.entities.UserProfile.update(existing[0].id, profileData);
      } else {
        await api.entities.UserProfile.create(profileData);
      }
      navigate('/client');
    } catch (err) {
      setSubmitError(err.message || 'Erro ao finalizar cadastro. Tente novamente.');
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
      <div className="border-b border-border bg-card">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ServiLocal" className="w-6 h-6" />
            <span className="text-sm font-semibold text-foreground">ServiLocal</span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  idx <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {idx < currentStep || currentStep === STEPS.length - 1 ? (
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
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">Passo {currentStep + 1} de {STEPS.length}</span>
        </div>

        {/* Step 0: Foto e Perfil */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground mb-1">
                Crie seu perfil
              </h2>
            </div>

            {/* Photo Upload — secondary, optional */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Foto de perfil <span className="opacity-60">(opcional)</span></p>
              <div className="flex items-center gap-3">
                {formData.photoPreview ? (
                  <img
                    src={formData.photoPreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-border flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                  >
                    {formData.photoPreview ? 'Mudar foto' : 'Adicionar foto'}
                  </button>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">JPG ou PNG, máx 5MB</p>
                </div>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </div>
              {fieldErrors.photo && (
                <p className="text-xs text-red-500">{fieldErrors.photo}</p>
              )}
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
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-700 font-medium">Código enviado! Verifique seu WhatsApp.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Código de verificação <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2 justify-center">
                    {Array.from({ length: 6 }, (_, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otpCode[i] || ''}
                        onChange={e => handleOtpBoxChange(e, i)}
                        onKeyDown={e => handleOtpBoxKeyDown(e, i)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        className={`w-11 h-12 text-center border-2 rounded-lg text-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                          fieldErrors.otp ? 'border-red-400' : otpCode[i] ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      />
                    ))}
                  </div>
                  {fieldErrors.otp && <p className="text-xs text-red-500 mt-2 text-center">{fieldErrors.otp}</p>}
                </div>

                <div className="text-center pt-1">
                  <p className="text-xs text-muted-foreground">Não recebeu?</p>
                  <button
                    onClick={async () => {
                      setOtpLoading(true);
                      try { await api.auth.sendOtp({ email: formData.email, fullName: formData.name, phone: formData.phone, role: 'client' }); } catch {}
                      setOtpLoading(false);
                    }}
                    className="text-xs text-primary underline mt-0.5"
                  >
                    Reenviar código
                  </button>
                </div>
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
              <h2 className="font-heading text-xl font-bold text-foreground mb-1">Tudo pronto!</h2>
              <p className="text-muted-foreground text-sm">Seu perfil foi configurado com sucesso.</p>
            </div>

            {/* Perfil */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> PERFIL
              </p>
              <div className="p-4 bg-card border border-border rounded-xl">
                <p className="font-medium text-foreground">{formData.name}</p>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> CONTATO
              </p>
              <div className="p-4 bg-card border border-border rounded-xl space-y-1.5">
                <p className="text-sm text-foreground">{formData.email}</p>
                <p className="text-sm text-foreground">{formData.phone}</p>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> ENDEREÇO
              </p>
              <div className="p-4 bg-card border border-border rounded-xl space-y-0.5">
                {formData.address ? (
                  <>
                    <p className="text-sm text-foreground">
                      {formData.address.endereco}{formData.address.numero ? `, ${formData.address.numero}` : ''}
                    </p>
                    {formData.address.complemento && (
                      <p className="text-sm text-muted-foreground">{formData.address.complemento}</p>
                    )}
                    {formData.address.bairro && (
                      <p className="text-sm text-muted-foreground">{formData.address.bairro}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {formData.address.cidade}{formData.address.estado ? ` - ${formData.address.estado}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-foreground">{formData.city}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        {submitError && (
          <p className="text-xs text-red-500 text-center mt-6">{submitError}</p>
        )}
        <div className="flex gap-3 mt-3">
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