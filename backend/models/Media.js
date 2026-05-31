const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema(
    {
        tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
        matchId: { type: String, default: "" },
        kind: { type: String, enum: ["video", "image"], required: true },

        title: { type: String, required: true },
        description: { type: String, default: "" },

        filePath: { type: String, default: "" },
        externalUrl: { type: String, default: "" },
        thumbnailUrl: { type: String, default: "" },

        category: { type: String, default: "General" },
        game: { type: String, default: "" },

        tags: [{ type: String }],

        visibility: { type: String, enum: ["Public", "Unlisted", "Private"], default: "Public" },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

MediaSchema.index({ tournament: 1, kind: 1, createdAt: -1 });
MediaSchema.index({ matchId: 1, tournament: 1 });
MediaSchema.index({ title: "text", description: "text" });
MediaSchema.index({ tags: 1 });

module.exports = mongoose.model("Media", MediaSchema);
