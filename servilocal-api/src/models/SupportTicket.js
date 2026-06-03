const mongoose = require('mongoose');

const TICKET_CATEGORIES = [
  'provider_issue',
  'client_issue',
  'app_issue',
  'billing',
  'account_access',
  'suggestion',
  'other',
];

const TICKET_STATUSES = [
  'open',
  'in_review',
  'waiting_user',
  'resolved',
  'closed',
];

const TICKET_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent',
];

const supportTicketSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requesterRole: { type: String, enum: ['client', 'provider', 'admin'], required: true },
  requesterName: { type: String, trim: true, default: '' },
  requesterEmail: { type: String, trim: true, default: '' },
  category: { type: String, enum: TICKET_CATEGORIES, required: true, index: true },
  subject: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  attachments: { type: [String], default: [] },
  status: { type: String, enum: TICKET_STATUSES, default: 'open', index: true },
  priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium', index: true },
  relatedServiceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', index: true },
  relatedConversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', index: true },
  relatedClientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  relatedClientName: { type: String, trim: true, default: '' },
  relatedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  relatedProviderName: { type: String, trim: true, default: '' },
  citySnapshot: { type: String, trim: true, default: '', index: true },
  assignedAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  lastUpdatedAt: { type: Date, default: Date.now, index: true },
  lastResponsePreview: { type: String, trim: true, default: '' },
  lastResponderType: { type: String, enum: ['user', 'admin', 'system'], default: 'user' },
  resolvedAt: Date,
  closedAt: Date,
}, { timestamps: true });

supportTicketSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    obj.updated_date = obj.updatedAt;

    const objectIdFields = [
      'requesterId',
      'relatedServiceRequestId',
      'relatedConversationId',
      'relatedClientId',
      'relatedProviderId',
      'assignedAdminId',
    ];

    objectIdFields.forEach((field) => {
      if (obj[field]) obj[field] = obj[field].toString();
    });

    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
