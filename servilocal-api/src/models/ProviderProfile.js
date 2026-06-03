const mongoose = require('mongoose');

const providerProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, trim: true },
  bio: String,
  description: String,
  active: { type: Boolean, default: true },
  completedServices: { type: Number, default: 0 },
  city: String,
  neighborhood: String,
  category: String,
  specialties: [String],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  profilePhoto: String,
  portfolioPhotos: [String],
  hourlyRate: Number,
  available: { type: Boolean, default: true },
  lat: Number,
  lng: Number,
  cep: String,
  endereco: String,
  numero: String,
  estado: String,
}, { timestamps: true });

providerProfileSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_by_id = obj.userId?.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('ProviderProfile', providerProfileSchema);
