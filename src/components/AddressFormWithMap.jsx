import { useState, useEffect } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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
    if (coords) map.setView(coords, 15);
  }, [coords, map]);
  return null;
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
        return { lat: loc.lat, lng: loc.lng, name: data.results[0].formatted_address };
      }
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&countrycodes=br&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR', 'User-Agent': 'ServiLocal/1.0' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), name: data[0].display_name };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
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
    estado: init.estado || 'SP',
  });
  const [sn, setSn] = useState(init.numero === 'S/N');
  const [touched, setTouched] = useState({});
  const [coords, setCoords] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  const defaultCoords = [-23.5505, -46.6333];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cep') {
      let val = value.replace(/\D/g, '').slice(0, 8);
      if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
      setFormData((prev) => ({ ...prev, [name]: val }));
      if (val.replace(/\D/g, '').length === 8) fetchCepData(val.replace(/\D/g, ''));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  const handleSn = (checked) => {
    setSn(checked);
    setFormData((prev) => ({ ...prev, numero: checked ? 'S/N' : '' }));
    setTouched((prev) => ({ ...prev, numero: true }));
  };

  const fetchCepData = async (cepDigits) => {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFormData((prev) => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
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
          setLocationError('Endereço não encontrado. Verifique os dados.');
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

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-foreground mb-4">Para começar, qual seu endereço?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Comece pelo CEP — o restante a gente preenche pra você.
        </p>

        <div className="bg-secondary/50 border border-primary/20 rounded-lg p-4 mb-4 flex gap-3">
          <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Seu endereço fica oculto. Só será usado para buscar profissionais na sua região.
          </p>
        </div>

        {/* CEP */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            CEP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="cep"
            value={formData.cep}
            onChange={handleInputChange}
            onBlur={() => handleBlur('cep')}
            placeholder=""
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Digite o CEP. Os dados serão preenchidos automaticamente.
          </p>
        </div>

        {/* Endereço */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Endereço <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="endereco"
            value={formData.endereco}
            onChange={handleInputChange}
            onBlur={() => handleBlur('endereco')}
            placeholder=""
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        {/* Número e Complemento */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Número <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="numero"
              value={sn ? 'S/N' : formData.numero}
              onChange={handleInputChange}
              onBlur={() => handleBlur('numero')}
              placeholder=""
              disabled={sn}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm ${
                sn ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-card'
              } ${showNumeroError ? 'border-red-400' : 'border-border'}`}
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sn}
                onChange={(e) => handleSn(e.target.checked)}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="text-xs text-muted-foreground">Sem número (S/N)</span>
            </label>
            {sn && (
              <p className="text-xs text-primary mt-1 leading-relaxed">
                Informe o complemento completo para facilitar a localização
              </p>
            )}
            {showNumeroError && (
              <p className="text-xs text-red-500 mt-1">O número do endereço é obrigatório</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Complemento {sn && <span className="text-red-500">*</span>}
              {!sn && <span className="text-muted-foreground text-xs"> (opcional)</span>}
            </label>
            <input
              type="text"
              name="complemento"
              value={formData.complemento}
              onChange={handleInputChange}
              placeholder={sn ? 'Referência de localização' : ''}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm bg-card ${
                sn && !formData.complemento ? 'border-primary/50' : 'border-border'
              }`}
            />
          </div>
        </div>

        {/* Bairro */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Bairro <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bairro"
            value={formData.bairro}
            onChange={handleInputChange}
            onBlur={() => handleBlur('bairro')}
            placeholder=""
            className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>

        {/* Cidade e Estado */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Cidade <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cidade"
              value={formData.cidade}
              onChange={handleInputChange}
              onBlur={() => handleBlur('cidade')}
              placeholder=""
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Estado <span className="text-red-500">*</span>
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            >
              <option value="SP">SP</option>
              <option value="RJ">RJ</option>
              <option value="MG">MG</option>
              <option value="BA">BA</option>
              <option value="PR">PR</option>
              <option value="SC">SC</option>
              <option value="RS">RS</option>
              <option value="ES">ES</option>
              <option value="PE">PE</option>
              <option value="CE">CE</option>
            </select>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Localização no mapa</h3>

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
              zoom={coords ? 15 : 12}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              {coords && (
                <>
                  <Marker position={coords} icon={markerIcon}>
                    <Popup>{formData.endereco}</Popup>
                  </Marker>
                  <MapUpdater coords={coords} />
                </>
              )}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}
