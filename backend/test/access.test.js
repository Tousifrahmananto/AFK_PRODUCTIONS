const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { server, io } = require("../server");
const User = require("../models/User");
const Media = require("../models/Media");
const { listMedia } = require("../controllers/mediaController");
const originalFind = User.findById;
let base;
before(async () => {
    process.env.JWT_SECRET = "access-boundary-test-secret";
    User.findById = () => ({ select: async () => ({ _id: "507f1f77bcf86cd799439011", username: "player", role: "Player" }) });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    base = "http://127.0.0.1:" + server.address().port;
});
after(async () => { User.findById = originalFind; await new Promise(resolve => io.close(resolve)); });

test("every data namespace and uploaded file rejects guests before reaching storage", async () => {
    for (const path of ["/api/users/507f1f77bcf86cd799439011", "/api/users/me/profile", "/api/tournaments", "/api/tournaments/any/bracket", "/api/tournaments/any/matches/0/0/media", "/api/teams/players", "/api/leaderboard/players", "/api/media", "/api/media/videos", "/api/ads/placement", "/api/notifications", "/uploads/images/example.png", "/uploads/videos/example.mp4", "/api/auth/me"]) {
        for (const authorization of [undefined, "Bearer invalid", "Bearer " + jwt.sign({ userId: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET, { expiresIn: -1 })]) {
            const res = await fetch(base + path, { headers: authorization ? { authorization } : {} });
            assert.equal(res.status, 401, path);
            assert.equal(res.headers.get("cache-control"), "no-store");
        }
    }
});

test("health and registration entry remain public", async () => {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    assert.equal((await fetch(base + "/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 400);
});

test("verified players receive current identity and cannot enter admin APIs", async () => {
    const token = jwt.sign({ userId: "507f1f77bcf86cd799439011", role: "Admin" }, process.env.JWT_SECRET);
    const headers = { authorization: "Bearer " + token };
    const res = await fetch(base + "/api/auth/me", { headers });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.role, "Player");
    assert.equal((await fetch(base + "/api/users/moderation", { headers })).status, 403);
    assert.equal((await fetch(base + "/uploads/missing.png", { headers })).status, 404);
});

test("an empty media query never enumerates files or bypasses visibility", async () => {
    const original = Media.find;
    let filter;
    const query = { populate() { return this; }, sort() { return this; }, lean: async () => [] };
    Media.find = f => { filter = f; return query; };
    try {
        let body;
        await listMedia({ query: { visibility: "Private" } }, { json(data) { body = data; } });
        assert.deepEqual(body, []);
        assert.equal(filter.visibility, "Public");
    } finally { Media.find = original; }
});

test("other members cannot retrieve profile contact or moderation fields", async () => {
    const { getUserPublic } = require("../controllers/userController");
    const currentFind = User.findById;
    let fields;
    User.findById = () => ({ select: async selected => { fields = selected; return {}; } });
    try {
        for (const [role, requester, allowed] of [["Player", "other-id", false], ["Player", "profile-id", true], ["Admin", "other-id", true]]) {
            await getUserPublic({ params: { id: "profile-id" }, user: { userId: requester, role } }, { json() {} });
            assert.equal(fields.split(" ").includes("email"), allowed);
            assert.equal(fields.split(" ").includes("banned"), allowed);
            assert.equal(fields.split(" ").includes("password"), false);
        }
    } finally { User.findById = currentFind; }
});
