import { useState, useEffect, useRef } from 'react';
import { MapPin, AlertCircle, Lock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  shadowSize: [41, 41],
});

const MapUpdater = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 16);
  }, [coords, map]);
  return null;
};

const DraggableMarker = ({ position, onDragEnd }) => {
  const markerRef = useRef(null);
  return (
    <Marker
      position={position}
      icon={markerIcon}
      draggable={true}
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          const m = markerRef.current;
          if (m) onDragEnd([m.getLatLng().lat, m.getLatLng().lng]);
        },
      }}
    />
  );
};

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

async function geocodeAddress(cep, endereco, numero, bairro, cidade, estado) {
  const fullAddress = `${endereco}, ${numero}, ${bairro}, ${cidade}, ${estado}, ${cep}, Brasil`;
  try {
    if (GMAPS_KEY) {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&components=country:BR&language=pt-BR&key=${GMAPS_KEY}`
      );
      const data = await res.json();
      if (data.results?.length) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng };
      }
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=br&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'ServiLocal/1.0' } }
    );
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

export default function AddressFormWithMap({ onAddressChange, initialData, validateNow }) {
  const init = initialData || {};
  const [formData, setFormData] = useState({
    cep: init.cep || '',
    endereco: init.endereco || '',
    numero: init.numero || '',
    complemento: init.complemento || '',
    bairro: init.bairro || '',
    cidade: init.cidade || '',
    estado: init.estado || '',
  });
  const [sn, setSn] = useState(init.numero === 'S/N');
  const [cepFilled, setCepFilled] = useState(!!init.cidade);
  const [cepLoading, setCepLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const [coords, setCoords] = useState(
    init.coords ? [init.coords.lat, init.coords.lng] : null
  );
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const numeroRef = useRef(null);

  const defaultCoords = [-23.5505, -46.6333];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cep') {
      let val = value.replace(/\D/g, '').slice(0, 8);
      if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
      setFormData(prev => ({ ...prev, cep: val }));
      if (val.replace(/\D/g, '').length === 8) fetchCepData(val.replace(/\D/g, ''));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (name) => setTouched(prev => ({ ...prev, [name]: true }));

  const handleSn = (checked) => {
    setSn(checked);
    setFormData(prev => ({ ...prev, numero: checked ? 'S/N' : '' }));
    setTouched(prev => ({ ...prev, numero: true }));
  };

  const fetchCepData = async (cepDigits) => {
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
        setCepFilled(true);
        setTimeout(() => numeroRef.current?.focus(), 150);
      }
    } catch {
      // silent
    } finally {
      setCepLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (formData.endereco && formData.cidade) {
        setLoadingLocation(true);
        setLocationError('');
        const location = await geocodeAddress(
          formData.cep, formData.endereco, formData.numero,
          formData.bairro, formData.cidade, formData.estado
        );
        if (location) {
          setCoords([location.lat, location.lng]);
        } else {
          setLocationError('Endereço não encontrado no mapa. Verifique os dados.');
          setCoords(null);
        }
        setLoadingLocation(false);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formData]);

  useEffect(() => {
    if (onAddressChange) onAddressChange({ ...formData, coords, sn });
  }, [formData, coords, sn, onAddressChange]);

  const showNumeroError = !sn && !formData.numero.trim() && (touched.numero || validateNow);
  const showReferenceError = sn && !formData.complemento.trim() && (touched.complemento || validateNow);

  const readonlyFieldClass = 'w-full px-4 py-3 border border-border rounded-lg text-sm bg-secondary/40 text-muted-foreground cursor-not-allowed';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-foreground mb-1">Para começar, qual seu endereço?</h3>
        <p className="text-sm text-muted-foreground">
          Comece pelo CEP — o restante a gente preenche pra você.
        </p>
      </div>

      <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4 flex gap-3">
        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Seu endereço fica oculto. Só será usado para buscar profissionais na sua região.
        </p>
      </div>

      {/* CEP */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          CEP <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="cep"
          value={formData.cep}
          onChange={handleInputChange}
          onBlur={() => handleBlur('cep')}
          placeholder="00000-000"
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
        {cepLoading ? (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-primary">Buscando endereço...</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Digite o CEP. Os dados serão preenchidos automaticamente.
          </p>
        )}
      </div>

      {/* Skeleton durante carregamento do CEP */}
      {cepLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-secondary rounded-lg" />
          <div className="h-12 bg-secondary rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 h-12 bg-secondary rounded-lg" />
            <div className="h-12 bg-secondary rounded-lg" />
          </div>
        </div>
      )}

      {/* Endereço e demais campos — ocultos durante loading do CEP */}
      {!cepLoading && (<>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Endereço <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="endereco"
          value={formData.endereco}
          onChange={handleInputChange}
          onBlur={() => handleBlur('endereco')}
          placeholder="Rua, Avenida..."
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {/* Número */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Número <span className="text-red-500">*</span>
        </label>
        {!sn && (
          <input
            ref={numeroRef}
            type="text"
            name="numero"
            value={formData.numero}
            onChange={handleInputChange}
            onBlur={() => handleBlur('numero')}
            placeholder="Ex.: 123"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
              showNumeroError ? 'border-red-400' : 'border-border'
            }`}
          />
        )}
        {showNumeroError && (
          <p className="text-xs text-red-500 mt-1">O número do endereço é obrigatório</p>
        )}
        <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={sn}
            onChange={e => handleSn(e.target.checked)}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm text-muted-foreground">Endereço sem número</span>
        </label>
      </div>

      {/* Referência — só aparece quando S/N marcado */}
      {sn && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Referência <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="complemento"
            value={formData.complemento}
            onChange={handleInputChange}
            onBlur={() => handleBlur('complemento')}
            placeholder="Ex.: Casa azul ao lado da padaria"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
              showReferenceError ? 'border-red-400' : 'border-primary/40'
            }`}
          />
          {showReferenceError && (
            <p className="text-xs text-red-500 mt-1">Informe uma referência para facilitar a localização</p>
          )}
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Exemplos: Sítio Recanto Verde · Km 12 da RJ-116 · Atrás da Igreja São Pedro
          </p>
        </div>
      )}

      {/* Bairro */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Bairro <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="bairro"
          value={formData.bairro}
          onChange={handleInputChange}
          onBlur={() => handleBlur('bairro')}
          placeholder="Nome do bairro"
          className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
        />
      </div>

      {/* Cidade e Estado — somente leitura após CEP */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-foreground mb-2">
            Cidade
            {cepFilled && <Lock className="w-3 h-3 inline ml-1 text-muted-foreground/60" />}
          </label>
          <input
            type="text"
            name="cidade"
            value={formData.cidade}
            readOnly={cepFilled}
            onChange={!cepFilled ? handleInputChange : undefined}
            placeholder="Cidade"
            className={cepFilled ? readonlyFieldClass : 'w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm'}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Estado
            {cepFilled && <Lock className="w-3 h-3 inline ml-1 text-muted-foreground/60" />}
          </label>
          <input
            type="text"
            name="estado"
            value={formData.estado}
            readOnly={cepFilled}
            onChange={!cepFilled ? handleInputChange : undefined}
            placeholder="UF"
            className={cepFilled ? readonlyFieldClass : 'w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm'}
          />
        </div>
      </div>
      </>)}

      {/* Mapa */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Confirme sua localização</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Arraste o pin para ajustar a posição exata — útil em zonas rurais ou CEPs imprecisos.
        </p>

        {locationError && (
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{locationError}</p>
          </div>
        )}

        {loadingLocation && (
          <div className="bg-secondary border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
            Buscando localização...
          </div>
        )}

        {!loadingLocation && (
          <div className="rounded-lg overflow-hidden border border-border h-64">
            <MapContainer
              center={coords || defaultCoords}
              zoom={coords ? 16 : 12}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {coords && (
                <>
                  <DraggableMarker
                    position={coords}
                    onDragEnd={newCoords => setCoords(newCoords)}
                  />
                  <MapUpdater coords={coords} />
                </>
              )}
              {!coords && (
                <Marker position={defaultCoords} icon={markerIcon} />
              )}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
