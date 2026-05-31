const mongoose = require("mongoose");

const playerStatSchema = new mongoose.Schema(
  {
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    user:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    roundIndex: { type: Number, default: null },
    matchIndex: { type: Number, default: null },

    kills:   { type: Number, default: 0 },
    deaths:  { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    score:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

playerStatSchema.index({ tournament: 1, user: 1 });

module.exports = mongoose.model("PlayerStat", playerStatSchema);
