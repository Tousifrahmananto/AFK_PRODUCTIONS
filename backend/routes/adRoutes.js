const router = require("express").Router();
const { protect } = require("../middlewares/authMiddleware");
const AC = require("../controllers/adController");

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
};

router.post("/", protect, requireRole("Sponsor", "Partner", "Admin"), AC.createAd);
router.put("/:id", protect, requireRole("Sponsor", "Partner", "Admin"), AC.updateAd);
router.delete("/:id", protect, requireRole("Sponsor", "Partner", "Admin"), AC.deleteAd);
router.get("/mine", protect, requireRole("Sponsor", "Partner", "Admin"), AC.listMyAds);

router.get("/placement", AC.getAdsForPlacement);
router.post("/:id/click", AC.clickAd);

module.exports = router;
