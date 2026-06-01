const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'provider', 'admin'], default: 'client' },
  fullName: { type: String, trim: true },
  phone: { type: String, trim: true },
  city: { type: String, trim: true },
  photo: String,
  emailVerified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  resetToken: String,
  resetTokenExpiry: Date,
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.passwordHash;
    delete obj.otp;
    delete obj.otpExpiry;
    delete obj.resetToken;
    delete obj.resetTokenExpiry;
    return obj;
  },
});

module.exports = mongoose.model('User', userSchema);
