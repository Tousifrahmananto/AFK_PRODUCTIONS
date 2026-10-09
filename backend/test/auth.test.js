const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { protect, protectSocket, requireRole } = require("../middlewares/authMiddleware");
const { loginUser } = require("../controllers/authController");

const originalFindById = User.findById;
const originalFindOne = User.findOne;
const originalSecret = process.env.JWT_SECRET;
let user, res;
beforeEach(async () => {
    process.env.JWT_SECRET = "auth-regression-test-secret";
    user = new User({ username: "test", email: "test@example.com", role: "Player",
        password: await bcrypt.hash("test-password", 4) });
    User.findById = () => ({ select: async () => user });
    User.findOne = async () => user;
    res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
});
afterEach(() => {
    User.findById = originalFindById;
    User.findOne = originalFindOne;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
});
function request() {
    const token = jwt.sign({ userId: user._id, role: "Admin" }, process.env.JWT_SECRET);
    return { headers: { authorization: `Bearer ${token}` } };
}
test("protected requests reject missing and invalid tokens", async () => {
    for (const headers of [{}, { authorization: "Bearer invalid" }]) {
        await protect({ headers }, res, () => assert.fail("Unauthorized request continued"));
        assert.equal(res.code, 401);
    }
});
test("authorization uses current role instead of stale token role", async () => {
    const req = request();
    let continued = false;
    await protect(req, res, () => { continued = true; });
    assert.ok(continued);
    assert.equal(req.user.role, "Player");
    requireRole("Admin")(req, res, () => assert.fail("Stale admin role accepted"));
    assert.equal(res.code, 403);
});
test("existing tokens reject either ban flag", async () => {
    const req = request();
    for (const flag of ["banned", "isBanned"]) {
        user.banned = user.isBanned = false;
        user[flag] = true;
        await protect(req, res, () => assert.fail("Banned request continued"));
        assert.equal(res.code, 403);
    }
});
test("existing tokens reject deleted users", async () => {
    const req = request();
    user = null;
    await protect(req, res, () => assert.fail("Deleted user accepted"));
    assert.equal(res.code, 401);
});
test("login never returns the password hash", async () => {
    await loginUser({ body: { email: user.email, password: "test-password" } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.user.username, "test");
    assert.ok(!Object.hasOwn(res.body.user, "password"));
    assert.equal(jwt.verify(res.body.token, process.env.JWT_SECRET).role, "Player");
});
test("login rejects the legacy ban flag", async () => {
    user.banned = true;
    await loginUser({ body: { email: user.email, password: "test-password" } }, res);
    assert.equal(res.code, 403);
});

test("socket identity comes from the token rather than the supplied user ID", async () => {
    const token = request().headers.authorization.slice(7);
    const socket = { handshake: { auth: { token, userId: "another-user" } }, data: {} };
    await protectSocket(socket, err => assert.equal(err, undefined));
    assert.equal(socket.data.userId, String(user._id));
});

test("sockets reject missing, invalid, banned, and deleted identities", async () => {
    const token = request().headers.authorization.slice(7);
    for (const auth of [{}, { token: "invalid" }]) {
        await protectSocket({ handshake: { auth }, data: {} }, err => assert.ok(err instanceof Error));
    }
    user.isBanned = true;
    await protectSocket({ handshake: { auth: { token } }, data: {} }, err => assert.ok(err instanceof Error));
    user = null;
    await protectSocket({ handshake: { auth: { token } }, data: {} }, err => assert.ok(err instanceof Error));
});
