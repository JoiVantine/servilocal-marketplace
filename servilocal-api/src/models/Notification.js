const mongoose = require('mongoose');

function normalizeNotificationPayload(target) {
  if (!target) return;

  const payload = target.$set && typeof target.$set === 'object' ? target.$set : target;
  const description = typeof payload.description === 'string' ? payload.description.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const normalizedBody = body || description;

  if (normalizedBody) {
    payload.body = normalizedBody;
    payload.description = normalizedBody;
  }

  const currentData = payload.data && typeof payload.data === 'object' ? payload.data : {};
  const relatedId = payload.relatedId || currentData.relatedId || null;

  if (relatedId) {
    payload.relatedId = relatedId;
    payload.data = { ...currentData, relatedId };
  } else if (payload.data && typeof payload.data === 'object') {
    payload.data = currentData;
  }
}

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  body: String,
  description: String,
  type: String,
  read: { type: Boolean, default: false },
  relatedId: mongoose.Schema.Types.Mixed,
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.pre('validate', function(next) {
  normalizeNotificationPayload(this);
  next();
});

notificationSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  normalizeNotificationPayload(update);
  this.setUpdate(update);
  next();
});

notificationSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    obj.updated_date = obj.updatedAt;
    obj.description = obj.description || obj.body || '';
    obj.body = obj.body || obj.description || '';
    obj.relatedId = obj.relatedId || obj.data?.relatedId || null;
    if (obj.userId) obj.userId = obj.userId.toString();
    if (obj.relatedId?.toString && obj.relatedId._bsontype) {
      obj.relatedId = obj.relatedId.toString();
    }
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
