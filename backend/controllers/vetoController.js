const mongoose = require('mongoose');
const { randomUUID } = require('node:crypto');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const VetoSession = require('../models/VetoSession');
const { fail, permissions, validateSettings, createState, expectedAction, transition, catalogues, mapId } = require('../utils/vetoRules');
const presence = new Map();

function locate(t, matchId) {
  for (const [r, round] of (t.bracketData?.rounds || []).entries()) {
    const m = round.findIndex(match => match.id === matchId);
    if (m !== -1) return { match: round[m], r, m };
  }
  fail('Match not found', 404);
}
async function context(tournamentId, matchId, user, dbSession) {
  if (!mongoose.isValidObjectId(tournamentId)) fail('Tournament not found', 404);
  const t = await Tournament.findById(tournamentId).session(dbSession || null);
  if (!t) fail('Tournament not found', 404);
  const found = locate(t, matchId);
  const { match } = found;
  function resolved(r, m) {
    const feeder = t.bracketData.rounds[r]?.[m];
    if (!feeder) return true;
    if (r > 0 && (!resolved(r - 1, m * 2) || !resolved(r - 1, m * 2 + 1))) return false;
    return !!feeder.winner || !(feeder.p1 && feeder.p2);
  }
  if (found.r > 0 && (!resolved(found.r - 1, found.m * 2) || !resolved(found.r - 1, found.m * 2 + 1))) fail('Waiting for feeder match results', 409);
  if (match.p1?.kind !== 'team' || match.p2?.kind !== 'team' || match.p1.id === match.p2.id) fail('Veto requires two resolved opposing teams', 409);
  const ids = [String(match.p1.id), String(match.p2.id)];
  const rows = await Team.find({ _id: { $in: ids }, status: { $ne: 'disbanded' } }).session(dbSession || null).lean();
  if (rows.length !== 2) fail('One of the match teams is unavailable', 409);
  const teams = ids.map(id => rows.find(t => String(t._id) === id));
  const access = permissions(user, teams);
  if (!access.canView) fail('Only this match’s teams and admins can enter', 403);
  return { t, ...found, teams, ids, access };
}
const key = (tournament, match) => `${tournament}:${match}`;
function touchPresence(tournament, match, userId) {
  for (const [roomKey, people] of presence) {
    for (const [person, at] of people) if (Date.now() - at > 15000) people.delete(person);
    if (!people.size) presence.delete(roomKey);
  }
  const room = key(tournament, match);
  if (!presence.has(room)) presence.set(room, new Map());
  presence.get(room).set(String(userId), Date.now());
}
function removePresence(tournament, match, userId) {
  presence.get(key(tournament, match))?.delete(String(userId));
}
async function connectedTeams(ctx) {
  const room = presence.get(key(ctx.t._id, ctx.match.id));
  if (!room) return [];
  for (const [id, ts] of room) if (Date.now() - ts > 15000) room.delete(id);
  if (!room.size) { presence.delete(key(ctx.t._id, ctx.match.id)); return []; }
  const users = await User.find({ _id: { $in: [...room.keys()] }, banned: { $ne: true }, isBanned: { $ne: true } }).select('role').lean();
  return ctx.ids.filter(id => users.some(u => permissions({ userId: String(u._id), role: u.role }, ctx.teams).actorTeams.includes(id)));
}
function response(ctx, doc, online) {
  const settings = validateSettings(ctx.t.vetoSettings, ctx.t.game);
  return { tournamentId: String(ctx.t._id), title: ctx.t.title, matchId: ctx.match.id,
    teams: ctx.teams.map(t => ({ id: String(t._id), name: t.teamName })),
    permissions: ctx.access, settings, bestOf: ctx.match.bestOf || settings.bestOf,
    session: doc ? { id: String(doc._id), revision: doc.revision, state: doc.state, history: doc.history, expected: expectedAction(doc.state) } : null,
    online, finished: !!ctx.match.winner };
}
async function transaction(work) {
  let output;
  await mongoose.connection.transaction(async dbSession => { output = await work(dbSession); });
  return output;
}
async function notify(req) {
  const io = req.app.get('io');
  if (io) await require('../utils/vetoSocket').notify(io, req.params.id, req.params.matchId);
}
function endpoint(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (error) {
    const conflict = error.code === 11000 || error.name === 'VersionError';
      const status = error.status || (conflict ? 409 : 500);
      if (status === 500) console.error('Veto request failed:', error.message);
      res.status(status).json({ message: status === 500 ? 'Unable to save veto. Please retry.' : conflict ? 'State changed. Refresh and retry.' : error.message });
    }
  };
}
const get = endpoint(async (req, res) => {
  const ctx = await context(req.params.id, req.params.matchId, req.user);
  const doc = await VetoSession.findOne({ tournament: ctx.t._id, matchId: ctx.match.id, current: true }).lean();
  res.json(response(ctx, doc, await connectedTeams(ctx)));
});
const heartbeat = endpoint(async (req, res) => {
  const ctx = await context(req.params.id, req.params.matchId, req.user);
  touchPresence(ctx.t._id, ctx.match.id, req.user.userId);
  const online = await connectedTeams(ctx);
  const doc = await VetoSession.findOne({ tournament: ctx.t._id, matchId: ctx.match.id, current: true }).lean();
  if (doc?.state.phase === 'waiting' && ctx.access.actorTeams.length === 1 && !ctx.access.isAdmin && ctx.ids.every(id => online.includes(id) && doc.state.ready.includes(id))) {
    req.body = { type: 'ready', requestId: randomUUID(), expectedRevision: doc.revision };
    return act(req, res);
  }
  res.json({ online });
});
const act = endpoint(async (req, res) => {
  const { requestId, expectedRevision, type } = req.body;
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(requestId) || !Number.isInteger(expectedRevision) || expectedRevision < 0) fail('Request ID and expected revision are required');
  let result = await transaction(async dbSession => {
    const ctx = await context(req.params.id, req.params.matchId, req.user, dbSession);
    if (ctx.match.winner) fail('Match already has a result', 409);
    const settings = validateSettings(ctx.t.vetoSettings, ctx.t.game);
    if (!settings.enabled) fail('Veto is not enabled for this tournament', 409);
    let doc = await VetoSession.findOne({ tournament: ctx.t._id, matchId: ctx.match.id, current: true }).session(dbSession);
    if (doc?.history.some(h => h.requestId === requestId)) return response(ctx, doc, await connectedTeams(ctx));
    if (!doc) {
      if (type !== 'ready' || expectedRevision !== 0) fail('Confirm readiness first', 409);
      doc = new VetoSession({ tournament: ctx.t._id, matchId: ctx.match.id, state: createState({ ...settings, bestOf: ctx.match.bestOf || settings.bestOf }, ctx.ids) });
    }
    if (doc.revision !== expectedRevision) fail('State changed. Refresh and retry.', 409);
    if (doc.state.teams.some((id, i) => id !== ctx.ids[i])) fail('Match opponents changed', 409);
    let teamId;
    const reason = String(req.body.reason || '').trim();
    if (ctx.access.isAdmin) {
      if (reason.length < 3 || reason.length > 500) fail('Admin intervention requires a reason (3–500 characters)');
      teamId = req.body.teamId;
    } else {
      if (ctx.access.actorTeams.length !== 1) fail('Only the captain or assigned manager can act', 403);
      teamId = ctx.access.actorTeams[0];
    }
    const online = await connectedTeams(ctx);
    // One tournament version fences veto commits against bracket regeneration and result edits.
    const fence = await Tournament.updateOne({ _id: ctx.t._id, __v: ctx.t.__v }, { $inc: { __v: 1 } }, { session: dbSession });
    if (fence.matchedCount !== 1) fail('Bracket changed. Refresh and retry.', 409);
    doc.state = transition(doc.state, req.body, teamId, online);
    doc.revision++;
    doc.history.push({ requestId, actor: req.user.userId, teamId, type, mapId: req.body.mapId,
      choice: req.body.choice, side: req.body.side, reason: ctx.access.isAdmin ? reason : undefined,
      at: new Date().toISOString(), revision: doc.revision });
    await doc.save({ session: dbSession });
    return response(ctx, doc, online);
  });
  res.json(result);
  notify(req).catch(error => console.error('Veto notification failed:', error.message));
});
const reset = endpoint(async (req, res) => {
  if (req.user.role !== 'Admin') fail('Admins only', 403);
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 3 || reason.length > 500) fail('Provide a cancellation reason (3–500 characters)');
  await transaction(async dbSession => {
    const ctx = await context(req.params.id, req.params.matchId, req.user, dbSession);
    if (ctx.match.winner) fail('Cannot reset a match with a recorded result', 409);
    const doc = await VetoSession.findOne({ tournament: ctx.t._id, matchId: ctx.match.id, current: true }).session(dbSession);
    if (!doc) fail('No session to cancel', 409);
    if (doc.revision !== req.body.expectedRevision) fail('State changed. Refresh and retry.', 409);
    await Tournament.updateOne({ _id: ctx.t._id }, { $inc: { __v: 1 } }, { session: dbSession });
    doc.current = false; doc.revision++; doc.state = { ...doc.state, phase: 'cancelled' };
    doc.history.push({ type: 'cancel', actor: req.user.userId, reason, at: new Date().toISOString(), revision: doc.revision });
    await doc.save({ session: dbSession });
  });
  res.json({ message: 'Session archived. Both teams must confirm readiness again.' });
  notify(req).catch(() => {});
});
const settings = endpoint(async (req, res) => {
  if (req.user.role !== 'Admin') fail('Admins only', 403);
  if (![1, 3, 5].includes(req.body.bestOf)) fail('Best of must be 1, 3, or 5');
  await transaction(async dbSession => {
    const ctx = await context(req.params.id, req.params.matchId, req.user, dbSession);
    if (ctx.match.winner || await VetoSession.exists({ tournament: ctx.t._id, matchId: ctx.match.id, current: true }).session(dbSession)) fail('Cancel the veto before changing its format', 409);
    ctx.match.bestOf = req.body.bestOf; ctx.t.markModified('bracketData');
    await ctx.t.save({ session: dbSession });
  });
  res.json({ bestOf: req.body.bestOf });
});
const maps = (_req, res) => res.json(Object.fromEntries(Object.entries(catalogues).map(([game, c]) => [game,
  { maps: c.maps.map(name => ({ id: mapId(name), name })), preset: c.preset.map(mapId), sides: c.sides, verifiedAt: '2026-10-09', source: c.source }])));

async function ensureMatchIds(t) {
  let changed = false;
  for (const round of t.bracketData?.rounds || []) for (const match of round) if (!match.id) { match.id = randomUUID(); changed = true; }
  if (changed) { t.markModified('bracketData'); await t.save(); }
}
module.exports = { get, heartbeat, act, reset, settings, maps, context, touchPresence, removePresence, connectedTeams, ensureMatchIds, locate };
