const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/admin');
const User = require('../models/User');

const router = Router();

function isSelf(req) {
  return req.user?.id === req.params.id;
}

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { _sort, _limit, ...filters } = req.query;
    const limit = Math.min(Number(_limit) || 200, 500);
    let q = User.find(filters).limit(limit);
    if (_sort) {
      const desc = _sort.startsWith('-');
      const field = _sort.replace(/^-/, '') === 'created_date' ? 'createdAt' : _sort.replace(/^-/, '');
      q = q.sort({ [field]: desc ? -1 : 1 });
    }
    res.json(await q);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    if (!isSelf(req) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const doc = await User.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    if (!isSelf(req) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const updates = { ...req.body };
    if (req.user.role !== 'admin') {
      delete updates.role;
      delete updates.emailVerified;
      delete updates.otp;
      delete updates.otpExpiry;
      delete updates.resetToken;
      delete updates.resetTokenExpiry;
      delete updates.passwordHash;
    }

    const doc = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
