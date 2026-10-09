const jwt = require("jsonwebtoken");
const User = require("../models/User");

function extractToken(req) {
    const h = req.headers?.authorization || "";
    if (h.startsWith("Bearer ")) return h.slice(7).trim();
    if (req.cookies && req.cookies.token) return req.cookies.token;
    return null;
}

async function protect(req, res, next) {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(401).json({ message: "Not authorized – no token" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
        const userId = decoded.userId || decoded.id || decoded._id;

        if (!userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const user = await User.findById(userId).select("role banned isBanned authVersion mustChangePassword");
        if (!user) return res.status(401).json({ message: "User no longer exists" });
        if (user.banned || user.isBanned) {
            return res.status(403).json({ message: "This account has been banned by an administrator." });
        }
        if ((decoded.authVersion || 0) !== (user.authVersion || 0)) return res.status(401).json({ message: 'Session expired. Sign in again.' });
        if (user.mustChangePassword && !['/api/auth/me', '/api/auth/change-password'].includes(req.originalUrl?.split('?')[0])) return res.status(403).json({ message: 'Change your temporary password before continuing', code: 'PASSWORD_CHANGE_REQUIRED' });
        req.user = { userId: String(user._id), role: user.role };
        return next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        const r = req.user?.role;
        if (!r || !roles.includes(r)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return next();
    };
}

function isAdmin(req, res, next) {
    return requireRole("Admin")(req, res, next);
}

async function protectSocket(socket, next) {
    const req = { headers: { authorization: `Bearer ${socket.handshake.auth?.token || ""}` } };
    const res = {
        status() { return this; },
        json({ message }) { next(new Error(message)); },
    };
    await protect(req, res, () => {
        socket.data.userId = req.user.userId;
        next();
    });
}

module.exports = { protect, protectSocket, requireRole, isAdmin };
