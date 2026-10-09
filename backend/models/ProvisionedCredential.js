const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationImport', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rowKey: String, teamName: String, login: String, role: String, recipient: String,
  secret: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'unknown'], default: 'pending' },
  attemptedAt: Date, providerId: String, error: String,
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ user: 1 }, { unique: true });
module.exports = mongoose.model('ProvisionedCredential', schema);
