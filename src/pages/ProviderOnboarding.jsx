import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useMutation } from '@tanstack/react-query';
import {
  ChevronRight, ChevronDown, Eye, EyeOff,
  CheckCircle2, ShieldCheck, Camera,
  Zap, Star, Shield, Wrench, FileText,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';

const LOGO_URL = '/logo.png';

const STEPS = [
  { id: 1, label: 'Início' },
  { id: 2, label: 'Conta' },
  { id: 3, label: 'Código' },
  { id: 4, label: 'Pessoal' },
  { id: 5, label: 'Selfie' },
  { id: 6, label: 'Profissional' },
  { id: 7, label: 'Docs' },
];

const EXPERIENCE_OPTIONS = [
  'Menos de 1 ano',
  '1 a 2 anos',
  '3 a 4 anos',
  '5 anos ou mais',
];

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

const SOBRE_ITEMS = [
  { icon: Zap, text: 'Receba pedidos na sua região' },
  { icon: Wrench, text: 'Escolha os serviços que deseja realizar' },
  { icon: Star, text: 'Atenda, seja avaliado e aumente seus ganhos' },
  { icon: Shield, text: 'Receba com segurança pelo app' },
];

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
      <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${ok ? 'text-green-500' : 'text-border'}`} />
      {label}
    </div>
  );
}

const formatPhone = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits.length) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const formatCpf = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatCep = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

function DocRow({ label, sublabel, inputRef, fileUrl, fileName, loading, onUpload, accept, optional }) {
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');
  const done = !!fileUrl;
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${done ? 'bg-green-50 border-green-200' : 'bg-card border-border'}`}>
      <CheckCircle2 className={`w-5 h-5 shrink-0 ${done ? 'text-green-600' : 'text-border'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-green-700' : 'text-foreground'}`}>{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
        {fileName && !isPdf && <p className="text-xs text-muted-foreground truncate mt-0.5">{fileName}</p>}
        {fileName && isPdf && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">PDF</span>
            <span className="text-xs text-muted-foreground truncate">{fileName}</span>
          </div>
        )}
      </div>
      <input type="file" ref={inputRef} className="hidden" accept={accept} onChange={onUpload} />
      {fileUrl && !isPdf ? (
        <button onClick={() => inputRef.current?.click()} className="shrink-0">
          <img src={fileUrl} alt={label} className="w-14 h-10 object-cover rounded-lg border border-border" />
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="shrink-0 text-xs font-medium text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
        >
          {loading ? '...' : done ? 'Trocar' : 'Enviar'}
        </button>
      )}
    </div>
  );
}

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState(null);
  const { categories } = useServices();

  // Step 1 — Criar conta
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_RE.test(password);
  const matches = password.length > 0 && password === confirm;
  const passwordValid = hasMin8 && hasUpper && hasNumber && hasSpecial && matches;
  const strengthScore = [hasMin8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColors = ['border-border', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // Step 2 — OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Step 3 — Dados pessoais
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');

  // Step 4 — Selfie
  const selfieInputRef = useRef(null);
  const [selfieUrl, setSelfieUrl] = useState('');
  const [selfieLoading, setSelfieLoading] = useState(false);

  // Step 5 — Dados profissionais
  const [mainCategory, setMainCategory] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [experience, setExperience] = useState('');
  const [about, setAbout] = useState('');

  // Step 6 — Documentos
  const docIdRef = useRef(null);
  const docAddressRef = useRef(null);
  const docCertidaoRef = useRef(null);
  const [docIdUrl, setDocIdUrl] = useState('');
  const [docIdName, setDocIdName] = useState('');
  const [docIdLoading, setDocIdLoading] = useState(false);
  const [docAddressUrl, setDocAddressUrl] = useState('');
  const [docAddressName, setDocAddressName] = useState('');
  const [docAddressLoading, setDocAddressLoading] = useState(false);
  const [docCertidaoUrl, setDocCertidaoUrl] = useState('');
  const [docCertidaoName, setDocCertidaoName] = useState('');
  const [docCertidaoLoading, setDocCertidaoLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goServices = params.get('step') === 'services';
    api.auth.me().then(async (u) => {
      setUser(u);
      setName(u.fullName || u.full_name || '');
      setPhone(u.phone || '');
      setEmail(u.email || '');
      setCity(u.city || '');
      if (goServices) {
        const provProfiles = await api.entities.ProviderProfile.filter({ userId: u.id });
        if (provProfiles.length > 0) {
          const pp = provProfiles[0];
          setSelectedServices(pp.specialties || []);
          if (pp.mainCategory) setMainCategory(pp.mainCategory);
        }
        setStep(5);
        return;
      }
      setStep(3);
    }).catch(() => {});
  }, []);

  const startCountdown = () => {
    setOtpCountdown(45);
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
  const subcategories = mainCategoryData?.subcategories || [];

  const validateStep1 = () => {
    const errors = {};
    if (!name.trim() || name.trim().length < 3) errors.name = 'Nome deve ter ao menos 3 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'E-mail inválido.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) errors.phone = 'Celular com DDD: 10 ou 11 dígitos.';
    if (!passwordValid) errors.password = 'Senha não atende aos requisitos.';
    if (!termsAccepted) errors.terms = 'Aceite os termos para continuar.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canNext = ([
    true,
    !!(name.trim() && email.trim() && phone.trim() && passwordValid && termsAccepted),
    otpCode.length === 6,
    !!(address.trim() && city.trim()),
    true,
    !!mainCategory,
    true,
  ])[step] ?? true;

  const handleNext = async () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setOtpLoading(true);
      try {
        const { hasProfile } = await api.auth.checkProfile(email, 'provider');
        if (hasProfile) {
          navigate(`/login?role=provider&email=${encodeURIComponent(email)}`);
          return;
        }
        await api.auth.sendOtp({ email, fullName: name, phone, role: 'provider' });
        startCountdown();
        setStep(2);
      } catch (err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('already') || msg.includes('exist') || msg.includes('já') || msg.includes('cadastrado') || msg.includes('registered') || msg.includes('duplicate')) {
          setFieldErrors({ email: 'E-mail já cadastrado. Tente fazer login.' });
        } else {
          setFieldErrors({ email: err.message });
        }
      } finally {
        setOtpLoading(false);
      }
      return;
    }
    if (step === 2) {
      setOtpLoading(true);
      try {
        const res = await api.auth.verifyOtp({ email, otp: otpCode });
        if (res?.token) api.auth.setToken(res.token);
        await api.auth.setPassword(password);
        setFieldErrors({});
        setStep(3);
      } catch (err) {
        setFieldErrors({ otp: err.message || 'Código inválido ou expirado.' });
      } finally {
        setOtpLoading(false);
      }
      return;
    }
    if (step < 6) {
      setStep(step + 1);
    } else {
      saveMutation.mutate();
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let me = user;
      if (!me) me = await api.auth.me().catch(() => null);
      if (!me) { navigate('/'); return; }

      await api.auth.updateMe({ full_name: name, phone, city, birthDate, cpf });

      const existingUp = await api.entities.UserProfile.filter({ userId: me.id });
      const upData = { userId: me.id, role: 'provider', onboardingCompleted: true, firstAccess: false, address, zipCode };
      if (existingUp.length > 0) {
        await api.entities.UserProfile.update(existingUp[0].id, upData);
      } else {
        await api.entities.UserProfile.create(upData);
      }

      const existingProfiles = await api.entities.ProviderProfile.filter({ userId: me.id });
      const profileData = {
        name,
        city,
        specialties: selectedServices,
        description: about,
        experience,
        mainCategory,
        selfieUrl,
        docIdUrl,
        docAddressUrl,
        docCertidaoUrl,
        verificationStatus: 'pending',
        active: true,
      };
      if (existingProfiles.length > 0) {
        await api.entities.ProviderProfile.update(existingProfiles[0].id, profileData);
      } else {
        await api.entities.ProviderProfile.create({
          userId: me.id,
          rating: 0,
          reviewCount: 0,
          completedServices: 0,
          ...profileData,
        });
      }

      const existingSvcs = await api.entities.ProviderService.filter({ providerId: me.id });
      const existingByName = {};
      for (const svc of existingSvcs) existingByName[svc.serviceName || svc.specialty] = svc;

      for (const specialty of selectedServices) {
        const data = {
          providerId: me.id,
          serviceName: specialty,
          specialty,
          price: '',
          duration: '',
          homeCare: 'sim',
          freight: '',
          materials: 'provider',
          description: '',
          active: true,
        };
        if (existingByName[specialty]) {
          await api.entities.ProviderService.update(existingByName[specialty].id, data);
        } else {
          await api.entities.ProviderService.create(data);
        }
      }
    },
    onSuccess: () => setSaved(true),
  });

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieLoading(true);
    try { setSelfieUrl(await api.uploadFile(file)); }
    finally { setSelfieLoading(false); }
  };

  const makeDocUploader = (setUrl, setFileName, setLoading) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const url = await api.uploadFile(file);
      setUrl(url);
      setFileName(file.name);
    } finally {
      setLoading(false);
    }
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

  // Success screen
  if (saved) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              {['top-0 left-8', 'top-2 right-6', 'bottom-4 left-4', 'bottom-2 right-8', 'top-8 left-0', 'top-6 right-0'].map((pos, i) => (
                <span key={i} className={`absolute w-2 h-2 rounded-full ${['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-pink-400', 'bg-purple-400', 'bg-orange-400'][i % 6]} ${pos}`} />
              ))}
            </div>
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center z-10 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </div>

          <div>
            <h2 className="font-heading text-2xl font-bold text-foreground">Cadastro concluído!</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Sua conta está em análise.<br />Em breve você poderá receber pedidos.
            </p>
          </div>

          <button
            onClick={() => navigate('/provider')}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
          >
            Ir para o app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Steps indicator */}
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-border" />
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                  done ? 'bg-primary border-primary text-primary-foreground' :
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

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-8 overflow-y-auto">

        {/* Step 0: Sobre o app */}
        {step === 0 && (
          <div className="space-y-8">
            <div className="text-center">
              <img src={LOGO_URL} alt="ServiLocal" className="w-16 h-16 object-contain mx-auto mb-4" />
              <h2 className="font-heading text-2xl font-bold text-foreground leading-tight">
                Tudo que você precisa<br />para trabalhar
              </h2>
            </div>
            <div className="space-y-3">
              {SOBRE_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Criar conta */}
        {step === 1 && (
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
                placeholder="João Eletricista"
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
                placeholder="(11) 98765-4321"
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
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strengthScore ? strengthColors[strengthScore] : 'bg-border'}`} />
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <Rule ok={hasMin8} label="Mínimo 8 caracteres" />
                    <Rule ok={hasUpper} label="Uma letra maiúscula" />
                    <Rule ok={hasNumber} label="Um número" />
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

            <button
              onClick={() => setTermsAccepted(v => !v)}
              className="flex items-start gap-3 text-left w-full mt-1"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${termsAccepted ? 'bg-primary border-primary' : 'border-border'}`}>
                {termsAccepted && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <span className="text-xs text-muted-foreground">
                Li e aceito os{' '}
                <span className="text-primary font-medium">Termos de uso</span>
                {' '}e a{' '}
                <span className="text-primary font-medium">Política de privacidade</span>
              </span>
            </button>
            {fieldErrors.terms && <p className="text-xs text-red-500">{fieldErrors.terms}</p>}
          </div>
        )}

        {/* Step 2: Verificar telefone */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Verifique seu telefone</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Enviamos um código para<br />
                <strong className="text-foreground">{phone}</strong>
              </p>
            </div>

            <div className="flex gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  ref={el => (otpInputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpCode[i] || ''}
                  onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
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
                  <span className="text-primary font-semibold">
                    00:{String(otpCountdown).padStart(2, '0')}
                  </span>
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

        {/* Step 3: Dados pessoais */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">Seus dados pessoais</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">CPF</label>
              <input
                type="text"
                inputMode="numeric"
                value={cpf}
                onChange={e => setCpf(formatCpf(e.target.value))}
                placeholder="123.456.789-09"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Endereço <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua das Palmeiras, 123"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="São Bernardo do Campo - SP"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">CEP</label>
              <input
                type="text"
                inputMode="numeric"
                value={zipCode}
                onChange={e => setZipCode(formatCep(e.target.value))}
                placeholder="09710-000"
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}

        {/* Step 4: Selfie */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Faça uma selfie</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Verificamos sua identidade para aumentar sua confiabilidade.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <input
                type="file"
                accept="image/*"
                capture="user"
                ref={selfieInputRef}
                className="hidden"
                onChange={handleSelfieUpload}
              />
              <button
                onClick={() => selfieInputRef.current?.click()}
                className="relative w-44 h-44 rounded-full border-4 border-dashed border-primary/50 flex items-center justify-center bg-secondary/30 hover:bg-secondary/50 transition-colors overflow-hidden"
              >
                {selfieUrl ? (
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover rounded-full" />
                ) : selfieLoading ? (
                  <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="w-12 h-12" />
                    <span className="text-xs font-medium">Tirar selfie</span>
                  </div>
                )}
              </button>
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-xl border ${selfieUrl ? 'bg-green-50 border-green-200' : 'bg-card border-border'}`}>
              <CheckCircle2 className={`w-5 h-5 shrink-0 ${selfieUrl ? 'text-green-600' : 'text-border'}`} />
              <span className={`text-sm font-medium ${selfieUrl ? 'text-green-700' : 'text-muted-foreground'}`}>Selfie realizada</span>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Você pode pular e enviar depois nas configurações.
            </p>
          </div>
        )}

        {/* Step 5: Dados profissionais */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Dados profissionais</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Categoria principal <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={mainCategory}
                  onChange={e => { setMainCategory(e.target.value); setSelectedServices([]); }}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Tempo de experiência</label>
              <div className="relative">
                <select
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                >
                  <option value="">Selecione</option>
                  {EXPERIENCE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Sobre você{' '}
                <span className="text-muted-foreground text-xs font-normal">(opcional)</span>
              </label>
              <textarea
                value={about}
                onChange={e => setAbout(e.target.value)}
                placeholder="Sou eletricista especializado em instalações residenciais e prediais."
                rows={3}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>
        )}

        {/* Step 6: Documentos */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Envie seus documentos</h2>
            </div>

            <DocRow
              label="Documento com foto"
              sublabel="RG ou CNH"
              inputRef={docIdRef}
              fileUrl={docIdUrl}
              fileName={docIdName}
              loading={docIdLoading}
              onUpload={makeDocUploader(setDocIdUrl, setDocIdName, setDocIdLoading)}
              accept="image/*"
            />

            <DocRow
              label="Comprovante de endereço"
              inputRef={docAddressRef}
              fileUrl={docAddressUrl}
              fileName={docAddressName}
              loading={docAddressLoading}
              onUpload={makeDocUploader(setDocAddressUrl, setDocAddressName, setDocAddressLoading)}
              accept="image/*"
            />

            <DocRow
              label="Certidão de antecedentes"
              sublabel="(opcional)"
              inputRef={docCertidaoRef}
              fileUrl={docCertidaoUrl}
              fileName={docCertidaoName}
              loading={docCertidaoLoading}
              onUpload={makeDocUploader(setDocCertidaoUrl, setDocCertidaoName, setDocCertidaoLoading)}
              accept="image/*,application/pdf"
              optional
            />

            <p className="text-xs text-muted-foreground text-center pt-1">
              Os documentos são analisados em até 24h. Você pode enviar depois nas configurações.
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 px-6 py-4 bg-background border-t border-border">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleNext}
            disabled={!canNext || saveMutation.isPending || otpLoading}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending || otpLoading
              ? 'Aguarde...'
              : step === 6
              ? 'Enviar documentos'
              : step === 0
              ? 'Próximo'
              : 'Continuar'}
            <ChevronRight className="w-5 h-5" />
          </button>
          {saveMutation.isError && (
            <p className="text-xs text-red-500 text-center mt-2">
              {saveMutation.error?.message || 'Erro ao salvar. Verifique sua conexão e tente novamente.'}
            </p>
          )}
          {(step === 4 || step === 6) && (
            <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Esta etapa é opcional.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
