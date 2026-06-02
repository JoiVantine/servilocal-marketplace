import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '@/api/apiClient';
import { ArrowLeft, MapPin, Star, Search, SlidersHorizontal, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 13, { animate: true });
  }, [center, map]);
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await api.functions.invoke('maps', { type: 'reverse', lat, lng });
    if (res.data?.cidade) return res.data;
  } catch {}
  // fallback Nominatim
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR' } });
  const d = await r.json();
  return {
    cidade: d.address?.city || d.address?.town || d.address?.municipality || '',
    bairro: d.address?.suburb || d.address?.neighborhood || '',
    estado: d.address?.state || '',
  };
}

async function geocodeCity(city) {
  try {
    const res = await api.functions.invoke('maps', { type: 'geocode', query: city + ', Brasil' });
    if (res.data?.lat) return { lat: res.data.lat, lng: res.data.lng };
  } catch {}
  // fallback Nominatim
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Brasil')}&limit=1&format=json`);
  const d = await r.json();
  if (d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  return null;
}

const ALL_CATEGORIES = [
  'Construção e Reformas', 'Elétrica', 'Hidráulica', 'Pintura', 'Jardinagem',
  'Limpeza', 'Serviços Domésticos', 'Mudanças e Fretes', 'Pets', 'Costura e Ajustes',
  'Beleza e Estética', 'Saúde e Bem-estar', 'Aulas e Consultoria',
  'Tecnologia', 'Assistência Técnica', 'Design e Marketing', 'Fotografia e Vídeo',
  'Eventos', 'Automotivo',
];

export default function ProvidersMap() {
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState(null);
  const [userCity, setUserCity] = useState('');
  const [mapCenter, setMapCenter] = useState([-15.7801, -47.9292]); // Brasil center
  const [locating, setLocating] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [providerCoords, setProviderCoords] = useState({});
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [citySearch, setCitySearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const debounceRef = useRef(null);

  // Get user location on mount
  useEffect(() => {
    if (!navigator.geolocation) { setLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const pos = { lat: coords.latitude, lng: coords.longitude };
        setUserPos(pos);
        setMapCenter([pos.lat, pos.lng]);
        const addr = await reverseGeocode(pos.lat, pos.lng);
        if (addr?.cidade) setUserCity(addr.cidade);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const { data: providers = [] } = useQuery({
    queryKey: ['providers-map', userCity],
    queryFn: () => userCity
      ? api.entities.ProviderProfile.filter({ city: userCity, active: true }, '-rating', 50)
      : api.entities.ProviderProfile.list('-rating', 50),
    enabled: !locating,
  });

  // Geocode each unique provider city for map pins
  useEffect(() => {
    const cities = [...new Set(providers.map(p => p.city).filter(Boolean))];
    cities.forEach(async (city) => {
      if (providerCoords[city]) return;
      const coords = await geocodeCity(city);
      if (coords) setProviderCoords(prev => ({ ...prev, [city]: coords }));
    });
  }, [providers]);

  const filtered = selectedCategory
    ? providers.filter(p => p.specialties?.includes(selectedCategory))
    : providers;

  // City search
  const searchCities = (q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setCitySuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Brasil')}&limit=5&format=json&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR' } });
      const d = await r.json();
      setCitySuggestions(d.filter(x => x.address?.city || x.address?.town || x.address?.municipality).map(x => ({
        label: `${x.address?.city || x.address?.town || x.address?.municipality}, ${x.address?.state}`,
        city: x.address?.city || x.address?.town || x.address?.municipality,
        lat: parseFloat(x.lat), lng: parseFloat(x.lon),
      })));
    }, 400);
  };

  const selectCity = (suggestion) => {
    setUserCity(suggestion.city);
    setMapCenter([suggestion.lat, suggestion.lng]);
    setCitySearch(suggestion.label);
    setCitySuggestions([]);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground text-sm flex-1">Profissionais próximos</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card border-b border-border px-4 py-3 space-y-3 z-10">
          {/* City search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={citySearch}
              onChange={e => { setCitySearch(e.target.value); searchCities(e.target.value); }}
              placeholder="Buscar outra cidade..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {citySuggestions.length > 0 && (
              <div className="absolute top-10 left-0 right-0 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                {citySuggestions.map((s, i) => (
                  <button key={i} onClick={() => selectCity(s)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center gap-2 border-b border-border last:border-0">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />{s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}
            >
              Todos
            </button>
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Location info bar */}
      {userCity && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20 z-10">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium">{userCity}</span>
          <span className="text-xs text-muted-foreground">· {filtered.length} profissional{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory('')} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />{selectedCategory}
            </button>
          )}
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative z-0" style={{ minHeight: '40vh', maxHeight: '50vh' }}>
        {locating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/30 gap-2">
            <div className="w-6 h-6 border-3 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Detectando sua localização...</p>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController center={mapCenter} />

            {/* User pin */}
            {userPos && (
              <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                <Popup><strong>Sua localização</strong></Popup>
              </Marker>
            )}

            {/* Provider pins */}
            {filtered.map(provider => {
              const coords = providerCoords[provider.city];
              if (!coords) return null;
              // Small offset so providers in same city don't fully overlap
              const offset = 0.002 * (filtered.indexOf(provider) % 5);
              return (
                <Marker
                  key={provider.id}
                  position={[coords.lat + offset, coords.lng + offset]}
                  icon={providerIcon}
                  eventHandlers={{ click: () => setSelectedProvider(provider) }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{provider.name}</p>
                      <p className="text-xs text-gray-500">{provider.specialties?.slice(0, 2).join(', ')}</p>
                      {provider.rating > 0 && <p className="text-xs">⭐ {provider.rating.toFixed(1)}</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Provider list */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="px-4 py-3 border-b border-border bg-card">
          <p className="text-xs font-bold text-muted-foreground tracking-wider">
            PROFISSIONAIS {userCity ? `EM ${userCity.toUpperCase()}` : 'DISPONÍVEIS'}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 text-center px-4">
            <MapPin className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-medium text-foreground text-sm">Nenhum profissional encontrado</p>
            <p className="text-xs text-muted-foreground">Tente buscar outra cidade ou remover o filtro de categoria.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(provider => (
              <div
                key={provider.id}
                onClick={() => setSelectedProvider(selectedProvider?.id === provider.id ? null : provider)}
                className={`px-4 py-4 cursor-pointer transition-colors ${selectedProvider?.id === provider.id ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                    {provider.name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{provider.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{provider.specialties?.slice(0, 3).join(', ')}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {provider.rating > 0 ? (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Novo</span>
                    )}
                    <p className="text-xs text-muted-foreground">{provider.completedServices || 0} serv.</p>
                  </div>
                </div>

                {selectedProvider?.id === provider.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {provider.description && (
                      <p className="text-xs text-muted-foreground">{provider.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {provider.specialties?.map(s => (
                        <span key={s} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{s}</span>
                      ))}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="w-full mt-2 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90"
                    >
                      Entrar em contato
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}