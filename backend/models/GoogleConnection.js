const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['sheets', 'gmail'], required: true },
  email: String,
  secret: { type: String, required: true, select: false },
}, { timestamps: true });
schema.index({ owner: 1, purpose: 1 }, { unique: true });
module.exports = mongoose.model('GoogleConnection', schema);
