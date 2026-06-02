const axios = require('axios');

const EVO_URL = process.env.EVOLUTION_API_URL;
const EVO_KEY = process.env.EVOLUTION_API_KEY;
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE || 'serviLocal';

async function sendWhatsApp(phone, text) {
  if (!EVO_URL || !EVO_KEY) throw new Error('Evolution API não configurada');

  const number = String(phone).replace(/\D/g, '');
  const fullNumber = number.startsWith('55') ? number : `55${number}`;

  const { data } = await axios.post(
    `${EVO_URL}/message/sendText/${EVO_INSTANCE}`,
    { number: fullNumber, text },
    { headers: { apikey: EVO_KEY } }
  );
  return data;
}

module.exports = { sendWhatsApp };
