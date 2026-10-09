const mongoose = require("mongoose");
const User = require("../models/User");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");

async function getUserPublic(req, res) {
  try {
    const u = await User.findById(req.params.id)
      .select(req.user.role === "Admin" || req.user.userId === req.params.id
        ? "_id username email role isBanned banned createdAt updatedAt"
        : "_id username role createdAt updatedAt");
    if (!u) return res.status(404).json({ message: "User not found" });
    res.json(u);
  } catch (e) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
}

async function addEffectiveTeam(userLean) {
  if (userLean.team && typeof userLean.team === "object") return userLean;
  const membership = await Team.findOne({ members: userLean._id })
    .select("teamName name logoUrl")
    .lean();
  return membership ? { ...userLean, team: membership } : userLean;
}

async function fetchJoinedTournaments(userId, teamId) {
  const soloList = await Tournament.find({ soloPlayers: userId })
    .select("title game bracket status startDate")
    .lean();

  let teamList = [];
  if (teamId) {
    teamList = await Tournament.find({ teams: teamId })
      .select("title game bracket status startDate")
      .lean();
  }

  return [
    ...soloList.map(t => ({ ...t, mode: "Solo" })),
    ...teamList.map(t => ({ ...t, mode: "Team" })),
  ].sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
}

async function getUserProfile(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const raw = await User.findById(id)
      .select(req.user.role === "Admin" || req.user.userId === id
        ? "-password -passwordHash -__v"
        : "_id username role team createdAt updatedAt")
      .populate({ path: "team", select: "teamName name logoUrl" })
      .lean();

    if (!raw) return res.status(404).json({ message: "User not found" });

    const user = await addEffectiveTeam(raw);
    const teamId = user.team?._id;
    const joinedTournaments = await fetchJoinedTournaments(user._id, teamId);

    res.json({ ...user, joinedTournaments });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

async function getMe(req, res) {
  try {
    const meRaw = await User.findById(req.user.userId)
      .select("-password -passwordHash -__v")
      .populate({ path: "team", select: "teamName name logoUrl" })
      .lean();

    if (!meRaw) return res.status(404).json({ message: "User not found" });

    const me = await addEffectiveTeam(meRaw);
    const teamId = me.team?._id;
    const tournaments = await fetchJoinedTournaments(me._id, teamId);

    res.json({ user: me, tournaments });
  } catch {
    res.status(500).json({ message: "Failed to load profile" });
  }
}

async function getMyTournaments(req, res) {
  try {
    const me = await User.findById(req.user.userId).select("team").lean();
    if (!me) return res.status(404).json({ message: "User not found" });

    let teamId = me.team;
    if (!teamId) {
      const membership = await Team.findOne({ members: me._id }).select("_id").lean();
      teamId = membership?._id || null;
    }

    const items = await fetchJoinedTournaments(req.user.userId, teamId);
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to fetch your tournaments" });
  }
}

async function adminListUsers(req, res) {
  try {
    console.log("adminListUsers called", {
      query: req.query,
      user: req.user ? { id: req.user.userId, role: req.user.role } : null,
    });
    const { q = "", role = "All", bannedOnly = "false" } = req.query;

    const filter = { role: { $nin: ["Sponsor", "Partner"] } };
    if (role !== "All") filter.role = role;
    if (bannedOnly === "true") filter.$or = [{ isBanned: true }, { banned: true }];

    if (q.trim()) {
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escapeRegex(q.trim()), "i");
      filter.$or = [
        ...(filter.$or || []),
        { username: rx },
        { email: rx },
        { name: rx },
      ];
    }

    console.log("adminListUsers filter:", JSON.stringify(filter));
    const users = await User.find(filter)
      .select("_id name username email role isBanned banned bannedAt bannedReason createdAt")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    res.json(users);
  } catch (e) {
    console.error("adminListUsers error:", e && e.stack ? e.stack : e);
    res.status(500).json({ message: "Failed to load users", error: e?.message || String(e) });
  }
}

async function softBanUser(req, res) {
  try {
    const { id } = req.params;
    const { reason = "" } = req.body || {};

    const u = await User.findById(id);
    if (!u) return res.status(404).json({ message: "User not found" });
    if (["Sponsor", "Partner"].includes(u.role)) {
      return res.status(400).json({ message: "Cannot ban this role from this panel" });
    }

    u.isBanned = true;
    u.banned = true;
    u.bannedAt = new Date();
    u.bannedReason = reason || "Violation of rules";
    await u.save();

    res.json({ message: "User soft-banned", id: u._id, banned: true });
  } catch (e) {
    console.error("softBanUser error:", e);
    res.status(500).json({ message: "Failed to ban user" });
  }
}

async function unbanUser(req, res) {
  try {
    const { id } = req.params;
    const u = await User.findById(id);
    if (!u) return res.status(404).json({ message: "User not found" });

    u.isBanned = false;
    u.banned = false;
    u.bannedAt = null;
    u.bannedReason = "";
    await u.save();

    res.json({ message: "User unbanned", id: u._id, banned: false });
  } catch (e) {
    console.error("unbanUser error:", e);
    res.status(500).json({ message: "Failed to unban user" });
  }
}

module.exports = {
  getUserPublic,
  getUserProfile,
  getMe,
  getMyTournaments,
  adminListUsers,
  softBanUser,
  unbanUser,
};
