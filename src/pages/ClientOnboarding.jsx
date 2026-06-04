import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { Check, Eye, EyeOff, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Dados' },
  { id: 2, label: 'Verificação' },
  { id: 3, label: 'Senha' },
  { id: 4, label: 'Endereço' },
  { id: 5, label: 'Resumo' },
];

const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

function Rule({ ok, label }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-muted-foreground'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <Circle className="w-3.5 h-3.5 shrink-0" />}
      {label}
    </div>
  );
}

function formatPhone(val) {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ClientOnboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 0 — Dados
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 1 — Verificação
  const [otp, setOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef([]);

  // Step 2 — Senha
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3 — Endereço
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  // Password rules
  const hasMin8 = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_RE.test(password);
  const matches = password.length > 0 && password === confirm;
  const rulesOk = hasMin8 && hasUpper && hasNumber && hasSpecial;
  const passwordValid = rulesOk && matches;

  const strengthScore = [hasMin8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthColors = ['border-border', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  // OTP countdown
  useEffect(() => {
    if (step !== 1) return;
    setOtpCountdown(60);
    setCanResend(false);
    const interval = setInterval(() => {
      setOtpCountdown((c) => {
        if (c <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // CEP lookup
  const lookupCep = async (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setRua(data.logradouro || '');
        setBairro(data.bairro || '');
        setCidade(data.localidade || '');
        setUf(data.uf || '');
      }
    } catch { /* silent */ } finally {
      setCepLoading(false);
    }
  };

  // OTP input handlers
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

  // Step handlers
  const handleStep0 = async () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 3) errs.name = 'Digite seu nome completo (mínimo 3 caracteres)';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) errs.phone = 'Digite um celular válido com DDD';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Digite um e-mail válido';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.auth.sendOtp({ email, fullName: name, phone: phone.replace(/\D/g, ''), role: 'client' });
      setErrors({});
      setStep(1);
    } catch (err) {
      setErrors({ submit: err.message || 'Erro ao enviar código. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStep1 = async () => {
    if (otp.length < 6) { setErrors({ otp: 'Digite os 6 dígitos do código' }); return; }
    setLoading(true);
    try {
      const res = await api.auth.verifyOtp({ email, otp });
      if (res?.token) api.auth.setToken(res.token);
      setErrors({});
      setStep(2);
    } catch (err) {
      setErrors({ otp: err.message || 'Código inválido ou expirado.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await api.auth.sendOtp({ email, fullName: name, phone: phone.replace(/\D/g, ''), role: 'client' });
      setOtp('');
      setErrors({});
      setStep(1); // re-triggers countdown useEffect
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!passwordValid) {
      setErrors({ password: 'Corrija os requisitos da senha antes de continuar.' });
      return;
    }
    setLoading(true);
    try {
      await api.auth.setPassword(password);
      setErrors({});
      setStep(3);
    } catch (err) {
      setErrors({ password: err.message || 'Erro ao definir senha. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = () => {
    const errs = {};
    if (!rua.trim()) errs.rua = 'Informe o logradouro';
    if (!numero.trim()) errs.numero = 'Informe o número';
    if (!bairro.trim()) errs.bairro = 'Informe o bairro';
    if (!cidade.trim()) errs.cidade = 'Informe a cidade';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStep(4);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = await api.auth.me();
      const cityState = uf ? `${cidade} - ${uf}` : cidade;
      await api.auth.updateMe({ city: cityState });
      const existing = await api.entities.UserProfile.filter({ userId: user.id });
      const profileData = {
        userId: user.id,
        neighborhood: bairro,
        address: [rua, numero].filter(Boolean).join(', '),
        cep: cep.replace(/\D/g, ''),
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
      setErrors({ submit: err.message || 'Erro ao finalizar cadastro. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-2">
        <img src="/logo.png" alt="ServiLocal" className="w-6 h-6" />
        <span className="text-sm font-semibold text-foreground">
          Servi<span className="text-primary font-bold">Local</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-6">

          {/* Progress indicator */}
          <div className="flex items-start justify-between mb-8">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center relative" style={{ flex: 1 }}>
                {/* connecting line before */}
                {idx > 0 && (
                  <div
                    className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${idx <= step ? 'bg-primary' : 'bg-border'}`}
                  />
                )}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 relative ${
                    idx < step
                      ? 'bg-primary text-primary-foreground'
                      : idx === step
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {idx < step ? <Check className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-[10px] mt-1 font-medium ${idx === step ? 'text-primary' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Step 0 — Dados */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Crie sua conta</h2>
                <p className="text-sm text-muted-foreground mt-1">Preencha seus dados para começar</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  placeholder="Seu nome completo"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.name ? 'border-red-400' : 'border-border'}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setErrors((p) => ({ ...p, phone: undefined })); }}
                  placeholder="(11) 98765-4321"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.phone ? 'border-red-400' : 'border-border'}`}
                />
                {errors.phone
                  ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  : <p className="text-xs text-muted-foreground mt-1">O código de verificação será enviado por aqui</p>
                }
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
                  placeholder="seu@email.com"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.email ? 'border-red-400' : 'border-border'}`}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {errors.submit && <p className="text-xs text-red-500 text-center">{errors.submit}</p>}

              <button
                onClick={handleStep0}
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Enviando...' : 'Enviar código pelo WhatsApp'}
              </button>
            </div>
          )}

          {/* Step 1 — Verificação */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Verificar código</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Enviamos um código de 6 dígitos para o WhatsApp <span className="font-medium text-foreground">{phone}</span>
                </p>
              </div>

              <div>
                <div className="flex gap-2 justify-between">
                  {Array.from({ length: 6 }, (_, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={otp[i] || ''}
                      onChange={(e) => handleOtpChange(e, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className={`flex-1 h-14 text-center border-2 rounded-xl text-2xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors ${
                        errors.otp ? 'border-red-400' : otp[i] ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    />
                  ))}
                </div>
                {errors.otp && <p className="text-xs text-red-500 mt-2 text-center">{errors.otp}</p>}
              </div>

              <div className="text-center space-y-1">
                {canResend ? (
                  <button
                    onClick={handleResendOtp}
                    disabled={loading}
                    className="text-sm text-primary font-medium underline disabled:opacity-50"
                  >
                    Reenviar código
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Reenviar em <span className="font-medium text-foreground">{otpCountdown}s</span>
                  </p>
                )}
              </div>

              <button
                onClick={handleStep1}
                disabled={loading || otp.length < 6}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Verificando...' : 'Verificar código'}
              </button>

              <button
                onClick={() => setStep(0)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar
              </button>
            </div>
          )}

          {/* Step 2 — Senha */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Crie sua senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Escolha uma senha segura para sua conta</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength bar */}
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < strengthScore ? strengthColors[strengthScore] : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                      confirm.length > 0 && !matches ? 'border-red-400' : 'border-border'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm.length > 0 && !matches && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
                )}
              </div>

              {/* Rules checklist */}
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <Rule ok={hasMin8} label="Mínimo 8 caracteres" />
                <Rule ok={hasUpper} label="Pelo menos uma letra maiúscula" />
                <Rule ok={hasNumber} label="Pelo menos um número" />
                <Rule ok={hasSpecial} label="Pelo menos um caractere especial" />
              </div>

              {errors.password && <p className="text-xs text-red-500 text-center">{errors.password}</p>}

              <button
                onClick={handleStep2}
                disabled={loading || !passwordValid}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Salvando...' : 'Continuar'}
              </button>
            </div>
          )}

          {/* Step 3 — Endereço */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Seu endereço</h2>
                <p className="text-sm text-muted-foreground mt-1">Usamos para conectar você a profissionais próximos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">CEP</label>
                <input
                  type="text"
                  value={cep}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                    const formatted = raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw;
                    setCep(formatted);
                    if (raw.length === 8) lookupCep(raw);
                  }}
                  placeholder="00000-000"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {cepLoading && <p className="text-xs text-muted-foreground mt-1">Buscando CEP...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Rua / Logradouro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rua}
                  onChange={(e) => { setRua(e.target.value); setErrors((p) => ({ ...p, rua: undefined })); }}
                  placeholder="Rua, Avenida, Travessa..."
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.rua ? 'border-red-400' : 'border-border'}`}
                />
                {errors.rua && <p className="text-xs text-red-500 mt-1">{errors.rua}</p>}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => { setNumero(e.target.value); setErrors((p) => ({ ...p, numero: undefined })); }}
                    placeholder="123"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.numero ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors.numero && <p className="text-xs text-red-500 mt-1">{errors.numero}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Complemento</label>
                  <input
                    type="text"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    placeholder="Apto, Bloco..."
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Bairro <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bairro}
                  onChange={(e) => { setBairro(e.target.value); setErrors((p) => ({ ...p, bairro: undefined })); }}
                  placeholder="Seu bairro"
                  className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.bairro ? 'border-red-400' : 'border-border'}`}
                />
                {errors.bairro && <p className="text-xs text-red-500 mt-1">{errors.bairro}</p>}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={cidade}
                    onChange={(e) => { setCidade(e.target.value); setErrors((p) => ({ ...p, cidade: undefined })); }}
                    placeholder="Sua cidade"
                    className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.cidade ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors.cidade && <p className="text-xs text-red-500 mt-1">{errors.cidade}</p>}
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-foreground mb-1.5">UF</label>
                  <input
                    type="text"
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                  />
                </div>
              </div>

              <button
                onClick={handleStep3}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity mt-2"
              >
                Continuar
              </button>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Voltar
              </button>
            </div>
          )}

          {/* Step 4 — Resumo */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Confirme seus dados</h2>
                <p className="text-sm text-muted-foreground mt-1">Revise as informações antes de finalizar</p>
              </div>

              {/* Dados pessoais */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest">DADOS PESSOAIS</p>
                  <button onClick={() => setStep(0)} className="text-xs text-primary font-medium">Editar</button>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">Nome</span>
                    <span className="text-sm text-foreground font-medium">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">WhatsApp</span>
                    <span className="text-sm text-foreground">{phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">E-mail</span>
                    <span className="text-sm text-foreground">{email}</span>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest">ENDEREÇO</p>
                  <button onClick={() => setStep(3)} className="text-xs text-primary font-medium">Editar</button>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm text-foreground font-medium">
                    {rua}{numero ? `, ${numero}` : ''}
                  </p>
                  {complemento && <p className="text-sm text-muted-foreground">{complemento}</p>}
                  <p className="text-sm text-muted-foreground">{bairro}</p>
                  <p className="text-sm text-muted-foreground">{cidade}{uf ? ` - ${uf}` : ''}</p>
                  {cep && <p className="text-xs text-muted-foreground">CEP {cep}</p>}
                </div>
              </div>

              {errors.submit && <p className="text-xs text-red-500 text-center">{errors.submit}</p>}

              <button
                onClick={handleFinish}
                disabled={loading}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Finalizando...' : 'Finalizar cadastro'}
              </button>

              {/* Security footer */}
              <div className="flex items-center justify-center gap-2 py-2">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Seus dados são protegidos e nunca compartilhados</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
