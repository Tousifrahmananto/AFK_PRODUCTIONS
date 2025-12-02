// server/routes/tournamentRoutes.js
const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");
const uploader = require("../utils/uploader");

const {
  getAllTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  getParticipants,
  toggleRegistration,
  getMyStatus,
  registerSolo,
  registerTeam,
  unregisterSolo,
  unregisterTeam,
  adminRemoveSolo,
  adminRemoveTeam,
  generateBracket,
  getBracket,
  setMatchResult,
  getBracketVisibility,
  recordPlayerStatsForMatch,
  getPlayerStatsForMatch,
  getMatchMedia,
  uploadMatchMedia,
  deleteMatchMedia,
} = require("../controllers/tournamentController");

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
// Public list
router.get("/", getAllTournaments);

// Bracket (protected; controller enforces visibility for non-admins)
router.get("/:id/bracket", protect, getBracket);
router.get("/:id/bracket/visibility", protect, getBracketVisibility);

// Admin only
router.post("/create", protect, isAdmin, createTournament);
router.put("/:id", protect, isAdmin, updateTournament);
router.delete("/:id", protect, isAdmin, deleteTournament);
router.get("/:id/participants", protect, isAdmin, getParticipants);
router.post("/:id/toggle-registration", protect, isAdmin, toggleRegistration);
router.delete("/:id/remove-solo/:userId", protect, isAdmin, adminRemoveSolo);
router.delete("/:id/remove-team/:teamId", protect, isAdmin, adminRemoveTeam);
router.post("/:id/generate-bracket", protect, isAdmin, generateBracket);
router.post("/:id/bracket/match-result", protect, isAdmin, setMatchResult);
// Admin: per-match player stats
router.get("/:id/matches/:roundIndex/:matchIndex/player-stats", protect, isAdmin, getPlayerStatsForMatch);
router.post("/:id/matches/:roundIndex/:matchIndex/player-stats", protect, isAdmin, recordPlayerStatsForMatch);

// Authenticated user actions
router.get("/:id/my-status", protect, getMyStatus);
router.post("/:id/register-solo", protect, registerSolo);
router.post("/:id/register-team", protect, registerTeam);

// Unregister (support both verbs)
router.delete("/:id/unregister-solo", protect, unregisterSolo);
router.delete("/:id/unregister-team", protect, unregisterTeam);
router.post("/:id/unregister-solo", protect, unregisterSolo);
router.post("/:id/unregister-team", protect, unregisterTeam);

// Match media (admin)
router.get("/:id/matches/:r/:m/media", getMatchMedia);
router.post("/:id/matches/:r/:m/media", protect, isAdmin, uploader.array("files"), uploadMatchMedia);
router.delete("/:id/matches/:r/:m/media", protect, isAdmin, deleteMatchMedia);


module.exports = router;
