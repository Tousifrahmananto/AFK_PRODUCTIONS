const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { server, io } = require('../server');
const User = require('../models/User'), Team = require('../models/Team'), Tournament = require('../models/Tournament');
const Batch = require('../models/RegistrationImport'), Registration = require('../models/ImportRegistration'), Credential = require('../models/ProvisionedCredential');
const Connection = require('../models/GoogleConnection'), OAuthState = require('../models/GoogleOAuthState');
const { encrypt, decrypt } = require('../utils/integrationSecrets');
const { table } = require('../utils/registrationRows');
let replica, base, admin, outsider, tournament, batchId;
const nativeFetch = global.fetch;
const sign = user => jwt.sign({ userId: String(user._id), authVersion: user.authVersion || 0 }, process.env.JWT_SECRET);
async function api(path, user, body, method) {
  const res = await nativeFetch(base + '/api' + path, { method: method || (body ? 'POST' : 'GET'), headers: { ...(user ? { Authorization: 'Bearer ' + (typeof user === 'string' ? user : sign(user)) } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: res.status, data: await res.json(), headers: res.headers };
}
async function preview(csv, mapping, user = admin) {
  const form = new FormData(); form.append('tournamentId', String(tournament._id)); form.append('file', new Blob([csv], { type: 'text/csv' }), 'responses.csv');
  if (mapping) form.append('mapping', JSON.stringify(mapping));
  const res = await nativeFetch(base + '/api/tournament-imports/preview', { method: 'POST', headers: { Authorization: 'Bearer ' + sign(user) }, body: form });
  return { status: res.status, data: await res.json() };
}
before(async () => {
  process.env.JWT_SECRET = 'isolated-import-test'; process.env.INTEGRATION_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); await mongoose.connect(replica.getUri());
  await Promise.all([User, Team, Tournament, Batch, Registration, Credential, Connection, OAuthState].map(model => model.init()));
  [admin, outsider] = await User.create([{ username: 'import-admin', email: 'admin@example.test', password: 'unused', role: 'Admin' }, { username: 'outsider', email: 'outsider@example.test', password: 'unused' }]);
  tournament = await Tournament.create({ title: 'Import cup', game: 'Valorant', teamLimit: 16, startDate: '2050-10-20', endDate: '2050-10-21', registrationDeadline: '2050-10-19' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); base = 'http://127.0.0.1:' + server.address().port;
}, { timeout: 240000 });
after(async () => { global.fetch = nativeFetch; await new Promise(resolve => io.close(resolve)); await mongoose.disconnect(); if (replica) await replica.stop(); });

test('CSV import creates only requested accounts, protects credentials, resumes and activates accounts', async () => {
  const csv = 'Team,Captain,Contact,Manager,Player 2\nAlpha squad,Alice,shared@example.test,Alex,ignored\nBeta squad,Bob,bob@example.test,,ignored\n';
  const mapping = { teamName: 0, captainName: 1, contactEmail: 2, managerName: 3 };
  assert.equal((await preview(csv, mapping, outsider)).status, 403);
  const columns = await preview(csv); assert.equal(columns.status, 200); assert.equal(columns.data.headers.length, 5);
  const p = await preview(csv, mapping); assert.equal(p.status, 200, JSON.stringify(p.data)); batchId = p.data.batch._id;
  assert.equal((await preview(csv, mapping)).data.batch._id, batchId);
  assert.equal((await api(`/tournament-imports/${batchId}`, outsider)).status, 403);
  const path = `/tournament-imports/${batchId}/confirm`, decisions = { 0: { action: 'create' }, 1: { action: 'create' } };
  const outcomes = await Promise.all([api(path, admin, { decisions }), api(path, admin, { decisions })]);
  assert.equal(outcomes.some(r => r.status === 200), true, JSON.stringify(outcomes));
  assert.equal((await api(path, admin, { decisions })).status, 200);
  const t = await Tournament.findById(tournament._id); assert.equal(t.teams.length, 2);
  assert.equal(await Registration.countDocuments(), 2); assert.equal(await User.countDocuments({ mustChangePassword: true }), 3);
  const team = await Team.findOne({ teamName: 'Alpha squad' }); assert.equal(team.members.length, 1); assert.ok(team.manager);
  const manager = await User.findById(team.manager); assert.equal(manager.email, undefined); assert.equal(manager.contactEmail, 'shared@example.test');
  const view = await api(`/tournament-imports/${batchId}`, admin); assert.equal(view.status, 200); assert.equal(JSON.stringify(view.data).includes('secret'), false);
  const download = await nativeFetch(base + `/api/tournament-imports/${batchId}/credentials.csv`, { headers: { Authorization: 'Bearer ' + sign(admin) } });
  assert.equal(download.headers.get('cache-control'), 'no-store'); const exported = table(Buffer.from(await download.text())); assert.equal(exported.length, 4);
  const loginID = 'alpha-squad-captain', password = exported.find(row => row[2] === loginID)[3];
  const stored = await Credential.findOne({ login: loginID }).select('+secret'); assert.equal(stored.secret.includes(password), false); assert.equal(decrypt(stored.secret), password);
  const login = await api('/auth/login', null, { email: loginID, password }); assert.equal(login.status, 200); assert.equal(login.data.user.mustChangePassword, true);
  assert.equal((await api('/auth/me', login.data.token)).status, 200);
  const blocked = await api('/tournaments', login.data.token); assert.equal(blocked.status, 403); assert.equal(blocked.data.code, 'PASSWORD_CHANGE_REQUIRED');
  assert.equal((await api('/auth/change-password', login.data.token, { currentPassword: password, password: 'short' })).status, 400);
  const changed = await api('/auth/change-password', login.data.token, { currentPassword: password, password: 'New-password-Only-2026' }); assert.equal(changed.status, 200, JSON.stringify(changed.data));
  assert.equal(changed.data.user.mustChangePassword, false); assert.equal(await Credential.countDocuments({ login: loginID }), 0);
  assert.equal((await api('/auth/me', login.data.token)).status, 401); assert.equal((await api('/tournaments', changed.data.token)).status, 200);
  const regenerated = await api(`/tournaments/${tournament._id}/generate-bracket`, admin, {}); assert.equal(regenerated.status, 200); assert.equal(regenerated.data.bracketData.graphVersion, 1);
  const reshuffled = await api(`/tournaments/${tournament._id}/generate-bracket`, admin, {}); assert.equal(reshuffled.status, 200);
  assert.notEqual(regenerated.data.bracketData.generationId, reshuffled.data.bracketData.generationId);
  assert.equal((await preview(csv, mapping)).status, 409);
  assert.equal((await api(`/tournaments/${tournament._id}/reset-bracket`, admin, {})).status, 200);
});

test('existing teams are explicitly linked without account changes; malformed rows cannot provision', async () => {
  const count = await User.countDocuments();
  const p = await preview('Team,Captain,Email\nAlpha squad,Alice,new@example.test\nBad,Bad,invalid\n', { teamName: 0, captainName: 1, captainEmail: 2 });
  assert.equal(p.status, 200); assert.equal(p.data.batch.rows[0].status, 'conflict'); assert.equal(p.data.batch.rows[1].status, 'invalid');
  const id = p.data.batch._id;
  assert.equal((await api(`/tournament-imports/${id}/confirm`, admin, { decisions: { 0: { action: 'create' }, 1: { action: 'skip' } } })).status, 400);
  const linked = await api(`/tournament-imports/${id}/confirm`, admin, { decisions: { 0: { action: 'link', teamId: p.data.batch.rows[0].candidates[0].id }, 1: { action: 'skip' } } });
  assert.equal(linked.status, 200); assert.equal(await User.countDocuments(), count); assert.equal((await Tournament.findById(tournament._id)).teams.length, 2);
  assert.equal(await Credential.countDocuments({ batch: id }), 0);
});

test('private Google selection, OAuth state and Gmail deliveries use scoped encrypted connections', async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client'; process.env.GOOGLE_CLIENT_SECRET = 'test-secret'; process.env.GOOGLE_REDIRECT_URI = base + '/api/google/callback';
  const sent = [];
  global.fetch = async (url, options) => {
    if (String(url).startsWith('https://oauth2.googleapis.com/token')) return Response.json({ access_token: 'google-test-token', refresh_token: 'refresh-test', expires_in: 3600, scope: 'openid email https://www.googleapis.com/auth/gmail.send' });
    if (String(url).startsWith('https://openidconnect.googleapis.com')) return Response.json({ email: 'sender@example.test', email_verified: true });
    if (String(url).includes('sheets.googleapis.com') && String(url).includes('/values/')) return Response.json({ values: [['Team', 'Captain', 'Email'], ['Gamma squad', 'Gina', 'gina@example.test']] });
    if (String(url).includes('sheets.googleapis.com')) return Response.json({ properties: { title: 'Private forms' }, sheets: [{ properties: { title: 'Form Responses 1' } }] });
    if (String(url).includes('gmail.googleapis.com')) { sent.push(JSON.parse(options.body)); return Response.json({ id: 'message-' + sent.length }); }
    return nativeFetch(url, options);
  };
  const connect = await api('/google/gmail/connect', admin, {}); assert.equal(connect.status, 200);
  const url = new URL(connect.data.url); assert.equal(url.searchParams.get('scope').includes('gmail.send'), true); assert.equal(url.searchParams.get('scope').includes('gmail.readonly'), false);
  const callback = base + '/api/google/callback?state=' + url.searchParams.get('state') + '&code=test-code';
  assert.equal((await nativeFetch(callback, { redirect: 'manual' })).headers.get('location').includes('google=connected'), true);
  assert.equal((await nativeFetch(callback, { redirect: 'manual' })).headers.get('location').includes('google=failed'), true);
  assert.equal(await OAuthState.countDocuments(), 0);
  await Connection.create({ owner: admin._id, purpose: 'sheets', email: 'sender@example.test', secret: encrypt({ access_token: 'file-only', expiresAt: Date.now() + 3600000 }) });
  const result = await api('/tournament-imports/preview', admin, { tournamentId: String(tournament._id), source: { type: 'google', spreadsheetId: 'private-spreadsheet-1234', tab: 'Form Responses 1' }, mapping: { teamName: 0, captainName: 1, captainEmail: 2 } });
  assert.equal(result.status, 200, JSON.stringify(result));
  const confirmed = await api(`/tournament-imports/${result.data.batch._id}/confirm`, admin, { decisions: { 0: { action: 'create' } } }); assert.equal(confirmed.status, 200);
  // The request starts the durable outbox; await its observable terminal state.
  for (let i = 0; i < 100; i++) { if (!(await Credential.exists({ status: { $in: ['pending', 'sending'] } }))) break; await new Promise(resolve => setTimeout(resolve, 20)); }
  assert.ok(sent.length >= 1); assert.equal(await Credential.countDocuments({ status: 'sent' }), 3);
  assert.equal(JSON.stringify((await api('/google', admin)).data).includes('refresh-test'), false);
  global.fetch = nativeFetch;
});

test('double elimination and round robin expose resolved matches and protect completed brackets', async () => {
  for (const format of ['Double Elimination', 'Round Robin']) {
    await Tournament.updateOne({ _id: tournament._id }, { $set: { bracket: format, bracketData: null } });
    const generated = await api(`/tournaments/${tournament._id}/generate-bracket`, admin, {});
    assert.equal(generated.status, 200);
    let bd = generated.data.bracketData;
    const pending = bd.rounds.flat().find(m => m.status === 'pending');
    if (pending) assert.equal((await api(`/tournaments/${tournament._id}/matches/${pending.id}/veto`, admin)).status, 409);
    for (let r = 0; r < bd.rounds.length; r++) for (let m = 0; m < bd.rounds[r].length; m++) {
      const match = bd.rounds[r][m];
      if (match.status !== 'ready') continue;
      assert.equal((await api(`/tournaments/${tournament._id}/matches/${match.id}/veto`, admin)).status, 200, `Ready match blocked: ${format} round ${r}`);
      const updated = await api(`/tournaments/${tournament._id}/bracket/match-result`, admin, { roundIndex: r, matchIndex: m, winnerSide: 'p1' });
      assert.equal(updated.status, 200, JSON.stringify(updated.data)); bd = updated.data.bracketData;
    }
    assert.equal((await api(`/tournaments/${tournament._id}/generate-bracket`, admin, {})).status, 409);
    assert.equal((await api(`/tournaments/${tournament._id}/reset-bracket`, admin, {})).status, 409);
    assert.equal(bd.rounds.flat().some(m => ['pending', 'ready'].includes(m.status)), false);
  }
});

test('a batch resumes after 25 rows without duplicating accounts; private exports exclude expired credentials', async () => {
  await Connection.deleteMany({});
  const previousTournament = tournament;
  tournament = await Tournament.create({ title: 'Chunked import cup', game: 'CS2', teamLimit: 30, startDate: '2050-10-20', endDate: '2050-10-21', registrationDeadline: '2050-10-19' });
  const csv = 'Team,Captain,Email\n' + Array.from({ length: 27 }, (_, i) => `Chunk team ${i + 1},Captain ${i + 1},chunk${i + 1}@example.test`).join('\n');
  const p = await preview(csv, { teamName: 0, captainName: 1, captainEmail: 2 }); assert.equal(p.status, 200);
  const id = p.data.batch._id, path = `/tournament-imports/${id}/confirm`;
  const decisions = Object.fromEntries(p.data.batch.rows.map(row => [row.index, { action: 'create' }]));
  const first = await api(path, admin, { decisions }); assert.equal(first.status, 200);
  assert.equal(first.data.batch.rows.filter(row => row.status === 'imported').length, 25);
  const second = await api(path, admin, { decisions }); assert.equal(second.status, 200); assert.equal(second.data.credentials.length, 27);
  assert.equal((await api(path, admin, { decisions })).data.credentials.length, 27);
  const anotherAdmin = await User.create({ username: 'another-admin', email: 'second-admin@example.test', password: 'unused', role: 'Admin' });
  assert.equal((await api(`/tournament-imports/${id}`, anotherAdmin)).status, 404);
  await Credential.updateMany({ batch: id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const download = await nativeFetch(base + `/api/tournament-imports/${id}/credentials.csv`, { headers: { Authorization: 'Bearer ' + sign(admin) } });
  assert.equal(table(Buffer.from(await download.text())).length, 1);
  tournament = previousTournament;
});

test('legacy nine-team brackets cannot award a future final while feeders are unresolved', async () => {
  const participants = Array.from({ length: 9 }, (_, i) => ({ id: String(new mongoose.Types.ObjectId()), label: `Legacy ${i}`, kind: 'team' }));
  const match = (p1 = null, p2 = null) => ({ id: crypto.randomUUID(), p1, p2, winner: null });
  const legacy = await Tournament.create({ title: 'Legacy guard cup', game: 'Valorant', teamLimit: 9, startDate: '2050-10-20', endDate: '2050-10-21', registrationDeadline: '2050-10-19', bracketData: { rounds: [
    [match(participants[0], participants[1]), match(participants[2], participants[3]), match(participants[4], participants[5]), match(participants[6], participants[7]), match(participants[8]), match(), match(), match()],
    [match(), match(), match(participants[8]), match()], [match(), match(participants[8])], [match(participants[0], participants[8])],
  ] } });
  const response = await api(`/tournaments/${legacy._id}/bracket/match-result`, admin, { roundIndex: 3, matchIndex: 0, winnerSide: 'p2' });
  assert.equal(response.status, 409); assert.match(response.data.message, /feeder/);
  assert.equal((await Tournament.findById(legacy._id)).bracketData.rounds[3][0].winner, null);
});
