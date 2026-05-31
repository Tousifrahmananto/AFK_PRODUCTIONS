const router = require("express").Router();
const { protect } = require("../middlewares/authMiddleware");
const { isAdmin } = require("../middlewares/adminMiddleware");
const uploader = require("../utils/uploader");
const MC = require("../controllers/mediaController");

const requireAdmin = [protect, isAdmin];

router.post("/", requireAdmin, uploader.single("file"), MC.createMedia);
router.put("/:id", requireAdmin, uploader.single("file"), MC.updateMedia);
router.delete("/:id", requireAdmin, MC.deleteMedia);

router.get("/", MC.listMedia);

router.post("/videos", requireAdmin, uploader.single("file"), (req, res, next) => {
  req.body.kind = "video";
  return MC.createMedia(req, res, next);
});
router.put("/videos/:id", requireAdmin, uploader.single("file"), MC.updateMedia);
router.delete("/videos/:id", requireAdmin, MC.deleteMedia);
router.get("/videos", (req, res, next) => {
  req.query.kind = "video";
  return MC.listMedia(req, res, next);
});

module.exports = router;
