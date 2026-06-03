const mongoose = require('mongoose');

function normalizeMessagePayload(target) {
  if (!target) return;

  const payload = target.$set && typeof target.$set === 'object' ? target.$set : target;
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const content = typeof payload.content === 'string' ? payload.content.trim() : '';
  const normalizedText = text || content;

  if (normalizedText) {
    payload.text = normalizedText;
    payload.content = normalizedText;
  }

  if (payload.read === true && !payload.readAt) {
    payload.readAt = new Date();
  }

  if (payload.read === false) {
    payload.readAt = null;
  }
}

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, trim: true, default: '' },
  senderType: { type: String, enum: ['client', 'provider', 'admin'], default: 'client' },
  text: { type: String, trim: true, default: '' },
  content: { type: String, trim: true, default: '' },
  read: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });

messageSchema.pre('validate', function(next) {
  normalizeMessagePayload(this);
  if (!this.text && !this.content) {
    this.invalidate('content', 'Path `content` is required.');
  }
  next();
});

messageSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate() || {};
  normalizeMessagePayload(update);
  this.setUpdate(update);
  next();
});

messageSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    obj.text = obj.text || obj.content || '';
    obj.content = obj.content || obj.text || '';
    obj.read = typeof obj.read === 'boolean' ? obj.read : Boolean(obj.readAt);
    if (obj.conversationId) obj.conversationId = obj.conversationId.toString();
    if (obj.senderId) obj.senderId = obj.senderId.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('Message', messageSchema);
