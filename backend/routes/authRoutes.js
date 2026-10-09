const router = require("express").Router();
const { registerUser, loginUser } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("_id username email role team");
        if (!user) return res.status(401).json({ message: "User no longer exists" });
        res.json({ user });
    } catch {
        res.status(500).json({ message: "Unable to verify session" });
    }
});

module.exports = router;
