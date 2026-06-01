const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  body: String,
  type: String,
  read: { type: Boolean, default: false },
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
