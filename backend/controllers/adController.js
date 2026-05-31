const AdCampaign = require("../models/AdCampaign");

const canManage = (user, doc) =>
    user?.role === "Admin" || String(doc.owner) === String(user?.userId);

exports.createAd = async (req, res) => {
    try {
        const ad = await AdCampaign.create({
            owner: req.user.userId,
            category: req.body.category || "Homepage",
            gameFilter: req.body.gameFilter || "",
            tournament: req.body.tournament || null,
            title: req.body.title,
            imageUrl: req.body.imageUrl || "",
            linkUrl: req.body.linkUrl || "",
            startDate: req.body.startDate ? new Date(req.body.startDate) : null,
            endDate: req.body.endDate ? new Date(req.body.endDate) : null,
            status: req.body.status || "Draft",
        });
        res.status(201).json(ad);
    } catch (err) {
        console.error("createAd:", err);
        res.status(500).json({ message: "Failed to create ad" });
    }
};

exports.updateAd = async (req, res) => {
    try {
        const ad = await AdCampaign.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        if (!canManage(req.user, ad)) return res.status(403).json({ message: "Forbidden" });

        Object.assign(ad, req.body);
        await ad.save();
        res.json(ad);
    } catch (err) {
        console.error("updateAd:", err);
        res.status(500).json({ message: "Failed to update ad" });
    }
};

exports.deleteAd = async (req, res) => {
    try {
        const ad = await AdCampaign.findById(req.params.id);
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        if (!canManage(req.user, ad)) return res.status(403).json({ message: "Forbidden" });
        await ad.deleteOne();
        res.json({ message: "Ad deleted" });
    } catch (err) {
        console.error("deleteAd:", err);
        res.status(500).json({ message: "Failed to delete ad" });
    }
};

exports.listMyAds = async (req, res) => {
    try {
        const q = req.user.role === "Admin" ? {} : { owner: req.user.userId };
        const ads = await AdCampaign.find(q).sort({ createdAt: -1 }).lean();
        res.json(ads);
    } catch (err) {
        console.error("listMyAds:", err);
        res.status(500).json({ message: "Failed to fetch ads" });
    }
};

exports.getAdsForPlacement = async (req, res) => {
    try {
        const { category, game, tournament } = req.query;
        const now = new Date();
        const q = {
            status: "Active",
            startDate: { $lte: now },
            endDate: { $gte: now },
        };
        if (category) q.category = category;
        if (game) q.$or = [{ gameFilter: "" }, { gameFilter: new RegExp(`^${game}$`, "i") }];
        if (tournament) q.tournament = tournament;

        const ads = await AdCampaign.find(q).sort({ createdAt: -1 }).lean();
        if (ads.length) {
            await AdCampaign.updateMany({ _id: { $in: ads.map(a => a._id) } }, { $inc: { impressions: 1 } });
        }
        res.json(ads);
    } catch (err) {
        console.error("getAdsForPlacement:", err);
        res.status(500).json({ message: "Failed to fetch ads" });
    }
};

exports.clickAd = async (req, res) => {
    try {
        const ad = await AdCampaign.findByIdAndUpdate(req.params.id, { $inc: { clicks: 1 } }, { new: true });
        if (!ad) return res.status(404).json({ message: "Ad not found" });
        res.json({ ok: true });
    } catch (err) {
        console.error("clickAd:", err);
        res.status(500).json({ message: "Failed to count click" });
    }
};
