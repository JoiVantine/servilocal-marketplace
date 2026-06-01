const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  text: { type: String, required: true },
  html: { type: String, required: true },
  active: { type: Boolean, default: true },
  variables: [{ type: String, trim: true }],
}, { timestamps: true });

emailTemplateSchema.set('toJSON', {
  transform: (_, obj) => {
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
