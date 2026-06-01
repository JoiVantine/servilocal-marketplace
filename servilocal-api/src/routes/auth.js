const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const requireAuth = require('../middleware/auth');
const User = require('../models/User');
const EmailTemplate = require('../models/EmailTemplate');

// --- Mailer (console fallback em dev) ---
function getTransport() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

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
  const transport = getTransport();
  if (!transport) return;
  try {
    const from = process.env.EMAIL_FROM || `ServiLocal <${process.env.SMTP_USER}>`;
    await transport.sendMail({ from, to, subject, text, html });
  } catch (err) {
    console.warn('[mail] Falha ao enviar email:', err.message);
  }
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/send-otp — cria ou encontra usuário e envia código (sem senha)
router.post('/send-otp', async (req, res) => {
  try {
    const { email, fullName, phone, role } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
      user = await User.create({ email, passwordHash, fullName: fullName || '', phone: phone || '', role: role || 'client' });
    } else {
      // Atualiza dados se fornecidos
      if (fullName) user.fullName = fullName;
      if (phone) user.phone = phone;
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendMail(email, 'auth_otp', { otp }, {
      subject: 'Seu código ServiLocal',
      text: `Seu código de verificação: ${otp}`,
    });
    res.json({ message: 'Código enviado' });
  } catch (err) {
    console.error('[auth] send-otp:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/verify-otp — recebe email + código, retorna token
router.post('/verify-otp', async (req, res) => {
  try {
    const code = req.body.otp || req.body.otpCode;
    const { email } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'E-mail e código são obrigatórios' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (!user.otp || user.otp !== code || user.otpExpiry < new Date()) {
      return res.status(400).json({ error: 'Código inválido ou expirado' });
    }

    user.emailVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = signToken(user);
    res.json({ message: 'Verificado com sucesso', token, user });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/register — uso interno/admin (mantém senha)
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, fullName, role: role || 'client', emailVerified: true });

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[auth] register:', err.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    await sendMail(user.email, 'auth_resend_otp', { otp }, {
      subject: 'Seu novo código ServiLocal',
      text: `Seu código de verificação: ${otp}`,
    });
    res.json({ message: 'Código reenviado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, full_name, role, phone, city, photo } = req.body;
    const updates = {};
    if (fullName || full_name) updates.fullName = fullName || full_name;
    if (role) updates.role = role;
    if (phone !== undefined) updates.phone = phone;
    if (city !== undefined) updates.city = city;
    if (photo !== undefined) updates.photo = photo;
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/logout  (cliente apaga o token; servidor apenas confirma)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado' });
});

// POST /api/auth/reset-password-request
router.post('/reset-password-request', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    // Sempre retorna 200 para não revelar se o e-mail existe
    if (!user) return res.json({ message: 'Se o e-mail existir, você receberá um link em breve' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
    await sendMail(email, 'auth_reset_password', { resetUrl }, {
      subject: 'Redefinir senha ServiLocal',
      text: `Clique no link para redefinir sua senha:\n${resetUrl}\n\nO link expira em 1 hora.`,
    });

    res.json({ message: 'Se o e-mail existir, você receberá um link em breve' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token e senha são obrigatórios' });

    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Link inválido ou expirado' });

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
