const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function normalizeRole(raw) {
    if (!raw) return "";
    const s = String(raw).trim().toLowerCase();
    if (s === "player") return "Player";
    if (s === "sponsor") return "Sponsor";
    if (s === "partner") return "Partner";
    return "";
}

const PUBLIC_ROLES = new Set(["Player", "Sponsor", "Partner"]);

const registerUser = async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim();
        const password = String(req.body.password || "");
        const roleRaw = req.body.role;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "username, email, and password are required" });
        }

        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashed = await bcrypt.hash(password, 10);

        const normalized = normalizeRole(roleRaw);
        const userRole = PUBLIC_ROLES.has(normalized) ? normalized : "Player";

        const user = await User.create({ username, email, password: hashed, role: userRole });

        return res
            .status(201)
            .json({ message: "User registered successfully", user: { id: user._id, role: user.role } });
    } catch (err) {
        console.error("register error:", err);
        return res.status(500).json({ message: "Registration failed" });
    }
};

const loginUser = async (req, res) => {
    try {
        const identifier = String(req.body.identifier || req.body.email || "").trim();
        const password = String(req.body.password || "");
        if (!identifier || !password || identifier.length > 254 || password.length > 1024) return res.status(400).json({ message: 'Login ID and password are required' });
        const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isBanned || user.banned) {
            return res.status(403).json({ message: "This account has been banned by an administrator." });
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { userId: user._id, role: user.role, authVersion: user.authVersion || 0 },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        const publicUser = user.toObject();
        delete publicUser.password;
        return res.json({ token, user: publicUser });
    } catch (err) {
        console.error("login error:", err);
        return res.status(500).json({ message: "Login failed" });
    }
};

const changePassword = async (req, res) => {
    try {
        const password = String(req.body.password || '');
        if (password.length < 12 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Use at least 12 characters and at most 72 UTF-8 bytes' });
        const user = await User.findById(req.user.userId);
        if (!await bcrypt.compare(String(req.body.currentPassword || ''), user.password)) return res.status(401).json({ message: 'Current password is incorrect' });
        if (await bcrypt.compare(password, user.password)) return res.status(400).json({ message: 'Choose a different password' });
        const mongoose = require('mongoose');
        await mongoose.connection.transaction(async session => {
            const updated = await User.findOneAndUpdate({ _id: user._id, password: user.password }, { $set: { password: await bcrypt.hash(password, 10), mustChangePassword: false }, $inc: { authVersion: 1 } }, { new: true, session });
            if (!updated) throw Object.assign(new Error('Password already changed. Sign in again.'), { status: 409 });
            await require('../models/ProvisionedCredential').deleteMany({ user: user._id }).session(session);
            user.password = updated.password; user.mustChangePassword = false; user.authVersion = updated.authVersion;
        });
        const token = jwt.sign({ userId: user._id, role: user.role, authVersion: user.authVersion }, process.env.JWT_SECRET, { expiresIn: '7d' });
        const safe = user.toObject(); delete safe.password;
        res.json({ token, user: safe });
    } catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : 'Unable to change password' }); }
};
module.exports = { registerUser, loginUser, changePassword };
