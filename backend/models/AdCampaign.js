const mongoose = require("mongoose");

const AdCampaignSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: ["Homepage", "Tournament", "Gallery", "Sidebar", "Header"], default: "Homepage" },
    gameFilter: { type: String, default: "" },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", default: null },
    title: { type: String, required: true },
    imageUrl: { type: String, default: "" },
    linkUrl: { type: String, default: "" },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["Draft", "Active", "Paused", "Ended"], default: "Draft" },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("AdCampaign", AdCampaignSchema);
