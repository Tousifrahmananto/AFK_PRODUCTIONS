const express = require("express");
const router = express.Router();
const { getPlayersLeaderboard } = require("../controllers/leaderboardController");
const { protect } = require("../middlewares/authMiddleware");

router.get("/players", getPlayersLeaderboard);

module.exports = router;
