import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/api/apiClient';
import { ChevronLeft, Loader2, CheckCircle, MapPin, Plus, X, Search } from 'lucide-react';
import ProviderBottomNav from '@/components/ProviderBottomNav';
import { useCurrentUser, useRefreshUser } from '@/hooks/useCurrentUser';

const formatPhone = (val) => {
  const d = val.replace(/\D/g, '').slice(0, 11);
  if (!d.length) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ProviderProfile() {
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();
  const refreshUser = useRefreshUser();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceAreas, setServiceAreas] = useState([]);
  const [currentCity, setCurrentCity] = useState('');
  const [currentAreaType, setCurrentAreaType] = useState('entire_city');
  const [currentNeighborhoods, setCurrentNeighborhoods] = useState([]);
  const [neighborhoodInput, setNeighborhoodInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const ibgeCities = useRef([]);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome')
      .then(r => r.json())
      .then(data => {
        ibgeCities.current = data.map(m => ({
          nome: m.nome,
          uf: m.microrregiao?.mesorregiao?.UF?.sigla || '',
        }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setName(user.fullName || user.full_name || '');
    setPhone(user.phone || '');
    api.entities.ProviderProfile.filter({ created_by_id: user.id })
      .then(pp => {
        if (pp.length > 0 && pp[0].serviceAreas?.length) {
          setServiceAreas(pp[0].serviceAreas);
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const searchCities = (query) => {
    setCurrentCity(query);
    if (query.length < 3) { setCitySuggestions([]); setShowCitySuggestions(false); return; }
    const q = normalize(query);
    const results = ibgeCities.current
      .filter(m => normalize(m.nome).includes(q))
      .slice(0, 8);
    setCitySuggestions(results);
    setShowCitySuggestions(results.length > 0);
  };

  const selectCity = (city) => {
    setCurrentCity(city.nome);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  const step2CityValid =
    currentCity.trim().length > 0 &&
    (currentAreaType === 'entire_city' || currentNeighborhoods.length > 0);

  const addCurrentCity = () => {
    if (!step2CityValid) return;
    setServiceAreas(prev => [...prev, {
      city: currentCity.trim(),
      type: currentAreaType,
      neighborhoods: [...currentNeighborhoods],
    }]);
    setCurrentCity('');
    setCurrentAreaType('entire_city');
    setCurrentNeighborhoods([]);
    setNeighborhoodInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      const firstCity = serviceAreas[0]?.city || '';
      await api.auth.updateMe({ full_name: name, name, phone, city: firstCity });

      const me = await api.auth.me();
      const provProfiles = await api.entities.ProviderProfile.filter({ created_by_id: me.id });
      if (provProfiles.length > 0) {
        await api.entities.ProviderProfile.update(provProfiles[0].id, { name, phone, city: firstCity, serviceAreas });
      }

      refreshUser();
      setShowSuccessModal(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const fullName = user?.fullName || user?.full_name || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground">Meus dados</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Foto */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              {user.photo ? (
                <img src={user.photo} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {initials}
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">Foto do perfil</span>
          </div>
        </div>

        {/* Campos básicos */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">E-mail</label>
            <input
              type="email"
              value={user.email || ''}
              disabled
              className="w-full px-4 py-3 border border-border rounded-xl bg-secondary text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telefone / WhatsApp</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              placeholder="(DDD) 90000-0000"
              className="w-full px-4 py-3 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Cidades atendidas */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted-foreground">Cidades atendidas</label>

          {serviceAreas.length > 0 && (
            <div className="space-y-2">
              {serviceAreas.map((area, idx) => (
                <div key={idx} className="p-3 bg-card border border-border rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        {area.city}
                      </p>
                      {area.type === 'entire_city' ? (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-5">Cidade inteira</p>
                      ) : area.neighborhoods?.length > 0 ? (
                        <p className="text-xs text-muted-foreground mt-1 ml-5">
                          {area.neighborhoods.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setServiceAreas(prev => prev.filter((_, i) => i !== idx))}
                      className="p-1 hover:bg-secondary rounded-lg shrink-0"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Adicionar cidade */}
          <div className="space-y-3 p-4 bg-card border border-border rounded-2xl">
            <p className="text-xs font-semibold text-muted-foreground">
              {serviceAreas.length === 0 ? 'Adicione uma cidade' : 'Adicionar outra cidade'}
            </p>

            <div className="relative">
              <input
                type="text"
                value={currentCity}
                onChange={e => searchCities(e.target.value)}
                onFocus={() => currentCity.length >= 3 && setShowCitySuggestions(citySuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowCitySuggestions(false), 150)}
                placeholder="Digite ao menos 3 letras"
                className="w-full pl-4 pr-10 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              {showCitySuggestions && citySuggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {citySuggestions.map((city, i) => (
                    <button
                      key={i}
                      onMouseDown={() => selectCity(city)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-secondary/50 transition-colors text-left border-b border-border last:border-b-0"
                    >
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-foreground">{city.nome}</span>
                      <span className="text-xs text-muted-foreground">{city.uf}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {currentCity.trim() && (
              <>
                <div className="space-y-2">
                  {[
                    { value: 'entire_city', label: 'Atendo a cidade inteira' },
                    { value: 'neighborhoods', label: 'Atendo somente alguns bairros' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCurrentAreaType(opt.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                        currentAreaType === opt.value
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        currentAreaType === opt.value ? 'border-primary' : 'border-border'
                      }`}>
                        {currentAreaType === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {currentAreaType === 'neighborhoods' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={neighborhoodInput}
                        onChange={e => setNeighborhoodInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && neighborhoodInput.trim()) {
                            setCurrentNeighborhoods(prev => [...prev, neighborhoodInput.trim()]);
                            setNeighborhoodInput('');
                          }
                        }}
                        placeholder="Nome do bairro"
                        className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <button
                        onClick={() => {
                          if (neighborhoodInput.trim()) {
                            setCurrentNeighborhoods(prev => [...prev, neighborhoodInput.trim()]);
                            setNeighborhoodInput('');
                          }
                        }}
                        className="px-3 py-2.5 bg-primary text-primary-foreground rounded-xl"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {currentNeighborhoods.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentNeighborhoods.map((n, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {n}
                            <button onClick={() => setCurrentNeighborhoods(prev => prev.filter((_, j) => j !== i))}>
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step2CityValid && (
                  <button
                    onClick={addCurrentCity}
                    className="w-full py-2.5 border border-primary text-primary rounded-xl text-sm font-semibold hover:bg-primary/5 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {saveError && (
          <p className="text-sm text-red-500 text-center">Falha ao salvar. Tente novamente.</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs text-center space-y-4 shadow-xl">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="font-bold text-foreground text-lg">Dados salvos!</p>
              <p className="text-sm text-muted-foreground mt-1">Suas informações foram atualizadas.</p>
            </div>
            <button
              onClick={() => navigate('/provider')}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <ProviderBottomNav active="menu" />
    </div>
  );
}
