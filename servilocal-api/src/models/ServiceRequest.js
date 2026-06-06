const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: String,
  subcategory: String,
  city: String,
  neighborhood: String,
  address: String,
  zipCode: String,
  addressStreet: String,
  addressNumber: String,
  addressComplement: String,
  addressCity: String,
  addressState: String,
  when: String,
  scheduledAt: Date,
  scheduleOptions: [{
    date: String,
    startTime: String,
    endTime: String,
    label: String,
  }],
  photos: [String],
  urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_conversation', 'agreed', 'completed', 'cancelled'], default: 'open' },
  confirmedProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  confirmedProviderName: String,
  confirmedProviderPhoto: String,
  confirmedProviderPixKey: String,
  confirmedProviderPixKeyType: String,
  agreedPrice: mongoose.Schema.Types.Mixed,
  paymentMethod: String,
  paymentStatus: String,
  paymentAmount: Number,
  lat: Number,
  lng: Number,
  clientPhone: { type: String, default: '' },
  confirmedProviderPhone: { type: String, default: '' },
  progressStatus: { type: String },
  progressLog: [{ status: String, time: String }],
  completionCode: { type: String },
}, { timestamps: true });

serviceRequestSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_by_id = obj.clientId?.toString();
    obj.created_date = obj.createdAt;
    delete obj._id;
    delete obj.__v;
    delete obj.completionCode; // nunca expor o código ao frontend
    return obj;
  },
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
