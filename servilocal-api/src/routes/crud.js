const { Router } = require('express');
const requireAuth = require('../middleware/auth');

/**
 * Cria um router CRUD genérico para um model Mongoose.
 * @param {import('mongoose').Model} Model
 * @param {{ publicRead?, fieldMap?, afterCreate?, injectUser? }} options
 */
module.exports = function createCrudRouter(Model, options = {}) {
  const { publicRead = false, fieldMap = {}, afterCreate, afterUpdate, injectUser } = options;
  const r = Router();
  const guard = publicRead ? [] : [requireAuth];

  function buildQuery(raw) {
    const { _sort, _limit, ...rest } = raw;
    const filters = {};
    for (const [k, v] of Object.entries(rest)) {
      filters[fieldMap[k] || k] = v;
    }
    let sort = null;
    if (_sort) {
      const desc = _sort.startsWith('-');
      const field = _sort.replace(/^-/, '');
      const mapped = field === 'created_date' ? 'createdAt' : (fieldMap[field] || field);
      sort = { [mapped]: desc ? -1 : 1 };
    }
    return { filters, sort, limit: Math.min(Number(_limit) || 200, 500) };
  }

  // GET / — filter via query params
  r.get('/', ...guard, async (req, res) => {
    try {
      const { filters, sort, limit } = buildQuery(req.query);
      let q = Model.find(filters).limit(limit);
      if (sort) q = q.sort(sort);
      res.json(await q);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /:id
  r.get('/:id', ...guard, async (req, res) => {
    try {
      const doc = await Model.findById(req.params.id);
      if (!doc) return res.status(404).json({ error: 'Not found' });
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /
  r.post('/', requireAuth, async (req, res) => {
    try {
      const data = { ...req.body };
      if (injectUser) data[injectUser] = req.user.id;
      const doc = await Model.create(data);
      res.status(201).json(doc);
      if (afterCreate) {
        setImmediate(() => {
          afterCreate(doc, req).catch(err => console.error('[afterCreate]', err.message));
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /:id
  r.patch('/:id', requireAuth, async (req, res) => {
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!doc) return res.status(404).json({ error: 'Not found' });
      if (afterUpdate) afterUpdate(doc, req).catch(err => console.error('[afterUpdate]', err.message));
      res.json(doc);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /:id
  r.delete('/:id', requireAuth, async (req, res) => {
    try {
      await Model.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return r;
};
