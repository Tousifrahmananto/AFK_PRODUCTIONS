const PlayerStat = require("../models/PlayerStat");
const User = require("../models/User");

exports.getPlayersLeaderboard = async (req, res) => {
  try {
    const { tournament, limit = 100 } = req.query;

    const match = {};
    if (tournament) match.tournament = tournament;

    const rows = await PlayerStat.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$user",
          totalScore: { $sum: "$score" },
          kills: { $sum: "$kills" },
          deaths: { $sum: "$deaths" },
          assists: { $sum: "$assists" },
          entries: { $sum: 1 },
        },
      },
      { $sort: { totalScore: -1, kills: -1, assists: -1 } },
      { $limit: Number(limit) },
    ]);

    const userIds = rows.map((r) => r._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select("_id username name role")
      .lean();
    const umap = Object.fromEntries(users.map((u) => [String(u._id), u]));

    const to2 = (n) => Math.round(n * 100) / 100;

    const data = rows.map((r) => {
      const deathsSafe = r.deaths > 0 ? r.deaths : 1;
      const kd = to2(r.kills / deathsSafe);
      const kda = to2((r.kills + r.assists) / deathsSafe);

      const u = umap[String(r._id)];
      return {
        userId: r._id,
        username: u?.username || u?.name || String(r._id),
        role: u?.role || "Player",
        totalScore: r.totalScore,
        kills: r.kills,
        deaths: r.deaths,
        assists: r.assists,
        entries: r.entries,
        kd,
        kda,
      };
    });

    res.json({ items: data });
  } catch (err) {
    console.error("getPlayersLeaderboard error:", err);
    res.status(500).json({ message: "Failed to load leaderboard" });
  }
};
