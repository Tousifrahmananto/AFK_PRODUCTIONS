const express = require("express");
const router = express.Router();

const { protect: auth } = require("../middlewares/authMiddleware");
const {
    listPlayers,
    createTeam,
    getMyTeam,
    addMember,
    removeMember,
    leaveTeam,
    getTeamPublic,
} = require("../controllers/teamController");

router.get("/players", auth, listPlayers);
router.post("/create", auth, createTeam);
router.get("/my", auth, getMyTeam);
router.post("/:teamId/add", auth, addMember);
router.delete("/:teamId/remove/:userId", auth, removeMember);
router.post("/:teamId/leave", auth, leaveTeam);

router.get("/:id", auth, getTeamPublic);

module.exports = router;
