import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '@/api/apiClient';
import { ArrowLeft, MapPin, Clock, SlidersHorizontal, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ProposalModal from '@/components/ProposalModal';
import 'leaflet/dist/leaflet.css';

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

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const urgentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
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
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR' } });
  const d = await r.json();
  return { cidade: d.address?.city || d.address?.town || '' };
}

async function geocodeCity(city) {
  try {
    const res = await api.functions.invoke('maps', { type: 'geocode', query: city + ', Brasil' });
    if (res.data?.lat) return { lat: res.data.lat, lng: res.data.lng };
  } catch {}
  const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Brasil')}&limit=1&format=json`);
  const d = await r.json();
  if (d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  return null;
}

const URGENCY_LABELS = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: '🔴 Urgente' };

export default function ProviderRequestsMap() {
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState(null);
  const [userCity, setUserCity] = useState('');
  const [mapCenter, setMapCenter] = useState([-15.7801, -47.9292]);
  const [locating, setLocating] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [proposalRequest, setProposalRequest] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cityCoords, setCityCoords] = useState({});
  const [citySearch, setCitySearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState([]);
  const debounceRef = useRef(null);

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

  const { data: requests = [] } = useQuery({
    queryKey: ['provider-requests-map', userCity],
    queryFn: () => {
      const q = { status: 'open' };
      if (userCity) q.city = userCity;
      return api.entities.ServiceRequest.filter(q, '-created_date', 50);
    },
    enabled: !locating,
  });

  // Geocode unique cities from requests
  useEffect(() => {
    const cities = [...new Set(requests.map(r => r.city).filter(Boolean))];
    cities.forEach(async (city) => {
      if (cityCoords[city]) return;
      const coords = await geocodeCity(city);
      if (coords) setCityCoords(prev => ({ ...prev, [city]: coords }));
    });
  }, [requests]);

  const categories = [...new Set(requests.map(r => r.category).filter(Boolean))];
  const filtered = selectedCategory ? requests.filter(r => r.category === selectedCategory) : requests;

  const searchCities = (q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) { setCitySuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Brasil')}&limit=5&format=json&addressdetails=1`, { headers: { 'Accept-Language': 'pt-BR' } });
      const d = await r.json();
      setCitySuggestions(d.filter(x => x.address?.city || x.address?.town).map(x => ({
        label: `${x.address?.city || x.address?.town}, ${x.address?.state}`,
        city: x.address?.city || x.address?.town,
        lat: parseFloat(x.lat), lng: parseFloat(x.lon),
      })));
    }, 400);
  };

  const selectCity = (s) => {
    setUserCity(s.city);
    setMapCenter([s.lat, s.lng]);
    setCitySearch(s.label);
    setCitySuggestions([]);
  };

  const timeAgo = (date) => {
    const mins = Math.floor((Date.now() - new Date(date)) / 60000);
    if (mins < 60) return `${mins} min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    return `${Math.floor(hrs / 24)}d atrás`;
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card z-10">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-secondary rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-foreground text-sm flex-1">Pedidos no mapa</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border-b border-border px-4 py-3 space-y-3 z-10">
          <div className="relative">
            <input
              type="text"
              value={citySearch}
              onChange={e => { setCitySearch(e.target.value); searchCities(e.target.value); }}
              placeholder="Buscar outra cidade..."
              className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedCategory === cat ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info bar */}
      {userCity && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/20 z-10">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-xs text-primary font-medium">{userCity}</span>
          <span className="text-xs text-muted-foreground">· {filtered.length} pedido{filtered.length !== 1 ? 's' : ''} aberto{filtered.length !== 1 ? 's' : ''}</span>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory('')} className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <X className="w-3 h-3" />{selectedCategory}
            </button>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative z-0" style={{ height: '45vh' }}>
        {locating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/30 gap-2">
            <div className="w-6 h-6 border-4 border-border border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Detectando sua localização...</p>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', height: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            <MapController center={mapCenter} />
            {userPos && (
              <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}>
                <Popup><strong>Você está aqui</strong></Popup>
              </Marker>
            )}
            {filtered.map((req, idx) => {
              const coords = cityCoords[req.city];
              if (!coords) return null;
              const offset = 0.003 * (idx % 6) - 0.007;
              const icon = req.urgency === 'urgent' ? urgentIcon : requestIcon;
              return (
                <Marker key={req.id} position={[coords.lat + offset, coords.lng + offset * 0.7]} icon={icon}
                  eventHandlers={{ click: () => setSelectedRequest(req) }}>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{req.title}</p>
                      <p className="text-xs text-gray-500">{req.category}</p>
                      {req.urgency === 'urgent' && <p className="text-xs text-red-500 font-medium">🔴 Urgente</p>}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
        {/* Legend */}
        <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 z-[400] space-y-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /><span className="text-xs text-muted-foreground">Você</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-xs text-muted-foreground">Pedido</span></div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" /><span className="text-xs text-muted-foreground">Urgente</span></div>
        </div>
      </div>

      {/* Request list */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-3 border-b border-border bg-card">
          <p className="text-xs font-bold text-muted-foreground tracking-wider">PEDIDOS DISPONÍVEIS</p>
        </div>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2 text-center px-4">
            <MapPin className="w-10 h-10 text-muted-foreground/30" />
            <p className="font-medium text-foreground text-sm">Nenhum pedido na região</p>
            <p className="text-xs text-muted-foreground">Tente buscar outra cidade ou remover filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(req => (
              <div key={req.id} onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                className={`px-4 py-4 cursor-pointer transition-colors ${selectedRequest?.id === req.id ? 'bg-primary/5' : 'hover:bg-secondary/30'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${req.urgency === 'urgent' ? 'bg-red-500' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">{req.title}</p>
                      {req.urgency === 'urgent' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-red-50 text-red-600 shrink-0">Urgente</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{req.category}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{req.city}{req.neighborhood ? `, ${req.neighborhood}` : ''}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(req.created_date)}</span>
                    </div>
                  </div>
                </div>

                {selectedRequest?.id === req.id && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 ml-5">
                    <p className="text-xs text-muted-foreground">{req.description}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProposalRequest(req);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium hover:opacity-90 mt-2"
                    >
                      <Zap className="w-4 h-4" /> Tenho interesse
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {proposalRequest && (
        <ProposalModal
          request={proposalRequest}
          onClose={() => setProposalRequest(null)}
          onSent={() => setProposalRequest(null)}
        />
      )}
    </div>
  );
}