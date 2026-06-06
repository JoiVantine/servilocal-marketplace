const { Router } = require('express');
const requireAuth = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');

let webpush = null;
try {
  webpush = require('web-push');
} catch {
  webpush = null;
}

function configureWebPush() {
  if (!webpush || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:suporte@appservilocal.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

async function sendPushToUser(userId, payload) {
  if (!configureWebPush()) return;
  const subs = await PushSubscription.find({ userId, active: true }).lean();
  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys,
      }, JSON.stringify(payload));
    } catch (err) {
      if ([404, 410].includes(err.statusCode)) {
        await PushSubscription.updateOne({ endpoint: sub.endpoint }, { active: false });
      } else {
        console.error('[push]', err.message);
      }
    }
  }));
}

const router = Router();

router.get('/config', requireAuth, (req, res) => {
  res.json({
    enabled: Boolean(webpush && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
  });
});

router.post('/subscriptions', requireAuth, async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Inscricao push invalida' });
    }
    const doc = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user.id,
        endpoint,
        keys,
        userAgent: req.headers['user-agent'] || '',
        active: true,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/subscriptions', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (endpoint) {
      await PushSubscription.updateOne({ endpoint, userId: req.user.id }, { active: false });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.sendPushToUser = sendPushToUser;

module.exports = router;
