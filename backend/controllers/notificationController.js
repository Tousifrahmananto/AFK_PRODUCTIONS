const Notification = require("../models/Notification");

async function listMine(req, res) {
  try {
    const list = await Notification.find({ user: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function unreadCount(req, res) {
  try {
    const count = await Notification.countDocuments({
      user: req.user.userId,
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;
    const n = await Notification.findOneAndUpdate(
      { _id: id, user: req.user.userId },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );
    if (!n) return res.status(404).json({ message: "Notification not found" });
    res.json(n);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function markAllRead(req, res) {
  try {
    await Notification.updateMany(
      { user: req.user.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function removeOne(req, res) {
  try {
    const { id } = req.params;
    const del = await Notification.findOneAndDelete({
      _id: id,
      user: req.user.userId,
    });
    if (!del) return res.status(404).json({ message: "Notification not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { listMine, unreadCount, markRead, markAllRead, removeOne };
