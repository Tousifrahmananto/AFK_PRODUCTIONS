const Team = require("../models/Team");
const User = require("../models/User");
const Notification = require("../models/Notification");

async function ensureTeamHasGame(teamId) {
  const t = await Team.findById(teamId).select("game").lean();
  if (t && (!t.game || t.game === "")) {
    await Team.updateOne({ _id: teamId }, { $set: { game: "unspecified" } }, { runValidators: false });
  }
}
const getTeamPublic = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("captain", "_id username")
      .populate("members", "_id username")
      .lean();

    if (!team) return res.status(404).json({ message: "Team not found" });

    res.json({
      _id: team._id,
      teamName: team.teamName,
      captain: team.captain ? { _id: team.captain._id, username: team.captain.username } : null,
      members: (team.members || []).map(m => ({ _id: m._id, username: m.username })),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch team" });
  }
};
function populateTeam(q) {
  return q
    .populate("members", "username email role")
    .populate("captain", "username email role");
}

async function safeNotify(req, {
  user, createdBy, team, title, message, link = "/", type = "team", meta = {}
}) {
  try {
    const doc = await Notification.create({
      user,
      createdBy,
      team,
      type,
      title,
      message,
      link,
      meta,
      read: false,
      readAt: null,
    });

    const io = req.app?.get?.("io");
    if (io && user) {
      io.to(String(user)).emit("notification:new", {
        _id: doc._id,
        type: doc.type,
        title: doc.title,
        message: doc.message,
        link: doc.link,
        meta: doc.meta,
        createdAt: doc.createdAt,
        read: doc.read,
      });
    }
  } catch (e) {
    console.warn("safeNotify failed:", e.message);
  }
}

