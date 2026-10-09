const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { io: clientSocket } = require('socket.io-client');
const { server, io } = require('../server');
const User = require('../models/User');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const VetoSession = require('../models/VetoSession');
const { catalogues, mapId } = require('../utils/vetoRules');
let replica, base, tournament, matchId, users, teams;
const sockets = [];
const token = user => jwt.sign({ userId: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' });
async function api(path, user, body, method) {
  const res = await fetch(base + '/api' + path, { method: method || (body ? 'POST' : 'GET'), headers: { ...(user ? { Authorization: 'Bearer ' + token(user) } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, data: await res.json() };
}
function room(suffix = '') { return `/tournaments/${tournament._id}/matches/${matchId}/veto${suffix}`; }
async function current() { const res = await api(room(), users[0]); assert.equal(res.status, 200, JSON.stringify(res.data)); return res.data; }
async function action(user, fields, state) {
  return api(room('/actions'), user, { requestId: randomUUID(), expectedRevision: state?.session?.revision || 0, ...fields });
}
before(async () => {
  process.env.JWT_SECRET = 'isolated-veto-integration-secret';
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await Promise.all([User.init(), Team.init(), Tournament.init(), VetoSession.init()]);
  users = await User.create(['captain-a', 'captain-b', 'manager-a', 'outsider', 'roster-a', 'admin'].map((name, i) => ({ username: name, email: name + '@example.test', password: 'not-a-login-password', role: i === 2 ? 'TeamManager' : i === 5 ? 'Admin' : 'Player' })));
  teams = await Team.create([{ teamName: 'Alpha', game: 'Valorant', captain: users[0]._id, manager: users[2]._id, members: [users[0]._id, users[4]._id] }, { teamName: 'Beta', game: 'Valorant', captain: users[1]._id, members: [users[1]._id] }]);
  matchId = randomUUID();
  tournament = await Tournament.create({ title: 'Isolated Veto Cup', game: 'Valorant', startDate: '2050-10-20', endDate: '2050-10-21', registrationDeadline: '2050-10-19', registrationOpen: false, teamLimit: 2, teams: teams.map(t => t._id), vetoSettings: { enabled: true, game: 'valorant', bestOf: 3, pool: catalogues.valorant.preset.map(mapId) }, bracketData: { rounds: [[{ id: matchId, p1: { kind: 'team', id: String(teams[0]._id), label: 'Alpha' }, p2: { kind: 'team', id: String(teams[1]._id), label: 'Beta' }, winner: null }]] } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
}, { timeout: 240000 });
after(async () => {
  sockets.forEach(socket => socket.disconnect());
  await new Promise(resolve => io.close(resolve));
  await mongoose.disconnect();
  if (replica) await replica.stop();
});

test('private session boundaries, toss, concurrency, live delivery, format lock, complete and archive', async () => {
  assert.equal((await api(room())).status, 401);
  assert.equal((await api(room(), users[3])).status, 403);
  assert.equal((await api(room(), users[4])).status, 200);
  assert.equal((await action(users[4], { type: 'ready' })).status, 403);
  const expired = clientSocket(base, { auth: { token: jwt.sign({ userId: String(users[0]._id) }, process.env.JWT_SECRET, { expiresIn: -1 }) }, reconnection: false }); sockets.push(expired);
  await new Promise((resolve, reject) => { expired.on('connect_error', resolve); expired.on('connect', () => reject(new Error('Expired socket connected'))); });
  async function subscribe(user) {
    const socket = clientSocket(base, { auth: { token: token(user) }, reconnection: false }); sockets.push(socket);
    await new Promise((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
    return { socket, ack: await socket.timeout(3000).emitWithAck('veto:subscribe', { tournamentId: String(tournament._id), matchId }) };
  }
  assert.equal((await subscribe(users[3])).ack.ok, false);
  const captainSocket = await subscribe(users[0]);
  assert.equal(captainSocket.ack.ok, true);
  await api(room('/heartbeat'), users[0], {}); await api(room('/heartbeat'), users[1], {});
  const initial = await current();
  assert.equal(initial.session, null);
  const notified = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('No live notification')), 4000); captainSocket.socket.once('veto:updated', payload => { clearTimeout(timer); resolve(payload); }); });
  const concurrent = await Promise.all([action(users[0], { type: 'ready' }, initial), action(users[2], { type: 'ready' }, initial)]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
  assert.equal((await notified).matchId, matchId);
  let state = await current();
  assert.equal(state.session.revision, 1);
  assert.equal(state.session.state.phase, 'waiting');
  const repeatedId = randomUUID();
  const secondReady = { type: 'ready', requestId: repeatedId, expectedRevision: 1 };
  assert.equal((await api(room('/actions'), users[1], secondReady)).status, 200);
  assert.equal((await api(room('/actions'), users[1], secondReady)).status, 200);
  state = await current();
  assert.equal(state.session.revision, 2);
  assert.equal(state.session.state.phase, 'decision');
  assert.equal((await api(`/tournaments/${tournament._id}/matches/${matchId}/settings`, users[5], { bestOf: 5 }, 'PATCH')).status, 409);
  assert.equal((await api(`/tournaments/${tournament._id}/generate-bracket`, users[5], {})).status, 409);
  assert.equal((await api(`/tournaments/${tournament._id}/bracket/match-result`, users[5], { roundIndex: 0, matchIndex: 0, winnerSide: 'p1' })).status, 409);
  const winner = users[state.session.expected.teamId === String(teams[0]._id) ? 0 : 1];
  assert.equal((await action(winner, { type: 'decision', choice: 'side-first' }, state)).status, 200);
  state = await current();
  assert.equal(state.session.state.t2, state.session.state.tossWinner);
  assert.equal((await action(users[5], { type: 'ban', teamId: state.session.expected.teamId, mapId: state.session.state.available[0] }, state)).status, 400);
  while (state.session.state.phase === 'veto') {
    const expected = state.session.expected;
    const actor = expected.teamId === String(teams[0]._id) ? users[2] : users[1];
    assert.equal((await action(actor, { type: expected.type, mapId: state.session.state.available[0] }, state)).status, 200);
    state = await current();
  }
  while (state.session.state.phase === 'sides') {
    const expected = state.session.expected;
    const actor = users[expected.teamId === String(teams[0]._id) ? 0 : 1];
    assert.equal((await action(actor, { type: 'side', mapId: expected.mapId, side: 'Attack' }, state)).status, 200);
    state = await current();
  }
  assert.equal(state.session.state.phase, 'completed');
  assert.equal(state.session.state.maps.length, 3);
  assert.equal((await api(room('/reset'), users[0], { reason: 'No', expectedRevision: state.session.revision })).status, 403);
  assert.equal((await api(room('/reset'), users[5], { reason: 'Practice restart', expectedRevision: state.session.revision })).status, 200);
  assert.equal((await current()).session, null);
  const archived = await VetoSession.findOne({ tournament: tournament._id, current: false }).lean();
  assert.equal(archived.state.phase, 'cancelled');
  assert.equal(archived.history.at(-1).reason, 'Practice restart');
  assert.equal((await api(`/tournaments/${tournament._id}/matches/${matchId}/settings`, users[5], { bestOf: 5 }, 'PATCH')).status, 200);
  assert.equal((await current()).bestOf, 5);
  await User.updateOne({ _id: users[0]._id }, { $set: { banned: true } });
  assert.equal((await api(room(), users[0])).status, 403);
  assert.equal((await captainSocket.socket.timeout(3000).emitWithAck('veto:subscribe', { tournamentId: String(tournament._id), matchId })).ok, false);
}, { timeout: 60000 });

test('explicit manager assignment is admin-only, scoped, and immediately revocable', async () => {
  const path = `/teams/${teams[0]._id}/manager`;
  assert.equal((await api(path, users[1], { username: users[2].username }, 'PATCH')).status, 403);
  assert.equal((await api(path, users[5], { username: users[4].username }, 'PATCH')).status, 400);
  assert.equal((await api(path, users[5], { username: '' }, 'PATCH')).status, 200);
  assert.equal((await api(room(), users[2])).status, 403);
  assert.equal((await api(path, users[5], { username: users[2].username }, 'PATCH')).status, 200);
  const assigned = await api(room(), users[2]);
  assert.equal(assigned.status, 200);
  assert.deepEqual(assigned.data.permissions.actorTeams, [String(teams[0]._id)]);
  assert.equal((await api('/teams/my', users[2])).status, 200);
  assert.equal((await api(`/teams/${teams[1]._id}/manager`, users[5], { username: users[2].username }, 'PATCH')).status, 409);
  await User.updateOne({ _id: users[2]._id }, { $set: { role: 'Player' } });
  assert.equal((await api(room(), users[2])).status, 403);
});
