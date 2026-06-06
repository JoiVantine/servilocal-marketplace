import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/apiClient';
import { useServices } from '@/hooks/useServices';
import {
  ChevronLeft, ChevronDown, Camera, X, Loader2,
  Eye, EyeOff, CheckCircle2, Circle, ShieldCheck, Phone,
} from 'lucide-react';

const S_SERVICE = 0;
const S_DESCRIPTION = 1;
const S_WHEN = 2;
const S_ADDRESS = 3;
const S_REVIEW = 4;
const S_REGISTER = 5;
const S_PASSWORD = 6;
const S_OTP = 7;

const STEP_LABELS = ['Serviço', 'Descrição', 'Quando', 'Endereço', 'Revisão', 'Seus dados', 'Senha', 'Verificação'];
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

const formatPhone = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (!d.length) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </div>
  );
}

export default function NewServiceRequest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user, isLoadingAuth } = useAuth();
  const { categories } = useServices();
  const fileRef = useRef(null);
  const otpRefs = useRef([]);

  const [step, setStep] = useState(S_SERVICE);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [published, setPublished] = useState(false);

  // Service data
  const [category, setCategory] = useState(state?.category || '');
  const [subcategory, setSubcategory] = useState(state?.subcategory || '');
  const [catExpanded, setCatExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  // Schedule
  const [whenChoice, setWhenChoice] = useState('flexible');
  const [schedSlots, setSchedSlots] = useState([]);
  const [draftDate, setDraftDate] = useState('');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  // Address
  const [addrCep, setAddrCep] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [addrNoNum, setAddrNoNum] = useState(false);
  const [addrComplement, setAddrComplement] = useState('');
  const [addrNeighborhood, setAddrNeighborhood] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // Registration (non-auth)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const isPopNavigation = useRef(false);

  // Sync wizard steps with browser history so back button works
  useEffect(() => {
    if (isPopNavigation.current) { isPopNavigation.current = false; return; }
    if (step === S_SERVICE) {
      window.history.replaceState({ wizardStep: 0 }, '');
    } else {
      window.history.pushState({ wizardStep: step }, '');
    }
  }, [step]);

  useEffect(() => {
    const handlePop = (e) => {
      if (e.state?.wizardStep != null) {
        isPopNavigation.current = true;
        setStep(e.state.wizardStep);
        setErrors({});
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Pre-fill address for auth users
  useEffect(() => {
    if (!user) return;
    api.entities.UserProfile.filter({ userId: user.id }).then((profiles) => {
      const p = profiles?.[0];
      if (!p) return;
      setAddrCep(p.cep ? (p.cep.length > 5 ? `${p.cep.slice(0, 5)}-${p.cep.slice(5)}` : p.cep) : '');
      setAddrStreet(p.addressStreet || p.address?.split(',')[0]?.trim() || '');
      setAddrNumber(p.addressNumber || '');
      setAddrComplement(p.addressComplement || '');
      setAddrNeighborhood(p.neighborhood || '');
      setAddrCity(p.addressCity || user.city?.split(' - ')[0] || '');
      setAddrState(p.addressState || user.city?.split(' - ')[1] || '');
    }).catch(() => {});
  }, [user]);

  // OTP countdown
  useEffect(() => {
    if (step !== S_OTP) return;
    setOtpCountdown(600);
    setCanResend(false);
    const interval = setInterval(() => {
      setOtpCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const lookupCep = async (digits) => {
    if (digits.length !== 8) return;
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepError('CEP não encontrado.'); return; }
      setAddrStreet(data.logradouro || addrStreet);
      setAddrNeighborhood(data.bairro || addrNeighborhood);
      setAddrCity(data.localidade || addrCity);
      setAddrState(data.uf || addrState);
    } catch {
      setCepError('Não foi possível consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleOtpChange = (e, idx) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const chars = Array.from({ length: 6 }, (_, i) => otp[i] || '');
    chars[idx] = val;
    setOtp(chars.join(''));
    setErrors((p) => ({ ...p, otp: undefined }));
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    setOtp(pasted);
    setErrors((p) => ({ ...p, otp: undefined }));
    setTimeout(() => otpRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
  };

  const handlePhotoAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoError(true); e.target.value = ''; return; }
    setPhotoLoading(true);
    setPhotoError(false);
    try {
      const url = await api.uploadFile(file);
      setPhotos((prev) => [...prev, url]);
    } catch {
      setPhotoError(true);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  const buildPayload = () => {
    const numStr = addrNoNum ? 'S/N' : addrNumber;
    const addressLine = [addrStreet, numStr].filter(Boolean).join(', ');
    const fullAddress = [addressLine, addrComplement, addrNeighborhood, [addrCity, addrState].filter(Boolean).join(' - ')].filter(Boolean).join(' - ');
    const scheduleOptions = whenChoice === 'scheduled' && schedSlots.length > 0
      ? schedSlots.map(s => ({ date: s.date, startTime: s.start, endTime: s.end, label: `${s.date} entre ${s.start} e ${s.end}` }))
      : [];
    return {
      title: subcategory || category,
      description: description.trim(),
      category,
      subcategory,
      city: addrCity,
      neighborhood: addrNeighborhood,
      address: fullAddress,
      zipCode: addrCep.replace(/\D/g, ''),
      addressStreet: addrStreet,
      addressNumber: numStr,
      addressComplement: addrComplement,
      addressCity: addrCity,
      addressState: addrState,
      clientPhone: user?.phone || phone.replace(/\D/g, ''),
      when: scheduleOptions.length > 0 ? 'scheduled' : '',
      scheduledAt: scheduleOptions[0] ? `${scheduleOptions[0].date}T${scheduleOptions[0].startTime}` : undefined,
      scheduleOptions,
      photos,
      urgency: 'medium',
      status: 'open',
    };
  };

  const goBack = () => {
    if (step === S_SERVICE) { navigate('/client'); return; }
    window.history.back();
  };

  const total = user ? 5 : 8;
  const progress = Math.round(((step + 1) / total) * 100);
  const selectedCat = categories.find((c) => c.name === category);
  const minDate = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 10);

  // Password rules
  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_RE.test(password);
  const matches = password.length > 0 && password === confirm;
  const passwordValid = hasMin8 && hasUpper && hasNumber && hasSpecial && matches;
  const strengthScore = [hasMin8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColors = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // Step handlers
  const handleServiceNext = () => {
    if (!category) { setErrors({ category: 'Selecione a categoria.' }); return; }
    if (!subcategory && selectedCat?.subcategories?.length > 0) {
      setErrors({ subcategory: 'Selecione o serviço específico.' }); return;
    }
    setErrors({});
    setStep(S_DESCRIPTION);
  };

  const handleDescriptionNext = () => {
    if (!description.trim()) { setErrors({ description: 'A descrição é obrigatória.' }); return; }
    setErrors({});
    setStep(S_WHEN);
  };

  const handleWhenNext = () => { setErrors({}); setStep(S_ADDRESS); };

  const handleAddressNext = () => {
    const errs = {};
    if (!addrStreet.trim()) errs.street = 'Informe o logradouro';
    if (!addrNoNum && !addrNumber.trim()) errs.number = 'Informe o número ou marque "Sem número"';
    if (!addrNeighborhood.trim()) errs.neighborhood = 'Informe o bairro';
    if (!addrCity.trim()) errs.city = 'Informe a cidade';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(S_REVIEW);
  };

  const handleReviewNext = async () => {
    if (user) {
      setLoading(true);
      try {
        await api.entities.ServiceRequest.create(buildPayload());
        setPublished(true);
      } catch (err) {
        setErrors({ submit: err.message || 'Erro ao publicar pedido. Tente novamente.' });
      } finally {
        setLoading(false);
      }
    } else {
      setStep(S_REGISTER);
    }
  };

  const handleRegisterNext = async () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 3) errs.name = 'Digite seu nome completo (mínimo 3 caracteres)';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Digite um e-mail válido';
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 11) errs.phone = 'Celular com DDD: 10 ou 11 dígitos';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    setShowLoginPrompt(false);
    try {
      const { hasProfile } = await api.auth.checkProfile(email, 'client');
      if (hasProfile) { setShowLoginPrompt(true); setLoading(false); return; }
      setErrors({});
      setStep(S_PASSWORD);
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao verificar e-mail. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordNext = async () => {
    if (!passwordValid) { setErrors({ password: 'Corrija os requisitos da senha.' }); return; }
    setLoading(true);
    try {
      await api.auth.sendOtp({ email, fullName: name, phone, role: 'client' });
      setErrors({});
      setStep(S_OTP);
    } catch (err) {
      setErrors({ password: err.message || 'Erro ao enviar código. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpNext = async () => {
    if (otp.length < 6) { setErrors({ otp: 'Digite os 6 dígitos do código' }); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ email, otp });
      if (res?.token) api.auth.setToken(res.token);
      const userId = res?.user?.id || res?.user?._id;
      await api.auth.setPassword(password);
      const cityState = addrState ? `${addrCity} - ${addrState}` : addrCity;
      await api.auth.updateMe({ city: cityState }).catch(() => {});
      if (userId) {
        const profileData = {
          userId,
          neighborhood: addrNeighborhood,
          address: [addrStreet, addrNoNum ? 'S/N' : addrNumber].filter(Boolean).join(', '),
          cep: addrCep.replace(/\D/g, ''),
          city: cityState,
          role: 'client',
          onboardingCompleted: true,
          firstAccess: false,
          addressStreet: addrStreet,
          addressNumber: addrNoNum ? 'S/N' : addrNumber,
          addressComplement: addrComplement,
          addressCity: addrCity,
          addressState: addrState,
        };
        const existing = await api.entities.UserProfile.filter({ userId }).catch(() => []);
        if (existing.length > 0) {
          await api.entities.UserProfile.update(existing[0].id, profileData).catch(() => {});
        } else {
          await api.entities.UserProfile.create(profileData).catch(() => {});
        }
      }
      await api.entities.ServiceRequest.create(buildPayload());
      window.location.href = '/client';
    } catch (err) {
      setErrors({ otp: err.message || 'Código inválido ou expirado.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await api.auth.sendOtp({ email, fullName: name, phone, role: 'client' });
      setOtp('');
      setErrors({});
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (published) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center gap-6">
        <img src="/pedido-feito.png" alt="Pedido publicado" className="w-48 h-48 object-contain" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Pedido publicado!</h1>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Profissionais da sua região serão notificados e vão enviar propostas em breve.
          </p>
        </div>
        <button
          onClick={() => navigate('/client')}
          className="w-full max-w-xs py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity"
        >
          Ver meu pedido
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors">
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">{STEP_LABELS[step]}</p>
          <p className="text-xs text-muted-foreground">Etapa {step + 1} de {total}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-secondary">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${Math.min(progress, 100)}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">

          {/* ── STEP 0: Serviço ── */}
          {step === S_SERVICE && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Qual serviço você precisa?</h2>
                <p className="text-sm text-muted-foreground mt-1">Selecione a categoria e o tipo de serviço</p>
              </div>

              <div>
                <button
                  onClick={() => setCatExpanded(!catExpanded)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 border rounded-xl text-sm transition-colors ${
                    category ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <span>{category || 'Selecione a categoria'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${catExpanded ? 'rotate-180' : ''}`} />
                </button>

                {catExpanded && (
                  <div className="mt-2 border border-border rounded-xl overflow-hidden bg-card shadow-sm max-h-56 overflow-y-auto">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={cat.name}
                          onClick={() => { setCategory(cat.name); setSubcategory(''); setCatExpanded(false); setErrors({}); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-0 text-sm transition-colors ${
                            category === cat.name ? 'bg-primary/5 text-primary' : 'hover:bg-secondary/20 text-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="font-medium">{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.category && <p className="text-xs text-red-500 mt-2">{errors.category}</p>}
              </div>

              {category && selectedCat?.subcategories?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Qual serviço específico?</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCat.subcategories.map((sub) => (
                      <button
                        key={sub}
                        onClick={() => { setSubcategory(sub === subcategory ? '' : sub); setErrors({}); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          subcategory === sub
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                  {errors.subcategory && <p className="text-xs text-red-500 mt-2">{errors.subcategory}</p>}
                </div>
              )}

              <button onClick={handleServiceNext} disabled={!category}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                Próximo
              </button>
            </div>
          )}

          {/* ── STEP 1: Descrição ── */}
          {step === S_DESCRIPTION && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Descreva o que precisa</h2>
                <p className="text-sm text-muted-foreground mt-1">Quanto mais detalhes, melhores as propostas</p>
              </div>

              <div>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => { setDescription(e.target.value.slice(0, 300)); setErrors({}); }}
                    placeholder="Ex: Preciso pintar a sala, são 3 paredes de aproximadamente 4m × 3m, tinta branca fosca..."
                    rows={5}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none bg-card ${errors.description ? 'border-red-400' : 'border-border'}`}
                  />
                  <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 270 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {description.length}/300
                  </span>
                </div>
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>

              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Fotos <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                </p>
                <div className="flex gap-2 flex-wrap">
                  {photos.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
                      <button onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <button onClick={() => fileRef.current?.click()} disabled={photoLoading}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center hover:border-primary/50 hover:bg-secondary/40 transition-colors disabled:opacity-50">
                      {photoLoading ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> : <Camera className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                {photoError && <p className="text-xs text-red-500 mt-1">Falha ao enviar foto. Tente novamente.</p>}
              </div>

              <button onClick={handleDescriptionNext}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
                Próximo
              </button>
            </div>
          )}

          {/* ── STEP 2: Quando ── */}
          {step === S_WHEN && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Quando você precisa?</h2>
                <p className="text-sm text-muted-foreground mt-1">Você pode sugerir até 3 opções de horário</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'flexible', title: 'O mais rápido possível', sub: 'Sem data específica' },
                  { value: 'scheduled', title: 'Tenho preferência de horário', sub: 'Informe até 3 opções' },
                ].map(({ value, title, sub }) => (
                  <button key={value} onClick={() => setWhenChoice(value)}
                    className={`w-full flex items-center gap-3 px-4 py-4 border rounded-xl text-left transition-colors ${whenChoice === value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/20'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${whenChoice === value ? 'border-primary' : 'border-muted-foreground'}`}>
                      {whenChoice === value && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {whenChoice === 'scheduled' && (
                <div className="space-y-3">
                  {/* Slots adicionados */}
                  {schedSlots.map((slot, i) => (
                    <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{fmtDate(slot.date)}</p>
                        <p className="text-xs text-muted-foreground">Das {slot.start} às {slot.end}</p>
                      </div>
                      <button onClick={() => setSchedSlots(prev => prev.filter((_, j) => j !== i))}
                        className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  ))}

                  {/* Formulário de novo slot */}
                  {schedSlots.length < 3 && (
                    <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {schedSlots.length === 0 ? 'Opção 1' : `Opção ${schedSlots.length + 1}`}
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data</label>
                        <input type="date" value={draftDate} min={minDate} onChange={e => setDraftDate(e.target.value)}
                          className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Das</label>
                          <input type="time" value={draftStart} onChange={e => setDraftStart(e.target.value)}
                            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <span className="text-xs text-muted-foreground pb-3.5">até</span>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Às</label>
                          <input type="time" value={draftEnd} onChange={e => setDraftEnd(e.target.value)}
                            className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      {draftDate && draftStart && draftEnd && (
                        <button
                          onClick={() => {
                            setSchedSlots(prev => [...prev, { date: draftDate, start: draftStart, end: draftEnd }]);
                            setDraftDate(''); setDraftStart(''); setDraftEnd('');
                          }}
                          className="w-full py-2.5 border border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors">
                          + Adicionar opção
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button onClick={handleWhenNext}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
                {whenChoice === 'flexible' ? 'Próximo' : schedSlots.length > 0 ? 'Confirmar opções' : 'Pular'}
              </button>
            </div>
          )}

          {/* ── STEP 3: Endereço ── */}
          {step === S_ADDRESS && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Endereço do serviço</h2>
                <p className="text-sm text-muted-foreground mt-1">Onde o profissional irá atender você</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">CEP</label>
                <div className="relative">
                  <input type="text" inputMode="numeric" value={addrCep}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setAddrCep(raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw);
                      if (raw.length === 8) lookupCep(raw);
                    }}
                    placeholder="00000-000"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
                </div>
                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Rua / Logradouro <span className="text-red-500">*</span></label>
                <input type="text" value={addrStreet}
                  onChange={(e) => { setAddrStreet(e.target.value); setErrors((p) => ({ ...p, street: undefined })); }}
                  placeholder="Rua, Avenida, Travessa..."
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.street ? 'border-red-400' : 'border-border'}`} />
                {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Número {!addrNoNum && <span className="text-red-500">*</span>}</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input type="checkbox" checked={addrNoNum} onChange={(e) => { setAddrNoNum(e.target.checked); if (e.target.checked) { setAddrNumber(''); setErrors((p) => ({ ...p, number: undefined })); } }} className="w-4 h-4 rounded accent-primary" />
                    <span className="text-xs text-muted-foreground">Sem número</span>
                  </label>
                </div>
                <input type="text" value={addrNoNum ? 'S/N' : addrNumber}
                  onChange={(e) => { setAddrNumber(e.target.value); setErrors((p) => ({ ...p, number: undefined })); }}
                  disabled={addrNoNum} placeholder="123"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-secondary/50 disabled:text-muted-foreground ${errors.number ? 'border-red-400' : 'border-border'}`} />
                {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Complemento</label>
                <input type="text" value={addrComplement} onChange={(e) => setAddrComplement(e.target.value)}
                  placeholder="Apto, Bloco..." className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bairro <span className="text-red-500">*</span></label>
                <input type="text" value={addrNeighborhood}
                  onChange={(e) => { setAddrNeighborhood(e.target.value); setErrors((p) => ({ ...p, neighborhood: undefined })); }}
                  placeholder="Seu bairro"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.neighborhood ? 'border-red-400' : 'border-border'}`} />
                {errors.neighborhood && <p className="text-xs text-red-500 mt-1">{errors.neighborhood}</p>}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cidade <span className="text-red-500">*</span></label>
                  <input type="text" value={addrCity}
                    onChange={(e) => { setAddrCity(e.target.value); setErrors((p) => ({ ...p, city: undefined })); }}
                    placeholder="Sua cidade"
                    className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.city ? 'border-red-400' : 'border-border'}`} />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-foreground mb-1.5">UF</label>
                  <input type="text" value={addrState} onChange={(e) => setAddrState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP" className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-center" />
                </div>
              </div>

              <button onClick={handleAddressNext}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
                Próximo
              </button>
            </div>
          )}

          {/* ── STEP 4: Revisão ── */}
          {step === S_REVIEW && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Revisão do pedido</h2>
                <p className="text-sm text-muted-foreground mt-1">Confira os dados antes de publicar</p>
              </div>

              {[
                {
                  label: 'SERVIÇO', goTo: S_SERVICE,
                  content: (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">{category}</p>
                      {subcategory && <span className="inline-block text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">{subcategory}</span>}
                    </div>
                  ),
                },
                {
                  label: 'DESCRIÇÃO', goTo: S_DESCRIPTION,
                  content: (
                    <div className="space-y-2">
                      <p className="text-sm text-foreground leading-relaxed">{description}</p>
                      {photos.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {photos.map((url, i) => <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />)}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  label: 'QUANDO', goTo: S_WHEN,
                  content: whenChoice === 'flexible' || schedSlots.length === 0
                    ? <p className="text-sm text-foreground">O mais rápido possível</p>
                    : (
                      <div className="space-y-1">
                        {schedSlots.map((s, i) => (
                          <p key={i} className="text-sm text-foreground">
                            {fmtDate(s.date)} — das {s.start} às {s.end}
                          </p>
                        ))}
                      </div>
                    ),
                },
                {
                  label: 'ENDEREÇO', goTo: S_ADDRESS,
                  content: (
                    <div className="space-y-0.5">
                      <p className="text-sm text-foreground font-medium">{addrStreet}{addrNoNum ? ', S/N' : addrNumber ? `, ${addrNumber}` : ''}</p>
                      {addrComplement && <p className="text-sm text-muted-foreground">{addrComplement}</p>}
                      <p className="text-sm text-muted-foreground">{addrNeighborhood}</p>
                      <p className="text-sm text-muted-foreground">{addrCity}{addrState ? ` - ${addrState}` : ''}</p>
                    </div>
                  ),
                },
              ].map(({ label, goTo, content }) => (
                <div key={label} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground tracking-widest">{label}</p>
                    <button onClick={() => setStep(goTo)} className="text-xs text-primary font-medium">Editar</button>
                  </div>
                  {content}
                </div>
              ))}

              {errors.submit && <p className="text-xs text-red-500 text-center">{errors.submit}</p>}

              <button onClick={handleReviewNext} disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? 'Publicando...' : user ? 'Publicar pedido' : 'Continuar'}
              </button>
            </div>
          )}

          {/* ── STEP 5: Estamos quase lá ── */}
          {step === S_REGISTER && (
            <div className="space-y-5">
              <div className="text-center pt-2">
                <p className="text-sm font-medium text-primary">Quase lá!</p>
                <h2 className="text-2xl font-bold text-foreground leading-snug mt-1">Estamos quase lá</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  Informe seus dados para receber as propostas dos profissionais
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nome completo <span className="text-red-500">*</span></label>
                <input type="text" value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Seu nome completo"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.name ? 'border-red-400' : 'border-border'}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Celular com DDD <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="tel" value={phone}
                    onChange={(e) => { setPhone(formatPhone(e.target.value)); setErrors((p) => ({ ...p, phone: undefined })); setShowLoginPrompt(false); }}
                    placeholder="(DDD) 90000-0000"
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.phone ? 'border-red-400' : 'border-border'}`} />
                </div>
                {errors.phone
                  ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  : <p className="text-xs text-muted-foreground mt-1">O código de verificação será enviado por aqui</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">E-mail <span className="text-red-500">*</span></label>
                <input type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); setShowLoginPrompt(false); }}
                  placeholder="seu@email.com"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.email ? 'border-red-400' : 'border-border'}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {errors.submit && <p className="text-xs text-red-500 text-center">{errors.submit}</p>}

              {showLoginPrompt && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                  <p className="text-sm text-amber-800 font-medium">Já existe uma conta com este e-mail.</p>
                  <p className="text-xs text-amber-700">Faça login para continuar com seu pedido.</p>
                  <button onClick={() => navigate(`/login?role=client&email=${encodeURIComponent(email)}`)}
                    className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors">
                    Entrar na minha conta
                  </button>
                </div>
              )}

              <button onClick={handleRegisterNext} disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? 'Verificando...' : 'Enviar código por WhatsApp'}
              </button>
            </div>
          )}

          {/* ── STEP 6: Senha ── */}
          {step === S_PASSWORD && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Crie sua senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Escolha uma senha segura para sua conta</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < strengthScore ? strengthColors[strengthScore] : 'bg-border'}`} />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <input type={showConfirm ? 'text' : 'password'} value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${confirm.length > 0 && !matches ? 'border-red-400' : 'border-border'}`} />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm.length > 0 && !matches && <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>}
              </div>

              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <Rule ok={hasMin8} label="Mínimo 8 caracteres" />
                <Rule ok={hasUpper} label="Pelo menos uma letra maiúscula" />
                <Rule ok={hasNumber} label="Pelo menos um número" />
                <Rule ok={hasSpecial} label="Pelo menos um caractere especial" />
              </div>

              {errors.password && <p className="text-xs text-red-500 text-center">{errors.password}</p>}

              <button onClick={handlePasswordNext} disabled={loading || !passwordValid}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? 'Enviando código...' : 'Confirmar e validar WhatsApp'}
              </button>

              <div className="flex items-center justify-center gap-2 py-2">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Seus dados são protegidos e nunca compartilhados</p>
              </div>
            </div>
          )}

          {/* ── STEP 7: OTP ── */}
          {step === S_OTP && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Valide seu WhatsApp</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enviamos um código para<br />
                  <span className="font-medium text-foreground">{phone}</span>
                </p>
              </div>

              <div>
                <div className="flex gap-2 justify-center">
                  {Array.from({ length: 6 }, (_, i) => (
                    <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={1} value={otp[i] || ''}
                      onChange={(e) => handleOtpChange(e, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={`w-11 h-14 shrink-0 text-center border-2 rounded-xl text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                        errors.otp ? 'border-red-400' : otp[i] ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    />
                  ))}
                </div>
                {errors.otp && <p className="text-xs text-red-500 mt-2 text-center">{errors.otp}</p>}
              </div>

              <div className="text-center">
                {canResend
                  ? <button onClick={handleResendOtp} disabled={loading} className="text-sm text-primary font-medium underline disabled:opacity-50">Reenviar código</button>
                  : <p className="text-sm text-muted-foreground">Reenviar em <span className="font-medium text-foreground">{String(Math.floor(otpCountdown / 60)).padStart(2, '0')}:{String(otpCountdown % 60).padStart(2, '0')}</span></p>
                }
              </div>

              <button onClick={handleOtpNext} disabled={loading || otp.length < 6}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {loading ? 'Publicando pedido...' : 'Confirmar e publicar pedido'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
