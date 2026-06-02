import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, User, Phone, Mail, Lock, Eye, EyeOff, MapPin, CheckCircle2, Circle, Search, ShieldCheck, Pencil, ChevronDown } from 'lucide-react';
import { CATEGORY_GROUPS } from '@/lib/categories';
import { useServices } from '@/hooks/useServices';
import ProviderServiceModal from '@/components/ProviderServiceModal';

const LOGO_URL = '/logo.png';

const STEPS = [
  { id: 1, label: 'Dados' },
  { id: 2, label: 'Atendimento' },
  { id: 3, label: 'Serviços' },
  { id: 4, label: 'Resumo' },
];



export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [user, setUser] = useState(null);
  const { categories } = useServices();

  // Step 1 - Dados
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Step 2 - Atendimento
  const [cityQuery, setCityQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [coverage, setCoverage] = useState('full');
  const [acceptRadius, setAcceptRadius] = useState(false);
  const [radiusKm, setRadiusKm] = useState('15');
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef(null);

  const [fieldErrors, setFieldErrors] = useState({});

  // Step 3 - Serviços (subcategorias)
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceConfigs, setServiceConfigs] = useState({});
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [modalSubcategory, setModalSubcategory] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const goServices = params.get('step') === 'services';
    const goStep1 = params.get('step') === '1';
    api.auth.me().then(async (u) => {
      setUser(u);
      if (goStep1) {
        setName(u.fullName || u.full_name || '');
        setPhone(u.phone || '');
        setEmail(u.email || '');
        setStep(1);
        return;
      }
      if (goServices) {
        setName(u.fullName || u.full_name || '');
        setPhone(u.phone || '');
        setEmail(u.email || '');
        setSelectedCity(u.city || '');
        setCityQuery(u.city || '');
        const provProfiles = await api.entities.ProviderProfile.filter({ userId: u.id });
        if (provProfiles.length > 0) setSelectedServices(provProfiles[0].specialties || []);
        const existingSvcs = await api.entities.ProviderService.filter({ providerId: u.id });
        const configs = {};
        for (const svc of existingSvcs) {
          configs[svc.serviceName || svc.specialty] = svc;
        }
        setServiceConfigs(configs);
        setStep(2);
      }
    }).catch(() => {});
  }, []);

  const searchCities = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) { setCitySuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.functions.invoke('maps', { type: 'cities', query });
        const cities = (res.data.cities || []).map(c => ({
          label: c.label,
          city: c.city,
        }));
        setCitySuggestions(cities);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let me = user;
      if (!me) {
        me = await api.auth.me().catch(() => null);
      }
      if (!me) {
        navigate('/');
        return;
      }
      await api.auth.updateMe({ full_name: name, phone, city: selectedCity });

      // Cria UserProfile se não existir
      const existingUp = await api.entities.UserProfile.filter({ userId: me.id });
      const upData = { userId: me.id, role: 'provider', onboardingCompleted: true, firstAccess: false };
      if (existingUp.length > 0) {
        await api.entities.UserProfile.update(existingUp[0].id, upData);
      } else {
        await api.entities.UserProfile.create(upData);
      }

      // Verifica se ProviderProfile existe para este userId
      const existingProfiles = await api.entities.ProviderProfile.filter({ userId: me.id });

      if (existingProfiles.length > 0) {
        await api.entities.ProviderProfile.update(existingProfiles[0].id, {
          name,
          city: selectedCity,
          specialties: selectedServices.length > 0 ? selectedServices : existingProfiles[0].specialties,
          active: true,
        });
      } else {
        await api.entities.ProviderProfile.create({
          userId: me.id,
          name,
          city: selectedCity,
          specialties: selectedServices,
          description: '',
          rating: 0,
          reviewCount: 0,
          completedServices: 0,
          active: true,
        });
      }

      // Upsert ProviderService — atualiza se já existe, cria se for novo
      const existingSvcs = await api.entities.ProviderService.filter({ providerId: me.id });
      const existingByName = {};
      for (const svc of existingSvcs) {
        existingByName[svc.serviceName || svc.specialty] = svc;
      }
      for (const specialty of selectedServices) {
        const cfg = serviceConfigs[specialty] || {};
        const data = {
          providerId: me.id,
          serviceName: specialty,
          specialty,
          price: cfg.price || '',
          duration: cfg.duration || '',
          homeCare: cfg.homeCare || 'sim',
          freight: cfg.freight || '',
          materials: cfg.materials || 'provider',
          description: cfg.description || '',
          active: true,
        };
        if (existingByName[specialty]) {
          await api.entities.ProviderService.update(existingByName[specialty].id, data);
        } else {
          await api.entities.ProviderService.create(data);
        }
      }
    },
    onSuccess: () => navigate('/provider'),
  });

  const handleServiceSave = (serviceConfig) => {
    setSelectedServices(prev =>
      prev.includes(serviceConfig.specialty) ? prev : [...prev, serviceConfig.specialty]
    );
    setServiceConfigs(prev => ({ ...prev, [serviceConfig.specialty]: serviceConfig }));
    setModalSubcategory(null);
  };

  const [serviceSearch, setServiceSearch] = useState('');

  const validateStep0 = () => {
    const errors = {};
    if (!name.trim() || name.trim().length < 3) errors.name = 'Nome deve ter ao menos 3 caracteres.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'E-mail inválido.';
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) errors.phone = 'Celular deve ter DDD + 8 ou 9 dígitos (10 ou 11 no total).';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const cityIsValid = !!selectedCity || (cityQuery.trim().length > 2 && /^[a-záéíóúãõâô\s]+$/i.test(cityQuery.trim()));

  const canNext = [
    !otpSent
      ? name.trim() && phone.trim() && email.trim()
      : otpCode.trim().length === 6,
    cityIsValid,
    true,
    true,
  ][step];

  const handleNext = async () => {
    if (step === 0) {
      // Já autenticado (ex: usuário voltando pra adicionar perfil de prestador)
      if (user) {
        setStep(1);
        return;
      }
      if (!otpSent) {
        if (!validateStep0()) return;
        setOtpLoading(true);
        try {
          const { hasProfile } = await api.auth.checkProfile(email, 'provider');
          if (hasProfile) {
            navigate(`/login?role=provider&email=${encodeURIComponent(email)}`);
            return;
          }
          await api.auth.sendOtp({ email, fullName: name, phone, role: 'provider' });
          setOtpSent(true);
        } catch (err) {
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('exist') || msg.includes('já') || msg.includes('cadastrado') || msg.includes('registered') || msg.includes('duplicate')) {
            setFieldErrors({ email: 'Ops! E-mail já cadastrado. Tente fazer login.' });
          } else {
            setFieldErrors({ email: err.message });
          }
        } finally {
          setOtpLoading(false);
        }
        return;
      }
      // Verificar OTP
      setOtpLoading(true);
      try {
        const res = await api.auth.verifyOtp({ email, otp: otpCode });
        if (res.token) api.auth.setToken(res.token);
        navigate(`/setup-password?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/provider/onboarding?step=1')}`);
      } catch (err) {
        setFieldErrors({ otp: err.message });
      } finally {
        setOtpLoading(false);
      }
      return;
    }
    if (step === 1 && !selectedCity && cityQuery.trim()) {
      setSelectedCity(cityQuery.trim());
    }
    if (step < 3) setStep(step + 1);
    else saveMutation.mutate();
  };



  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
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

      {/* Steps indicator */}
      <div className="px-6 py-4 bg-card border-b border-border">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {/* connector line */}
          <div className="absolute top-4 left-0 right-0 h-px bg-border" />
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                  done ? 'bg-primary border-primary text-primary-foreground' :
                  active ? 'bg-card border-primary text-primary' :
                  'bg-card border-border text-muted-foreground'
                }`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-xs font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-md mx-auto w-full px-6 py-8">

        {/* Step 1: Dados */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground">Seus dados de contato</h2>
              <p className="text-sm text-muted-foreground mt-1">Iremos notificar <span className="text-primary">por estes canais</span>.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Seu nome <span className="text-red-500">*</span></label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setFieldErrors(p => ({ ...p, name: undefined })); }}
                  placeholder="Ex.: João Elétrica"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card ${fieldErrors.name ? 'border-red-400' : 'border-border'}`}
                />
              </div>
              {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Celular com DDD <span className="text-red-500">*</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                    const formatted = val.length <= 2 ? `(${val}` : val.length <= 7 ? `(${val.slice(0, 2)}) ${val.slice(2)}` : `(${val.slice(0, 2)}) ${val.slice(2, 7)}-${val.slice(7)}`;
                    setPhone(val.length > 0 ? formatted : '');
                    setFieldErrors(p => ({ ...p, phone: undefined }));
                  }}
                  placeholder="(11) 98765-4321"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card ${fieldErrors.phone ? 'border-red-400' : 'border-border'}`}
                />
              </div>
              {fieldErrors.phone
                ? <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
                : <p className="text-xs text-primary mt-1">Esse número será usado para entrar no app e receber notificações.</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">E-mail <span className="text-red-500">*</span></label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: undefined })); }}
                  placeholder="seu@email.com"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card ${fieldErrors.email ? 'border-red-400' : 'border-border'}`}
                />
              </div>
              {fieldErrors.email
                ? <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                : <p className="text-xs text-primary mt-1">Usado para acesso ao app e notificações.</p>}
            </div>

            {otpSent && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Código de verificação <span className="text-red-500">*</span></label>
                <p className="text-xs text-muted-foreground mb-2">Digite o código de 6 dígitos enviado para <strong>{email}</strong>.</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setFieldErrors(p => ({ ...p, otp: undefined })); }}
                  placeholder="000000"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card text-center tracking-widest text-lg font-mono ${fieldErrors.otp ? 'border-red-400' : 'border-border'}`}
                />
                {fieldErrors.otp && <p className="text-xs text-red-500 mt-1">{fieldErrors.otp}</p>}
                <button
                  onClick={async () => {
                    setOtpLoading(true);
                    try { await api.auth.sendOtp({ email, fullName: name, phone, role: 'provider' }); } catch {}
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

        {/* Step 2: Atendimento */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Onde você quer atender?</h2>
              <p className="text-sm text-muted-foreground mt-1">Vamos <span className="text-primary">priorizar pedidos próximos de você</span>.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Sua cidade</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={cityQuery}
                  onChange={e => { setCityQuery(e.target.value); searchCities(e.target.value); if (!e.target.value) setSelectedCity(''); }}
                  placeholder="Digite o nome da sua cidade"
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card"
                />
              </div>
              <p className="text-xs text-primary mt-1">Digite o nome da cidade para buscar.</p>

              {/* Suggestions */}
              {citySuggestions.length > 0 && !selectedCity && (
                <div className="mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                  {citySuggestions.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedCity(c.city); setCityQuery(c.label); setCitySuggestions([]); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/40 flex items-center gap-2 border-b border-border last:border-0"
                    >
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {searchLoading && <p className="text-xs text-muted-foreground mt-1">Buscando...</p>}
              {!searchLoading && !selectedCity && cityQuery.length > 2 && citySuggestions.length === 0 && /^[a-záéíóúãõâô\s]+$/i.test(cityQuery) && (
                <p className="text-xs text-primary mt-1">Nenhuma sugestão encontrada. Você pode continuar com "{cityQuery}" clicando em Continuar.</p>
              )}
            </div>

            {/* Info box */}
            <div className="p-4 border border-primary/30 rounded-xl bg-primary/5 flex gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-primary leading-relaxed">
                <strong>Aceito pedidos da minha cidade.</strong> Escolha se atende a cidade inteira ou apenas alguns bairros — quanto mais próximo o cliente estiver, mais alto o pedido aparece no seu painel.
              </p>
            </div>

            {/* Coverage options */}
            <div className="space-y-3">
              <button
                onClick={() => setCoverage('full')}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${coverage === 'full' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                {coverage === 'full' ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-foreground">Atendo toda a cidade</p>
                  <p className="text-xs text-muted-foreground">Recebo pedidos de qualquer bairro.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Serviços */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <h2 className="font-heading text-2xl font-bold text-foreground">Marque suas especialidades</h2>
              <p className="text-sm text-primary mt-1">Clique em uma categoria para escolher as especialidades.</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={serviceSearch}
                onChange={e => setServiceSearch(e.target.value)}
                placeholder="Buscar (ex.: eletricista, pintura interna)"
                className="w-full pl-10 pr-4 py-3 border border-border rounded-full bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>

            {/* Categories with expandable subcategories */}
            {CATEGORY_GROUPS.map(group => {
              const groupCategories = categories.filter(c => group.items.includes(c.name));
              const filtered = serviceSearch
                ? groupCategories.filter(c =>
                    c.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
                    c.subcategories.some(s => s.toLowerCase().includes(serviceSearch.toLowerCase()))
                  )
                : groupCategories;
              if (filtered.length === 0) return null;
              return (
                <div key={group.label}>
                  <p className="text-xs font-bold text-muted-foreground tracking-wider mb-3">{group.label}</p>
                  <div className="space-y-2">
                    {filtered.map(cat => {
                       const Icon = cat.icon;
                       const isExpanded = expandedCategory === cat.name;
                       const categoryName = cat.name;
                      const selectedCount = cat.subcategories.filter(s => selectedServices.includes(s)).length;
                      const subcatsToShow = serviceSearch
                        ? cat.subcategories.filter(s => s.toLowerCase().includes(serviceSearch.toLowerCase()))
                        : cat.subcategories;
                      return (
                        <div key={cat.name} className="border border-border rounded-xl overflow-hidden bg-card">
                          <button
                            onClick={() => setExpandedCategory(isExpanded ? null : cat.name)}
                            className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                              selectedCount > 0 ? 'bg-primary/5' : 'hover:bg-secondary/20'
                            }`}
                          >
                            <Icon className={`w-5 h-5 shrink-0 ${selectedCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className={`flex-1 text-sm font-medium ${selectedCount > 0 ? 'text-primary' : 'text-foreground'}`}>
                              {cat.name}
                            </span>
                            {selectedCount > 0 && (
                              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-semibold">{selectedCount}</span>
                            )}
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {(isExpanded || (serviceSearch && subcatsToShow.length > 0)) && (
                            <div className="border-t border-border p-3 flex flex-wrap gap-2">
                              {subcatsToShow.map(sub => {
                                const active = selectedServices.includes(sub);
                                return (
                                  <button
                                    key={sub}
                                    onClick={() => setModalSubcategory({ sub, cat: categoryName })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                      active
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-border text-foreground hover:border-primary/50'
                                    }`}
                                  >
                                    {active ? '✓ ' : ''}{sub}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 4: Resumo */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-heading text-2xl font-bold text-foreground">Confirme suas especialidades</h2>
              <p className="text-sm text-primary mt-1 leading-relaxed">
                {selectedServices.length === 0
                  ? 'Sem especialidades marcadas você vai receber pedidos de todos os tipos.'
                  : `${selectedServices.length} especialidade${selectedServices.length > 1 ? 's' : ''} selecionada${selectedServices.length > 1 ? 's' : ''}.`}
              </p>
            </div>

            {/* Serviços */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🏷️</span>
                  <span className="text-xs font-bold text-muted-foreground tracking-wider">SERVIÇOS</span>
                </div>
                <button onClick={() => setStep(2)} className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary/50">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 mb-2">
                {selectedServices.length === 0 ? (
                  <>
                    <p className="text-sm font-semibold text-foreground">Todas as categorias</p>
                    <p className="text-xs text-primary mt-0.5">Você vai receber pedidos de todos os tipos.</p>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedServices.map(s => (
                      <span key={s} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="border border-dashed border-primary/40 rounded-xl p-4 bg-primary/5">
                <p className="text-xs text-primary leading-relaxed text-center">
                  {selectedServices.length === 0
                    ? 'Nenhuma categoria marcada. Você vai aparecer para qualquer cliente da sua região, em qualquer serviço.'
                    : 'Você vai aparecer apenas para pedidos compatíveis com suas categorias.'}
                </p>
              </div>
            </div>

            {/* Atendimento */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground tracking-wider">ATENDIMENTO</span>
                </div>
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary/50">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">{selectedCity || '—'}</p>
                <p className="text-xs text-muted-foreground">{coverage === 'full' ? 'Atende a cidade inteira' : 'Apenas alguns bairros'}</p>
                {acceptRadius && (
                  <p className="text-xs text-primary font-medium">Aceita pedidos com até {radiusKm} km</p>
                )}
              </div>
            </div>

            {/* Perfil */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground tracking-wider">PERFIL</span>
                </div>
                <button onClick={() => setStep(0)} className="flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary/50">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground">{name || user?.full_name || '—'}</p>
                <p className="text-xs text-primary mt-0.5">Recebimento de pedidos: ativo</p>
              </div>
            </div>
          </div>
        )}

        {/* Service Modal */}
        {modalSubcategory && (
          <ProviderServiceModal
            key={modalSubcategory.sub}
            subcategory={modalSubcategory.sub}
            category={modalSubcategory.cat}
            initialData={serviceConfigs[modalSubcategory.sub]}
            onClose={() => setModalSubcategory(null)}
            onSave={handleServiceSave}
          />
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
            {saveMutation.isPending || otpLoading ? 'Aguarde...' :
              step === 3 ? 'Concluir cadastro' :
              step === 0 && otpSent ? 'Verificar código' :
              step === 0 && !user ? 'Enviar código' :
              step === 2 && selectedServices.length === 0 ? 'Continuar sem escolher (receber tudo)' :
              'Continuar'}
            <ChevronRight className="w-5 h-5" />
          </button>
          {step === 2 && (
            <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Sem categorias marcadas você recebe pedidos de todos os tipos.
            </p>
          )}
          {(step === 1 || step === 3) && (
            <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Você pode alterar depois, se quiser.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}