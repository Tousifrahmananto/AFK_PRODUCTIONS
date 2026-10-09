const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  stateHash: { type: String, unique: true, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['sheets', 'gmail'], required: true },
  verifier: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('GoogleOAuthState', schema);
