const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  userAgent: String,
  active: { type: Boolean, default: true },
}, { timestamps: true });

pushSubscriptionSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    obj.updated_date = obj.updatedAt;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
