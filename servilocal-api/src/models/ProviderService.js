const mongoose = require('mongoose');

const providerServiceSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceName: { type: String, trim: true },
  specialty: { type: String, trim: true },
  description: String,
  price: String,
  duration: String,
  homeCare: { type: String, default: 'sim' },
  freight: String,
  materials: { type: String, default: 'provider' },
  active: { type: Boolean, default: true },
  category: String,
}, { timestamps: true });

providerServiceSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('ProviderService', providerServiceSchema);
