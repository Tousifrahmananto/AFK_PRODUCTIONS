const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  rowKey: { type: String, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationImport', required: true },
}, { timestamps: true });
schema.index({ tournament: 1, rowKey: 1 }, { unique: true });
module.exports = mongoose.model('ImportRegistration', schema);
