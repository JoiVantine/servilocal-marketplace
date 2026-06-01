const mongoose = require('mongoose');
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

module.exports = async function connectDB() {
  mongoose.connection.on('connected', () => console.log('[db] MongoDB conectado'));
  mongoose.connection.on('error', (err) => console.error('[db] Erro:', err.message));
  await mongoose.connect(process.env.MONGODB_URI);
};
