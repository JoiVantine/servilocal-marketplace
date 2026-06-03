const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  serviceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest' },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, trim: true, default: '' },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, trim: true, default: '' },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  lastMessage: String,
  lastMessageTime: Date,
  unreadCount: { type: Number, default: 0 },
}, { timestamps: true });

conversationSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    obj.updated_date = obj.updatedAt;
    if (obj.serviceRequestId) obj.serviceRequestId = obj.serviceRequestId.toString();
    if (obj.clientId) obj.clientId = obj.clientId.toString();
    if (obj.providerId) obj.providerId = obj.providerId.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('Conversation', conversationSchema);