const listPlayers = async (req, res) => {
  try {
    if (req.user.role !== "TeamManager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admins or Team Managers only" });
    }
    const players = await User.find({
      role: "Player",
      $or: [{ team: null }, { team: { $exists: false } }],
    })
      .select("username email role team")
      .lean();

    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createTeam = async (req, res) => {
  const {
    teamName,
    game,
    logoUrl = "",
    bio = "",
    region = "",
    socials = {},
    maxMembers = 5,
    visibility = "public",
    captainId,
    initialMembers = [],
  } = req.body;

  const mgrId = req.user.userId;

  try {
    if (req.user.role !== "TeamManager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admins or Team Managers only" });
    }
    if (!teamName || !game) {
      return res.status(400).json({ message: "teamName and game are required" });
    }

    const cap = Number(maxMembers);
    if (Number.isNaN(cap) || cap < 1 || cap > 20) {
      return res.status(400).json({ message: "maxMembers must be between 1 and 20" });
    }
    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ message: "visibility must be 'public' or 'private'" });
    }

    let captain = mgrId;
    if (captainId) {
      const capUser = await User.findById(captainId);
      if (!capUser) return res.status(404).json({ message: "Captain not found" });
      if (!["Player", "TeamManager", "Admin"].includes(capUser.role)) {
        return res.status(400).json({ message: "Invalid captain role" });
      }
      captain = capUser._id;
    }

    const memberIds = Array.isArray(initialMembers) ? [...new Set(initialMembers.map(String))] : [];
    const filteredMemberIds = memberIds.filter((id) => id !== String(captain));

    const players = filteredMemberIds.length
      ? await User.find({ _id: { $in: filteredMemberIds }, role: "Player" })
      : [];

    if (players.length !== filteredMemberIds.length) {
      return res.status(400).json({ message: "All initial members must be valid Players" });
    }

    const totalInitial = 1 + players.length;
    if (totalInitial > cap) {
      return res.status(400).json({ message: `Initial members exceed capacity (${cap})` });
    }

    const busy = await User.find({
      _id: { $in: [captain, ...players.map((p) => p._id)] },
      team: { $ne: null, $exists: true },
    });

    if (busy.length > 0) {
      return res.status(400).json({ message: "Captain or a member is already in another team" });
    }

    const team = await Team.create({
      teamName,
      captain,
      members: [captain, ...players.map((p) => p._id)],
      game,
      logoUrl,
      bio,
      region,
      socials: {
        website: socials.website || "",
        discord: socials.discord || "",
        twitter: socials.twitter || "",
        youtube: socials.youtube || "",
      },
      maxMembers: cap,
      visibility,
    });

    await User.updateMany(
      { _id: { $in: [captain, ...players.map((p) => p._id)] } },
      { $set: { team: team._id } }
    );

    const populated = await populateTeam(Team.findById(team._id));
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getMyTeam = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("team").lean();
    if (!user?.team) {
      return res.status(404).json({ message: "No team assigned" });
    }
    await ensureTeamHasGame(user.team);
    const team = await populateTeam(Team.findById(user.team));
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addMember = async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  try {
    if (req.user.role !== "TeamManager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admins or Team Managers only" });
    }

    const team = await Team.findById(teamId)
      .select("captain members maxMembers game teamName")
      .lean();
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (String(team.captain) !== String(req.user.userId) && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Only your own team" });
    }

    const player = await User.findById(userId).select("role team").lean();
    if (!player || player.role !== "Player") {
      return res.status(400).json({ message: "Can only add Players" });
    }
    if (player.team) {
      return res.status(400).json({ message: "Player already in a team" });
    }
    if (team.members.map(String).includes(String(userId))) {
      return res.status(400).json({ message: "Already a member" });
    }
    if (team.members.length >= team.maxMembers) {
      return res.status(400).json({ message: "Team is at capacity" });
    }

    await ensureTeamHasGame(teamId);

    const updated = await Team.findOneAndUpdate(
      { _id: teamId },
      { $addToSet: { members: userId } },
      { new: true, runValidators: false }
    );

    await User.updateOne({ _id: userId }, { $set: { team: teamId } });

    const captainUser = await User.findById(team.captain).select("username").lean();
    await safeNotify(req, {
      user: userId,
      createdBy: team.captain,
      team: teamId,
      type: "team",
      title: "You were added to a team",
      message: `${captainUser?.username || "Captain"} added you to "${team.teamName}".`,
      link: "/my-team",
      meta: { teamId: String(teamId) },
    });

    const populated = await populateTeam(Team.findById(updated._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeMember = async (req, res) => {
  const { teamId, userId } = req.params;

  try {
    if (req.user.role !== "TeamManager" && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Admins or Team Managers only" });
    }

    const team = await Team.findById(teamId)
      .select("captain members game teamName")
      .lean();
    if (!team) return res.status(404).json({ message: "Team not found" });
    if (String(team.captain) !== String(req.user.userId) && req.user.role !== "Admin") {
      return res.status(403).json({ message: "Only your own team" });
    }
    if (String(team.captain) === String(userId)) {
      return res.status(400).json({ message: "Captain cannot be removed" });
    }

    await ensureTeamHasGame(teamId);

    const updated = await Team.findOneAndUpdate(
      { _id: teamId },
      { $pull: { members: userId } },
      { new: true, runValidators: false }
    );

    await User.updateOne({ _id: userId }, { $unset: { team: "" } });

    await safeNotify(req, {
      user: userId,
      createdBy: team.captain,
      team: teamId,
      type: "team",
      title: "You were removed from a team",
      message: `You were removed from "${team.teamName}".`,
      link: "/tournaments",
      meta: { teamId: String(teamId) },
    });

    const populated = await populateTeam(Team.findById(updated._id));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const leaveTeam = async (req, res) => {
  const userId = req.user.userId;

  try {
    const user = await User.findById(userId).select("team").lean();
    if (!user?.team) return res.status(400).json({ message: "Not in a team" });

    const team = await Team.findById(user.team).select("captain members game").lean();
    if (!team) {
      await User.updateOne({ _id: userId }, { $unset: { team: "" } });
      return res.json({ message: "Left the team" });
    }
    if (String(team.captain) === String(userId)) {
      return res.status(400).json({ message: "Captain cannot leave. Transfer captaincy first." });
    }

    await ensureTeamHasGame(team._id);

    await Team.updateOne({ _id: team._id }, { $pull: { members: userId } }, { runValidators: false });
    await User.updateOne({ _id: userId }, { $unset: { team: "" } });

    res.json({ message: "Left the team" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listPlayers,
  createTeam,
  getMyTeam,
  addMember,
  removeMember,
  leaveTeam,
  getTeamPublic,
};
