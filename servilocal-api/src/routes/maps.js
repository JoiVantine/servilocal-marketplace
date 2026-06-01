const router = require('express').Router();

const nominatimHeaders = {
  'Accept-Language': 'pt-BR',
  'User-Agent': 'ServiLocal/1.0',
  Accept: 'application/json',
};

router.post('/', async (req, res) => {
  try {
    const { type, query, lat, lng } = req.body;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) console.warn('[maps] GOOGLE_MAPS_API_KEY não configurada — usando fallbacks');

    // --- cities ---
    if (type === 'cities') {
      if (apiKey) {
        const r = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&components=country:br&language=pt-BR&key=${apiKey}`
        );
        const data = await r.json();
        if (data.status === 'OK' && data.predictions?.length) {
          return res.json({
            provider: 'google',
            cities: data.predictions.map(p => ({
              label: p.description,
              city: p.structured_formatting?.main_text || p.description,
              placeId: p.place_id,
            })),
          });
        }
      }
      // Fallback: IBGE
      const ibge = await (await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios')).json();
      const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const q = norm(query);
      const cities = ibge
        .filter(m => norm(m.nome).includes(q))
        .sort((a, b) => {
          const na = norm(a.nome), nb = norm(b.nome);
          if (na === q) return -1; if (nb === q) return 1;
          return na.localeCompare(nb);
        })
        .slice(0, 8)
        .map(m => {
          const uf = m.microrregiao?.mesorregiao?.UF?.sigla || '';
          return { label: uf ? `${m.nome}, ${uf}` : m.nome, city: m.nome, state: m.microrregiao?.mesorregiao?.UF?.nome || '', placeId: String(m.id) };
        });
      return res.json({ provider: 'ibge', cities });
    }

    // --- geocode ---
    if (type === 'geocode') {
      if (apiKey) {
        const r = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:BR&language=pt-BR&key=${apiKey}`
        );
        const data = await r.json();
        if (data.results?.length) {
          const result = data.results[0];
          const get = (t) => result.address_components.find(c => c.types.includes(t))?.long_name || '';
          return res.json({
            provider: 'google',
            lat: result.geometry.location.lat, lng: result.geometry.location.lng,
            endereco: get('route'), numero: get('street_number'),
            bairro: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
            cidade: get('administrative_area_level_2') || get('locality'),
            estado: get('administrative_area_level_1'), cep: get('postal_code'),
            formatted: result.formatted_address,
          });
        }
        console.warn('[maps] Google Geocode falhou:', data.status);
      }
      // Fallback: Nominatim
      const data = await (await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&limit=1&format=json&addressdetails=1&countrycodes=br`,
        { headers: nominatimHeaders }
      )).json();
      const item = data[0];
      if (!item) return res.status(404).json({ error: 'Endereço não encontrado' });
      const a = item.address || {};
      return res.json({
        provider: 'nominatim',
        lat: parseFloat(item.lat), lng: parseFloat(item.lon),
        endereco: a.road || '', numero: a.house_number || '',
        bairro: a.suburb || a.neighbourhood || '',
        cidade: a.city || a.town || a.municipality || '',
        estado: a.state || '', cep: a.postcode || '',
        formatted: item.display_name,
      });
    }

    // --- reverse ---
    if (type === 'reverse') {
      if (apiKey) {
        const r = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${apiKey}`
        );
        const data = await r.json();
        if (data.results?.length) {
          const result = data.results[0];
          const get = (t) => result.address_components.find(c => c.types.includes(t))?.long_name || '';
          return res.json({
            provider: 'google', lat, lng,
            endereco: get('route'), numero: get('street_number'),
            bairro: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
            cidade: get('administrative_area_level_2') || get('locality'),
            estado: get('administrative_area_level_1'), cep: get('postal_code'),
            formatted: result.formatted_address,
          });
        }
        console.warn('[maps] Google Reverse falhou:', data.status);
      }
      // Fallback: BigDataCloud
      const bdc = await (await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
      )).json();
      if (!bdc.city && !bdc.locality) return res.status(404).json({ error: 'Localização não encontrada' });
      return res.json({
        provider: 'bigdatacloud', lat, lng,
        endereco: '', numero: '',
        bairro: bdc.locality || '', cidade: bdc.city || bdc.locality || '',
        estado: bdc.principalSubdivision || '', cep: bdc.postcode || '',
        formatted: [bdc.locality, bdc.city, bdc.principalSubdivision].filter(Boolean).join(', '),
      });
    }

    res.status(400).json({ error: 'Tipo inválido. Use: cities, geocode ou reverse' });
  } catch (err) {
    console.error('[maps]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
