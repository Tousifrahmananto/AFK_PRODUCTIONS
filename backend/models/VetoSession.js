const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchId: { type: String, required: true },
  current: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
  state: { type: Object, required: true },
  history: { type: [Object], default: [] },
}, { timestamps: true });
schema.index({ tournament: 1, matchId: 1 }, { unique: true, partialFilterExpression: { current: true } });
module.exports = mongoose.model('VetoSession', schema);
