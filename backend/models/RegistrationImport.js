const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  fingerprint: { type: String, required: true },
  source: { type: Object, required: true },
  rows: { type: [Object], required: true },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ owner: 1, tournament: 1, fingerprint: 1 }, { unique: true });
module.exports = mongoose.model('RegistrationImport', schema);
