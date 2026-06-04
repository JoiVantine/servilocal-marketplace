const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  role: { type: String, enum: ['client', 'provider'] },
  name: { type: String, trim: true },
  phone: { type: String, trim: true },
  avatar: String,
  city: String,
  neighborhood: String,
  address: String,
  cep: String,
  addressStreet: String,
  addressNumber: String,
  addressComplement: String,
  addressCity: String,
  addressState: String,
  onboardingCompleted: { type: Boolean, default: false },
  firstAccess: { type: Boolean, default: true },
  addressLabel: { type: String, default: 'Casa' },
  notificationPrefs: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

userProfileSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    obj.created_by_id = obj.userId?.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
