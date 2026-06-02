const https = require('https');
const EmailTemplate = require('../models/EmailTemplate');

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getValue(data, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], data);
}

function renderTemplate(template, data, escapeValues = false) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) => {
    const value = getValue(data, key);
    return escapeValues ? escapeHtml(value) : String(value ?? '');
  });
}

async function sendMail(to, templateKey, data, fallback) {
  const template = await EmailTemplate.findOne({ key: templateKey, active: true });
  const subject = template ? renderTemplate(template.subject, data) : fallback.subject;
  const text = template ? renderTemplate(template.text, data) : fallback.text;
  const html = template ? renderTemplate(template.html, data, true) : undefined;

  console.log(`[mail] Para: ${to} | ${subject} | ${text}`);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');

  const from = process.env.EMAIL_FROM || 'ServiLocal <naoresponda@appservilocal.com>';
  const body = JSON.stringify({
    from,
    to: [to],
    subject,
    text,
    ...(html ? { html } : {}),
  });

  await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[mail] Enviado via Resend: ${raw}`);
          resolve();
        } else {
          reject(new Error(`Resend API ${res.statusCode}: ${raw}`));
        }
      });
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Resend API timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { sendMail };
