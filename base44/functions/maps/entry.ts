const nominatimHeaders = {
  'Accept-Language': 'pt-BR',
  'User-Agent': 'ServiLocal/1.0',
};

const getCityName = (address = {}) => address.city || address.town || address.municipality || address.village || '';
const getNeighborhood = (address = {}) => address.suburb || address.neighbourhood || address.neighborhood || '';

Deno.serve(async (req) => {
  try {
    const { type, query, lat, lng } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    if (!apiKey) return Response.json({ error: 'API key not configured' }, { status: 500 });

    // Autocomplete de cidades brasileiras
    if (type === 'cities') {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&components=country:br&language=pt-BR&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK' && data.predictions?.length) {
        const cities = data.predictions.map(p => ({
          label: p.description,
          city: p.structured_formatting?.main_text || p.description,
          placeId: p.place_id,
        }));
        return Response.json({ cities, provider: 'google' });
      }

      const fallbackUrl = `https://servicodados.ibge.gov.br/api/v1/localidades/municipios`;
      const fallbackRes = await fetch(fallbackUrl);
      const fallbackData = await fallbackRes.json();
      const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const cities = fallbackData
        .filter(item => item.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(normalizedQuery))
        .sort((a, b) => {
          const nameA = a.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const nameB = b.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          if (nameA === normalizedQuery) return -1;
          if (nameB === normalizedQuery) return 1;
          return nameA.localeCompare(nameB);
        })
        .slice(0, 8)
        .map(item => {
          const state = item.microrregiao?.mesorregiao?.UF?.nome || '';
          const uf = item.microrregiao?.mesorregiao?.UF?.sigla || '';
          return {
            label: uf ? `${item.nome}, ${uf}` : item.nome,
            city: item.nome,
            placeId: item.id?.toString() || '',
            state,
          };
        });
      return Response.json({ cities, provider: 'ibge', googleStatus: data.status, googleError: data.error_message || null });
    }

    // Geocodificação direta (endereço → coords)
    if (type === 'geocode') {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:BR&language=pt-BR&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      console.log('Geocode status:', data.status, 'error:', data.error_message);
      if (!data.results?.length) {
        const fallbackUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&limit=1&format=json&addressdetails=1&countrycodes=br`;
        const fallbackRes = await fetch(fallbackUrl, { headers: { ...nominatimHeaders, Accept: 'application/json' } });
        const fallbackText = await fallbackRes.text();
        const fallbackData = JSON.parse(fallbackText);
        const item = fallbackData[0];
        if (!item) return Response.json({ error: 'Not found', status: data.status, details: data.error_message }, { status: 404 });
        const address = item.address || {};
        return Response.json({
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          endereco: address.road || '',
          numero: address.house_number || '',
          bairro: getNeighborhood(address),
          cidade: getCityName(address),
          estado: address.state || '',
          cep: address.postcode || '',
          formatted: item.display_name,
          provider: 'nominatim',
          googleStatus: data.status,
          googleError: data.error_message || null,
        });
      }
      const result = data.results[0];
      const comps = result.address_components;
      const get = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
      return Response.json({
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        endereco: get('route'),
        numero: get('street_number'),
        bairro: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
        cidade: get('administrative_area_level_2') || get('locality'),
        estado: get('administrative_area_level_1'),
        cep: get('postal_code'),
        formatted: result.formatted_address,
      });
    }

    // Geocodificação reversa (coords → endereço)
    if (type === 'reverse') {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=pt-BR&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.results?.length) {
        const fallbackUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`;
        const fallbackRes = await fetch(fallbackUrl);
        const fallbackData = await fallbackRes.json();
        if (!fallbackData.city && !fallbackData.locality) return Response.json({ error: 'Not found', status: data.status, details: data.error_message }, { status: 404 });
        return Response.json({
          lat,
          lng,
          endereco: fallbackData.localityInfo?.informative?.find(item => item.description === 'road')?.name || '',
          numero: '',
          bairro: fallbackData.locality || '',
          cidade: fallbackData.city || fallbackData.locality || '',
          estado: fallbackData.principalSubdivision || '',
          cep: fallbackData.postcode || '',
          formatted: [fallbackData.locality, fallbackData.city, fallbackData.principalSubdivision, fallbackData.countryName].filter(Boolean).join(', '),
          provider: 'bigdatacloud',
          googleStatus: data.status,
          googleError: data.error_message || null,
        });
      }
      const result = data.results[0];
      const comps = result.address_components;
      const get = (type) => comps.find(c => c.types.includes(type))?.long_name || '';
      return Response.json({
        lat,
        lng,
        endereco: get('route'),
        numero: get('street_number'),
        bairro: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
        cidade: get('administrative_area_level_2') || get('locality'),
        estado: get('administrative_area_level_1'),
        cep: get('postal_code'),
        formatted: result.formatted_address,
      });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});