const mongoose = require("mongoose");
const { Schema } = mongoose;

const socialsSchema = new Schema(
  {
    website: { type: String, default: "" },
    discord: { type: String, default: "" },
    twitter: { type: String, default: "" },
    youtube: { type: String, default: "" },
  },
  { _id: false }
);

const teamSchema = new Schema(
  {
    teamName: { type: String, required: true, trim: true },
    captain: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],

    game: {
      type: String,
      required: function () {
        return this.isNew;
      },
      default: "N/A",
      trim: true,
    },

    logoUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 600 },
    region: { type: String, default: "" },
    socials: { type: socialsSchema, default: () => ({}) },

    maxMembers: { type: Number, default: 5, min: 1, max: 20 },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    status: { type: String, enum: ["active", "disbanded"], default: "active" },
  },
  { timestamps: true }
);

teamSchema.index({ teamName: 1 }, { unique: false });
teamSchema.index({ captain: 1 });

module.exports = mongoose.model("Team", teamSchema);
