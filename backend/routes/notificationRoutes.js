const express = require("express");
const router = express.Router();

const {
  listMine,
  unreadCount,
  markRead,
  markAllRead,
  removeOne,
} = require("../controllers/notificationController");

router.get("/", listMine);
router.get("/unread-count", unreadCount);
router.post("/:id/read", markRead);
router.post("/read-all", markAllRead);
router.delete("/:id", removeOne);

module.exports = router;
