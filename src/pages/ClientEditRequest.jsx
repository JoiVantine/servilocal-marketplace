import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useServices } from '@/hooks/useServices';
import { ChevronLeft, Camera, X, Loader2 } from 'lucide-react';

const S_SERVICE = 0;
const S_DESCRIPTION = 1;
const S_WHEN = 2;
const S_ADDRESS = 3;
const S_REVIEW = 4;

const STEP_LABELS = ['Serviço', 'Descrição', 'Quando', 'Endereço', 'Revisão'];

const fmtDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export default function ClientEditRequest() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { categories } = useServices();
  const fileRef = useRef(null);

  const [step, setStep] = useState(S_SERVICE);
  const [errors, setErrors] = useState({});
  const [ready, setReady] = useState(false);

  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [catExpanded, setCatExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  const [whenChoice, setWhenChoice] = useState('flexible');
  const [schedSlots, setSchedSlots] = useState([]);
  const [draftDate, setDraftDate] = useState('');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

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

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', requestId],
    queryFn: () => api.entities.ServiceRequest.get(requestId),
  });

  useEffect(() => {
    if (!request || ready) return;
    setCategory(request.category || '');
    setSubcategory(request.subcategory || '');
    setDescription(request.description || '');
    setPhotos(request.photos || []);

    if (request.scheduleOptions?.length > 0) {
      setWhenChoice('scheduled');
      setSchedSlots(request.scheduleOptions.map(s => ({
        date: s.date,
        start: s.startTime,
        end: s.endTime,
      })));
    } else {
      setWhenChoice('flexible');
    }

    const cepRaw = request.zipCode || '';
    setAddrCep(cepRaw.length > 5 ? `${cepRaw.slice(0, 5)}-${cepRaw.slice(5)}` : cepRaw);
    setAddrStreet(request.addressStreet || '');
    setAddrNumber(request.addressNumber === 'S/N' ? '' : (request.addressNumber || ''));
    setAddrNoNum(request.addressNumber === 'S/N');
    setAddrComplement(request.addressComplement || '');
    setAddrNeighborhood(request.neighborhood || '');
    setAddrCity(request.addressCity || request.city?.split(' - ')[0] || '');
    setAddrState(request.addressState || request.city?.split(' - ')[1] || '');
    setReady(true);
  }, [request, ready]);

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
      when: scheduleOptions.length > 0 ? 'scheduled' : '',
      scheduledAt: scheduleOptions[0] ? `${scheduleOptions[0].date}T${scheduleOptions[0].startTime}` : undefined,
      scheduleOptions,
      photos,
    };
  };

  const saveMutation = useMutation({
    mutationFn: () => api.entities.ServiceRequest.update(requestId, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['request', requestId] });
      navigate(`/client/request/${requestId}`);
    },
    onError: (err) => setErrors({ submit: err.message || 'Erro ao salvar. Tente novamente.' }),
  });

  const selectedCat = categories.find((c) => c.name === category);
  const minDate = new Date(Date.now() + 30 * 60000).toISOString().slice(0, 10);
  const progress = Math.round(((step + 1) / 5) * 100);

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

  if (isLoading || !ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-card border-b border-border px-4 h-14 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => step === S_SERVICE ? navigate(`/client/request/${requestId}`) : setStep(s => s - 1)}
          className="p-2 -ml-2 rounded-xl hover:bg-secondary/50 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground text-sm">{STEP_LABELS[step]}</p>
          <p className="text-xs text-muted-foreground">Editando pedido · Etapa {step + 1} de 5</p>
        </div>
      </div>

      <div className="h-1 bg-secondary">
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
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
                  <ChevronLeft className={`w-4 h-4 transition-transform ${catExpanded ? '-rotate-90' : 'rotate-180'}`} />
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

              <button
                onClick={handleServiceNext}
                disabled={!category}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
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
                    placeholder="Ex: Preciso pintar a sala..."
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
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
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
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-secondary/20 flex items-center justify-center hover:border-primary/50 transition-colors disabled:opacity-50"
                    >
                      {photoLoading
                        ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                        : <Camera className="w-5 h-5 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
                {photoError && <p className="text-xs text-red-500 mt-1">Falha ao enviar foto. Tente novamente.</p>}
              </div>

              <button
                onClick={handleDescriptionNext}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
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
                  <button
                    key={value}
                    onClick={() => setWhenChoice(value)}
                    className={`w-full flex items-center gap-3 px-4 py-4 border rounded-xl text-left transition-colors ${
                      whenChoice === value ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/20'
                    }`}
                  >
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
                  {schedSlots.map((slot, i) => (
                    <div key={i} className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{fmtDate(slot.date)}</p>
                        <p className="text-xs text-muted-foreground">Das {slot.start} às {slot.end}</p>
                      </div>
                      <button
                        onClick={() => setSchedSlots(prev => prev.filter((_, j) => j !== i))}
                        className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  ))}

                  {schedSlots.length < 3 && (
                    <div className="space-y-3 bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {schedSlots.length === 0 ? 'Opção 1' : `Opção ${schedSlots.length + 1}`}
                      </p>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Data</label>
                        <input
                          type="date" value={draftDate} min={minDate}
                          onChange={e => setDraftDate(e.target.value)}
                          className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
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
                          className="w-full py-2.5 border border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 transition-colors"
                        >
                          + Adicionar opção
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { setErrors({}); setStep(S_ADDRESS); }}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
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
                  <input
                    type="text" inputMode="numeric" value={addrCep}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
                      setAddrCep(raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw);
                      if (raw.length === 8) lookupCep(raw);
                    }}
                    placeholder="00000-000"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
                </div>
                {cepError && <p className="text-xs text-red-500 mt-1">{cepError}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Rua / Logradouro <span className="text-red-500">*</span></label>
                <input
                  type="text" value={addrStreet}
                  onChange={(e) => { setAddrStreet(e.target.value); setErrors((p) => ({ ...p, street: undefined })); }}
                  placeholder="Rua, Avenida, Travessa..."
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.street ? 'border-red-400' : 'border-border'}`}
                />
                {errors.street && <p className="text-xs text-red-500 mt-1">{errors.street}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-foreground">Número {!addrNoNum && <span className="text-red-500">*</span>}</label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox" checked={addrNoNum}
                      onChange={(e) => { setAddrNoNum(e.target.checked); if (e.target.checked) { setAddrNumber(''); setErrors((p) => ({ ...p, number: undefined })); } }}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    <span className="text-xs text-muted-foreground">Sem número</span>
                  </label>
                </div>
                <input
                  type="text" value={addrNoNum ? 'S/N' : addrNumber}
                  onChange={(e) => { setAddrNumber(e.target.value); setErrors((p) => ({ ...p, number: undefined })); }}
                  disabled={addrNoNum} placeholder="123"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-secondary/50 disabled:text-muted-foreground ${errors.number ? 'border-red-400' : 'border-border'}`}
                />
                {errors.number && <p className="text-xs text-red-500 mt-1">{errors.number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Complemento</label>
                <input
                  type="text" value={addrComplement}
                  onChange={(e) => setAddrComplement(e.target.value)}
                  placeholder="Apto, Bloco..."
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bairro <span className="text-red-500">*</span></label>
                <input
                  type="text" value={addrNeighborhood}
                  onChange={(e) => { setAddrNeighborhood(e.target.value); setErrors((p) => ({ ...p, neighborhood: undefined })); }}
                  placeholder="Seu bairro"
                  className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.neighborhood ? 'border-red-400' : 'border-border'}`}
                />
                {errors.neighborhood && <p className="text-xs text-red-500 mt-1">{errors.neighborhood}</p>}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground mb-1.5">Cidade <span className="text-red-500">*</span></label>
                  <input
                    type="text" value={addrCity}
                    onChange={(e) => { setAddrCity(e.target.value); setErrors((p) => ({ ...p, city: undefined })); }}
                    placeholder="Sua cidade"
                    className={`w-full px-4 py-3 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 ${errors.city ? 'border-red-400' : 'border-border'}`}
                  />
                  {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-foreground mb-1.5">UF</label>
                  <input
                    type="text" value={addrState}
                    onChange={(e) => setAddrState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
                  />
                </div>
              </div>

              <button
                onClick={handleAddressNext}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Próximo
              </button>
            </div>
          )}

          {/* ── STEP 4: Revisão ── */}
          {step === S_REVIEW && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Revisão do pedido</h2>
                <p className="text-sm text-muted-foreground mt-1">Confira as alterações antes de salvar</p>
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

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                Propostas já recebidas continuam válidas após editar o pedido.
              </div>

              {errors.submit && <p className="text-xs text-red-500 text-center">{errors.submit}</p>}

              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
