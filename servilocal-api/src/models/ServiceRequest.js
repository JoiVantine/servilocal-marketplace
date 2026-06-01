const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: String,
  category: String,
  city: String,
  neighborhood: String,
  address: String,
  urgency: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_conversation', 'agreed', 'completed', 'cancelled'], default: 'open' },
  lat: Number,
  lng: Number,
}, { timestamps: true });

serviceRequestSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_by_id = obj.clientId?.toString();
    obj.created_date = obj.createdAt;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('ServiceRequest', serviceRequestSchema);
