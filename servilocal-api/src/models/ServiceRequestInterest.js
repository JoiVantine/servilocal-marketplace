const mongoose = require('mongoose');

const serviceRequestInterestSchema = new mongoose.Schema({
  serviceRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: String,
  providerPhoto: String,
  city: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  specialties: [String],
  price: String,
  arrivalTime: String,
  status: { type: String, enum: ['pending', 'in_conversation', 'accepted', 'rejected', 'completed', 'cancelled'], default: 'pending' },
  message: String,
}, { timestamps: true });

serviceRequestInterestSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_date = obj.createdAt;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('ServiceRequestInterest', serviceRequestInterestSchema);
