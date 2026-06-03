const mongoose = require('mongoose');

const supportTicketEventSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
  type: {
    type: String,
    enum: ['created', 'user_reply', 'admin_reply', 'status_changed', 'system_note'],
    required: true,
  },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String, enum: ['client', 'provider', 'admin', 'system'], required: true },
  actorName: { type: String, trim: true, default: '' },
  message: { type: String, trim: true, default: '' },
  attachments: { type: [String], default: [] },
  statusFrom: { type: String, default: null },
  statusTo: { type: String, default: null },
  visibleToUser: { type: Boolean, default: true },
}, { timestamps: true });

supportTicketEventSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    if (obj.ticketId) obj.ticketId = obj.ticketId.toString();
    if (obj.actorId) obj.actorId = obj.actorId.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('SupportTicketEvent', supportTicketEventSchema);
