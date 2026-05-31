const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
        name: { type: String, default: "" },
        username: { type: String, required: true, unique: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["Admin", "Player", "TeamManager", "Sponsor", "Partner"],
            default: "Player",
            index: true,
        },

        team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },

        banned: { type: Boolean, default: false, index: true },
        isBanned: { type: Boolean, default: false },
        bannedAt: { type: Date, default: null },
        bannedReason: { type: String, default: "" },
    },
    { timestamps: true }
);

UserSchema.virtual("effectiveBanned").get(function () {
    return !!(this.banned || this.isBanned);
});

module.exports = mongoose.model("User", UserSchema);
