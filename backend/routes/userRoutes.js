const express = require("express");
const router = express.Router();

const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");

const {
    getUserPublic,
    getUserProfile,
    getMe,
    getMyTournaments,
    adminListUsers,
    softBanUser,
    unbanUser,
} = require("../controllers/userController");

router.get("/me/profile", protect, getMe);
router.get("/me/tournaments", protect, getMyTournaments);
router.get("/:id/profile", protect, getUserProfile);

router.get("/admin", protect, isAdmin, adminListUsers);

router.get("/moderation", protect, isAdmin, adminListUsers);

router.post("/:id/soft-ban", protect, isAdmin, softBanUser);
router.post("/:id/unban", protect, isAdmin, unbanUser);

router.get("/:id", getUserPublic);

module.exports = router;
