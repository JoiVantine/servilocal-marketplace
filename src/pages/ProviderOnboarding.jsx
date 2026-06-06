import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronRight, Eye, EyeOff, CheckCircle2,
  MapPin, Plus, X, MoreHorizontal, Camera, Loader2,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import AddressFormWithMap from '@/components/AddressFormWithMap';

const LOGO_URL = '/onboarding-city.png';

const STEPS = [
  { id: 1, label: 'Dados' },
  { id: 2, label: 'Verificação' },
  { id: 3, label: 'Foto' },
  { id: 4, label: 'Atendimento' },
  { id: 5, label: 'Serviços' },
];

const MAIN_CAT_NAMES = [
  'Construção e Reformas',
  'Elétrica',
  'Hidráulica',
  'Pintura',
  'Limpeza',
  'Serviços Domésticos',
];

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? 'text-green-500' : 'text-border'}`} />
      {label}
    </div>
  );
}

const formatPhone = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (!d.length) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const fmtCountdown = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const { categories } = useServices();

  // ── Step 0: Conta ──────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const hasMin8    = password.length >= 8;
  const hasUpper   = /[A-Z]/.test(password);
  const hasNumber  = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_RE.test(password);
  const matches    = password.length > 0 && password === confirm;
  const passwordValid  = hasMin8 && hasUpper && hasNumber && hasSpecial && matches;
  const strengthScore  = [hasMin8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColors = ['border-border', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // ── Step 1: OTP ────────────────────────────────────────────────
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef(null);
  const otpInputRefs = useRef([]);

  // ── Step 2: Foto ───────────────────────────────────────────────
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef(null);

  // ── Step 3: Endereço base ──────────────────────────────────────
  const [providerAddress, setProviderAddress] = useState(null);

  // ── Step 3: Profissional ───────────────────────────────────────
  const [mainCategory, setMainCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [servicePricing, setServicePricing] = useState({});
  const [showOthersModal, setShowOthersModal] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goServices = params.get('step') === 'services';
    api.auth.me().then(async (u) => {
      setUser(u);
      setName(u.fullName || u.full_name || '');
      setPhone(u.phone || '');
      setEmail(u.email || '');
      if (goServices) {
        const provProfiles = await api.entities.ProviderProfile.filter({ userId: u.id });
        if (provProfiles.length > 0) {
          const pp = provProfiles[0];
          setSelectedServices(pp.specialties || []);
          if (pp.mainCategory) setMainCategory(pp.mainCategory);
          if (pp.serviceAreas?.length) setServiceAreas(pp.serviceAreas);
        }
        setStep(4);
        return;
      }
      setStep(3);
    }).catch(() => {});
  }, []);

  const startCountdown = () => {
    setOtpCountdown(600);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const mainCategoryData = categories.find(c => c.name === mainCategory);
  const subcategories    = mainCategoryData?.subcategories || [];
  const mainCats         = categories.filter(c => MAIN_CAT_NAMES.includes(c.name));

  const validateStep0 = () => {
    const errors = {};
    if (!name.trim() || name.trim().length < 3) errors.name = 'Nome deve ter ao menos 3 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'E-mail inválido.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) errors.phone = 'Celular com DDD: 10 ou 11 dígitos.';
    if (!passwordValid) errors.password = 'Senha não atende aos requisitos.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canNext = ([
    !!(name.trim() && email.trim() && phone.trim() && passwordValid),
    otpCode.length === 6,
    true, // foto é opcional
    !!(providerAddress?.coords?.lat),
    !!mainCategory,
  ])[step] ?? true;

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep0()) return;
      setOtpLoading(true);
      setShowLoginPrompt(false);
      try {
        const { hasProfile } = await api.auth.checkProfile(email, 'provider');
        if (hasProfile) {
          setShowLoginPrompt(true);
          setOtpLoading(false);
          return;
        }
        await api.auth.sendOtp({ email, fullName: name, phone, role: 'provider' });
        startCountdown();
        setStep(1);
      } catch (err) {
        setFieldErrors({ email: err.message || 'Erro ao verificar conta.' });
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    if (step === 1) {
      setOtpLoading(true);
      try {
        const res = await api.auth.verifyOtp({ email, otp: otpCode });
        if (res?.token) api.auth.setToken(res.token);
        await api.auth.setPassword(password);
        const u = await api.auth.me().catch(() => null);
        if (u) setUser(u);
        setFieldErrors({});
        setStep(2);
      } catch (err) {
        setFieldErrors({ otp: err.message || 'Código inválido ou expirado.' });
      } finally {
        setOtpLoading(false);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      setStep(4);
      return;
    }

    saveMutation.mutate();
  };

  const handleOtpInput = (i, val) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const arr = otpCode.split('');
    arr[i] = digit;
    const newCode = arr.join('').slice(0, 6);
    setOtpCode(newCode);
    setFieldErrors(p => ({ ...p, otp: undefined }));
    if (digit && i < 5) otpInputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
      otpInputRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    setOtpCode(digits);
    setFieldErrors(p => ({ ...p, otp: undefined }));
    otpInputRefs.current[Math.min(digits.length, 5)]?.focus();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let me = user;
      if (!me) me = await api.auth.me().catch(() => null);
      if (!me) throw new Error('Sessão expirada. Faça login novamente.');

      const existingUp = await api.entities.UserProfile.filter({ userId: me.id });
      const upData = { userId: me.id, role: 'provider', onboardingCompleted: true, firstAccess: false };
      if (existingUp.length > 0) {
        await api.entities.UserProfile.update(existingUp[0].id, upData);
      } else {
        await api.entities.UserProfile.create(upData);
      }

      const existingProfiles = await api.entities.ProviderProfile.filter({ userId: me.id });
      const profileData = {
        name, phone,
        city: providerAddress?.cidade || '',
        lat: providerAddress?.coords?.lat || null,
        lng: providerAddress?.coords?.lng || null,
        cep: providerAddress?.cep || '',
        endereco: providerAddress?.endereco || '',
        numero: providerAddress?.numero || '',
        estado: providerAddress?.estado || '',
        specialties: selectedServices,
        mainCategory,
        ...(photoUrl ? { photo: photoUrl } : {}),
        verificationStatus: 'pending',
        active: true,
      };
      if (existingProfiles.length > 0) {
        await api.entities.ProviderProfile.update(existingProfiles[0].id, profileData);
      } else {
        await api.entities.ProviderProfile.create({
          userId: me.id, rating: 0, reviewCount: 0, completedServices: 0,
          ...profileData,
        });
      }

      const existingSvcs = await api.entities.ProviderService.filter({ providerId: me.id });
      const existingByName = {};
      for (const svc of existingSvcs) existingByName[svc.serviceName || svc.specialty] = svc;

      for (const specialty of selectedServices) {
        const pricing = servicePricing[specialty] || {};
        const data = {
          providerId: me.id, serviceName: specialty, specialty,
          price: pricing.price || '', duration: pricing.duration || '',
          homeCare: 'sim', freight: '', materials: 'provider', description: '', active: true,
        };
        if (existingByName[specialty]) {
          await api.entities.ProviderService.update(existingByName[specialty].id, data);
        } else {
          await api.entities.ProviderService.create(data);
        }
      }
    },
    onSuccess: () => setStep(5),
  });

  if (step === 5) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-4">
        <img src="/comemoração 1.png" alt="Perfil criado" className="w-48 h-48 object-contain" />
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-bold text-foreground">Perfil criado!</h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Agora você pode receber pedidos da sua região. Fique de olho nas notificações.
          </p>
        </div>
        <button
          onClick={() => navigate('/provider')}
          className="w-full max-w-xs py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
        >
          Ir para o painel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Topo ─────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="ServiLocal" className="w-6 h-6 object-contain" />
            <span className="text-sm font-bold text-foreground">Servi<span className="text-primary">Local</span></span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-secondary/50"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Sair
          </button>
        </div>
      </div>

      {/* ── Indicador de etapas ───────────────────────────────────── */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-border" />
          {STEPS.map((s, i) => {
            const done   = i < Math.min(step, STEPS.length);
            const active = i === step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done   ? 'bg-primary border-primary text-primary-foreground' :
                  active ? 'bg-card border-primary text-primary' :
                           'bg-card border-border text-muted-foreground'
                }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className={`text-[9px] font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-8 overflow-y-auto">

        {/* ── Etapa 0: Criar conta ─────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">Crie sua conta</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Nome completo <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }}
                placeholder="João Silva"
                className={`w-full px-4 py-3 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">E-mail <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                placeholder="joao@exemplo.com"
                className={`w-full px-4 py-3 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 ${fieldErrors.email ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Celular com DDD <span className="text-red-500">*</span></label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setFieldErrors(p => ({ ...p, phone: undefined })); }}
                placeholder="(DDD) 90000-0000"
                className={`w-full px-4 py-3 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 ${fieldErrors.phone ? 'border-red-400' : 'border-border'}`}
              />
              {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Senha <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 ${fieldErrors.password ? 'border-red-400' : 'border-border'}`}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <>
                  <div className="flex gap-1 mt-1.5">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strengthScore ? strengthColors[strengthScore] : 'bg-border'}`} />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <Rule ok={hasMin8}    label="Mínimo 8 caracteres" />
                    <Rule ok={hasUpper}   label="Uma letra maiúscula" />
                    <Rule ok={hasNumber}  label="Um número" />
                    <Rule ok={hasSpecial} label="Um caractere especial" />
                  </div>
                </>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Confirmar senha <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 ${confirm.length > 0 && !matches ? 'border-red-400' : 'border-border'}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirm.length > 0 && !matches && <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>}
            </div>
          </div>
        )}

        {/* ── Etapa 1: Verificar código ────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Verifique seu WhatsApp</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Enviamos um código para o WhatsApp<br />
                <strong className="text-foreground">{phone}</strong>
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              {[0,1,2,3,4,5].map(i => (
                <input
                  key={i}
                  ref={el => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpCode[i] || ''}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={handleOtpPaste}
                  className={`w-11 h-14 text-center text-xl font-bold border-2 rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${
                    otpCode[i] ? 'border-primary' : fieldErrors.otp ? 'border-red-400' : 'border-border'
                  }`}
                />
              ))}
            </div>
            {fieldErrors.otp && <p className="text-xs text-red-500 text-center">{fieldErrors.otp}</p>}

            <div className="text-center">
              {otpCountdown > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Reenviar código em{' '}
                  <span className="text-primary font-semibold">{fmtCountdown(otpCountdown)}</span>
                </p>
              ) : (
                <button
                  onClick={async () => {
                    setOtpLoading(true);
                    try {
                      await api.auth.sendOtp({ email, fullName: name, phone, role: 'provider' });
                      setOtpCode('');
                      startCountdown();
                    } catch (err) {
                      setFieldErrors(p => ({ ...p, otp: err.message || 'Falha ao reenviar.' }));
                    } finally {
                      setOtpLoading(false);
                    }
                  }}
                  className="text-sm text-primary font-semibold underline"
                >
                  Reenviar código
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Etapa 2: Foto ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground">Adicione uma foto</h2>
              <p className="text-sm text-muted-foreground mt-1">Perfis com foto recebem mais propostas</p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full border-2 border-dashed border-border bg-secondary/30 flex items-center justify-center overflow-hidden">
                  {photoUrl
                    ? <img src={photoUrl} alt="foto" className="w-full h-full object-cover" />
                    : <Camera className="w-8 h-8 text-muted-foreground" />
                  }
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoLoading}
                  className="absolute -bottom-1 -right-1 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {photoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </button>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setPhotoLoading(true);
                  try {
                    const url = await api.uploadFile(file);
                    setPhotoUrl(url);
                  } catch { /* silent */ } finally {
                    setPhotoLoading(false);
                    e.target.value = '';
                  }
                }}
              />
              {photoUrl
                ? <button onClick={() => setPhotoUrl('')} className="text-xs text-muted-foreground underline">Remover foto</button>
                : <p className="text-xs text-muted-foreground">Toque no botão para escolher uma foto</p>
              }
            </div>
          </div>
        )}

        {/* ── Etapa 3: Endereço base ──────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Seu endereço base</h2>
              <p className="text-sm text-muted-foreground mt-1">Exibiremos pedidos em até 20km da sua localização</p>
            </div>
            <AddressFormWithMap
              onAddressChange={(data) => setProviderAddress(data)}
              initialData={providerAddress}
            />
          </div>
        )}

        {/* ── Etapa 4: Serviços ───────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Dados profissionais</h2>
            </div>

            {/* Grid de categorias */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Categoria principal <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {mainCats.map(cat => {
                  const Icon = cat.icon;
                  const isActive = mainCategory === cat.name;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => { setMainCategory(cat.name); setSelectedServices([]); }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-card border-border text-foreground hover:border-primary/40'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="text-[10px] font-medium text-center leading-tight">{cat.name}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => setShowOthersModal(true)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    mainCategory && !MAIN_CAT_NAMES.includes(mainCategory)
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-card border-border text-foreground hover:border-primary/40'
                  }`}
                >
                  <MoreHorizontal className="w-6 h-6" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {mainCategory && !MAIN_CAT_NAMES.includes(mainCategory) ? mainCategory : 'Outros'}
                  </span>
                </button>
              </div>
            </div>

            {/* Subcategorias */}
            {mainCategory && subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Serviços que realiza</label>
                <div className="flex flex-wrap gap-2">
                  {subcategories.map(sub => {
                    const active = selectedServices.includes(sub);
                    return (
                      <button
                        key={sub}
                        onClick={() => setSelectedServices(prev =>
                          active ? prev.filter(s => s !== sub) : [...prev, sub]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card border-border text-foreground hover:border-primary/50'
                        }`}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Botão inferior ───────────────────────────────────────── */}
      <div className="sticky bottom-0 px-6 py-4 bg-background border-t border-border">
        <div className="max-w-md mx-auto space-y-3">
          {showLoginPrompt && step === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
              <p className="text-sm text-amber-800 font-medium">Já existe uma conta com este e-mail.</p>
              <p className="text-xs text-amber-700">Gostaria de fazer login?</p>
              <button
                onClick={() => navigate(`/login?role=provider&email=${encodeURIComponent(email)}`)}
                className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
              >
                Entrar na minha conta
              </button>
            </div>
          )}
          <button
            onClick={handleNext}
            disabled={!canNext || saveMutation.isPending || otpLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending || otpLoading
              ? 'Aguarde...'
              : step === 4
              ? 'Finalizar cadastro'
              : step === 2 && !photoUrl
              ? 'Pular'
              : 'Continuar'}
            <ChevronRight className="w-5 h-5" />
          </button>
          {saveMutation.isError && (
            <p className="text-xs text-red-500 text-center mt-2">
              {saveMutation.error?.message || 'Erro ao salvar. Verifique sua conexão e tente novamente.'}
            </p>
          )}
        </div>
      </div>

      {/* ── Modal: Outras categorias ─────────────────────────────── */}
      {showOthersModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center md:justify-center"
          onClick={() => setShowOthersModal(false)}
        >
          <div
            className="bg-card rounded-t-2xl md:rounded-2xl w-full md:max-w-lg flex flex-col shadow-xl"
            style={{ maxHeight: '75dvh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground">Outras categorias</h3>
              <button onClick={() => setShowOthersModal(false)} className="p-1.5 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                const isActive = mainCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setMainCategory(cat.name);
                      setSelectedServices([]);
                      setShowOthersModal(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-primary/10 border-primary'
                        : 'bg-background border-border hover:bg-secondary/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-sm font-medium flex-1 ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {cat.name}
                    </span>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
