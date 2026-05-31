const mongoose = require("mongoose");

const BRACKETS = ["Single Elimination", "Double Elimination", "Round Robin"];
const STATUSES = ["Upcoming", "Live", "Completed"];

const tournamentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        game: { type: String, required: true, trim: true },

        bracket: { type: String, enum: BRACKETS, default: "Single Elimination" },

        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        registrationDeadline: { type: Date, required: true },

        playerLimit: { type: Number, default: 0, min: 0 },
        teamLimit: { type: Number, default: 0, min: 0 },

        status: { type: String, enum: STATUSES, default: "Upcoming" },
        registrationOpen: { type: Boolean, default: true },

        soloPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
        teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team", default: [] }],

        description: { type: String, default: "" },
        rules: { type: String, default: "" },
        location: { type: String, default: "" },
        prizePool: { type: String, default: "" },
        entryFee: { type: String, default: "" },

        bracketData: { type: Object, default: null },

        lastRegistrationActionBy: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Tournament", tournamentSchema);
