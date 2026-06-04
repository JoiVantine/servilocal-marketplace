const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const requireAuth = require('../middleware/auth');
const User = require('../models/User');
const EmailTemplate = require('../models/EmailTemplate');
const { sendMail } = require('../utils/mail');
const { sendWhatsApp } = require('../utils/whatsapp');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'joi.vantine@gmail.com').toLowerCase();
  const role = user.email?.toLowerCase() === adminEmail ? 'admin' : user.role;
  return jwt.sign(
    { id: user._id.toString(), email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/check-profile — verifica se e-mail + perfil de role já existem
router.post('/check-profile', async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.json({ exists: false, hasProfile: false });
    const user = await User.findOne({ email });
    if (!user) return res.json({ exists: false, hasProfile: false });
    const UserProfile = require('../models/UserProfile');
    const profile = await UserProfile.findOne({ userId: user._id });
    const hasProfile = !!profile && (profile.role === role || profile.role === 'both');
    res.json({ exists: true, hasProfile });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/send-otp — cria ou encontra usuário e envia código (sem senha)
router.post('/send-otp', otpLimiter, async (req, res) => {
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

    const phoneToUse = phone || user.phone;
    if (phoneToUse) {
      await sendWhatsApp(phoneToUse, `Seu código ServiLocal:\n\n${otp}\n\nEste código expira em 10 minutos.`);
    } else {
      await sendMail(email, 'account_token', { email, fullName: user.fullName, otp, role: user.role }, {
        subject: 'Seu código ServiLocal',
        text: `Seu código de verificação: ${otp}`,
      });
    }
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
    if (user.phone) {
      await sendWhatsApp(user.phone, `Seu novo código ServiLocal:\n\n${otp}\n\nEste código expira em 10 minutos.`);
    } else {
      await sendMail(user.email, 'account_resend_otp', { fullName: user.fullName || '', otp }, {
        subject: 'Seu novo código ServiLocal',
        text: `Seu novo código de verificação: ${otp}. Ele expira em 10 minutos.`,
      });
    }
    res.json({ message: 'Código reenviado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/login — aceita email ou celular como identificador
router.post('/login', async (req, res) => {
  try {
    const { email, password, identifier } = req.body;
    const login = (identifier || email || '').trim();
    if (!login || !password) return res.status(400).json({ error: 'E-mail/celular e senha são obrigatórios' });

    let user;
    if (login.includes('@')) {
      user = await User.findOne({ email: login.toLowerCase() });
    } else {
      // Busca por telefone — normaliza para só dígitos e testa formatos comuns
      const digits = login.replace(/\D/g, '');
      const phoneVariants = [
        digits,
        `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`,
        `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`,
        login,
      ].filter(Boolean);
      user = await User.findOne({ phone: { $in: phoneVariants } });
    }

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

// PATCH /api/auth/me/password — define ou troca senha (usuário autenticado, pós-OTP)
router.patch('/me/password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Senha é obrigatória' });
    if (password.length < 8) return res.status(400).json({ error: 'Senha deve ter ao menos 8 caracteres' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ message: 'Senha definida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/auth/logout  (cliente apaga o token; servidor apenas confirma)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado' });
});

// POST /api/auth/test-login — bypass de OTP exclusivo para NODE_ENV=test
// Cria o usuário se não existir e retorna token diretamente (sem e-mail/WhatsApp)
// O role do token respeita exatamente o role enviado (ignora lógica de ADMIN_EMAIL)
router.post('/test-login', async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email, role = 'client', fullName } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório' });

    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcrypt.hash('test-placeholder', 10);
      user = await User.create({
        email,
        passwordHash,
        fullName: fullName || `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        role,
        emailVerified: true,
      });
    }

    // Assina com o role exato do request — não aplica lógica de ADMIN_EMAIL
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { ...user.toJSON(), role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password-request
router.post('/reset-password-request', passwordResetLimiter, async (req, res) => {
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
