const mongoose = require('mongoose');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Batch = require('../models/RegistrationImport');
const Registration = require('../models/ImportRegistration');
const Credential = require('../models/ProvisionedCredential');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const User = require('../models/User');
const { table, rows, hash, slug, csvCell } = require('../utils/registrationRows');
const { encrypt, decrypt, checkKey } = require('../utils/integrationSecrets');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const endpoint = fn => async (req, res) => { try { await fn(req, res); } catch (error) { res.status(error.status || (error.code === 11000 || error.name === 'VersionError' ? 409 : 500)).json({ message: error.status ? error.message : 'Import could not finish. Refresh the batch and retry; completed rows are preserved.' }); } };
async function tournament(id, session) {
  if (!mongoose.isValidObjectId(id)) fail('Choose a tournament');
  const t = await Tournament.findById(id).session(session || null);
  if (!t) fail('Tournament not found', 404);
  if (t.playerLimit > 0 || !t.teamLimit) fail('Choose a team tournament');
  if (t.bracketData) fail('Import registrations before generating the bracket', 409);
  if (t.status !== 'Upcoming') fail('Only upcoming tournaments accept imports', 409);
  return t;
}
async function batch(req, session) {
  if (!mongoose.isValidObjectId(req.params.id)) fail('Batch not found', 404);
  const b = await Batch.findOne({ _id: req.params.id, owner: req.user.userId }).session(session || null);
  if (!b) fail('Batch not found', 404);
  return b;
}
async function view(b) {
  const credentials = await Credential.find({ batch: b._id }).select('login role recipient status error expiresAt teamName').lean();
  return { batch: b, credentials };
}
exports.preview = endpoint(async (req, res) => {
  function json(value) { try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { fail('Invalid import options'); } }
  const source = json(req.body.source), mapping = json(req.body.mapping);
  const t = await tournament(req.body.tournamentId);
  let values;
  if (source?.type === 'google') values = (await require('./googleController').readSheet(req.user.userId, source.spreadsheetId, source.tab)).values;
  else if (req.file) values = table(req.file.buffer);
  else fail('Choose a CSV or private Google spreadsheet');
  if (!values?.length || values.length > 1001 || values.some(row => row.length > 200)) fail('Use a header, up to 1000 rows and 200 columns');
  if (!mapping) return res.json({ headers: values[0].map(String), sample: values.slice(1, 6) });
  const mapped = rows(values, mapping);
  const teams = await Team.find({ status: 'active' }).select('teamName game captain manager').lean();
  const existing = await Registration.find({ tournament: t._id, rowKey: { $in: mapped.map(row => row.key) } }).lean();
  for (const row of mapped) {
    if (row.status === 'invalid') continue;
    if (existing.some(item => item.rowKey === row.key)) { row.status = 'imported'; continue; }
    row.candidates = teams.filter(team => team.teamName.toLowerCase() === row.data.teamName.toLowerCase()).map(team => ({ id: String(team._id), name: team.teamName, game: team.game }));
    if (row.candidates.length) row.status = 'conflict';
  }
  const snapshot = source?.type === 'google' ? { type: 'google', spreadsheetId: source.spreadsheetId, tab: source.tab } : { type: 'csv', name: String(req.file.originalname).slice(0, 150) };
  const fingerprint = hash(mapped.map(row => row.data));
  const b = await Batch.findOneAndUpdate({ owner: req.user.userId, tournament: t._id, fingerprint }, { $setOnInsert: { source: snapshot, rows: mapped } }, { upsert: true, new: true, runValidators: true });
  res.json(await view(b));
});
exports.get = endpoint(async (req, res) => res.json(await view(await batch(req))));
exports.list = endpoint(async (req, res) => res.json(await Batch.find({ owner: req.user.userId }).select('tournament source createdAt').sort({ createdAt: -1 }).limit(30).lean()));
async function createAccount(b, row, role, session) {
  const kind = role === 'Player' ? 'captain' : 'manager';
  const base = `${slug(row.data.teamName)}-${kind}`;
  let username = base, suffix = 1;
  while (await User.exists({ username }).session(session)) username = `${base}-${++suffix}`;
  const password = crypto.randomBytes(18).toString('base64url');
  const [user] = await User.create([{ name: row.data[kind + 'Name'], username, contactEmail: row.data[kind + 'Email'], password: await bcrypt.hash(password, 10), role, mustChangePassword: true }], { session });
  await Credential.create([{ batch: b._id, user: user._id, owner: b.owner, rowKey: row.key, teamName: row.data.teamName, login: username, role: kind, recipient: user.contactEmail, secret: encrypt(password), expiresAt: new Date(Date.now() + 7 * 86400000) }], { session });
  return user;
}
exports.confirm = endpoint(async (req, res) => {
  checkKey();
  const indexes = await User.collection.indexes();
  if (indexes.some(index => index.key.email === 1 && index.unique && !index.partialFilterExpression)) fail('Run the documented email-index migration before provisioning accounts', 503);
  const original = await batch(req);
  const decisions = req.body.decisions || {};
  for (const row of original.rows) {
    if (['imported', 'skipped'].includes(row.status)) continue;
    const choice = decisions[row.index];
    if (!choice || !['create', 'link', 'skip'].includes(choice.action)) fail('Review every row before importing');
    if (row.status === 'invalid' && choice.action !== 'skip') fail('Skip invalid rows or upload a corrected snapshot');
    if (row.status === 'conflict' && choice.action === 'create') fail('Link an existing team or skip the conflicting registration');
    if (choice.action === 'link' && !row.candidates?.some(team => team.id === choice.teamId)) fail('Choose one of the reviewed existing teams');
  }
  let processed = 0;
  for (const initial of original.rows) {
    if (['imported', 'skipped'].includes(initial.status)) continue;
    if (processed++ >= 25) break;
    await mongoose.connection.transaction(async session => {
      const b = await batch(req, session), row = b.rows.find(item => item.index === initial.index);
      if (['imported', 'skipped'].includes(row.status)) return;
      const choice = decisions[row.index];
      if (choice.action === 'skip') row.status = 'skipped';
      else {
        const t = await tournament(b.tournament, session);
        const previous = await Registration.findOne({ tournament: t._id, rowKey: row.key }).session(session);
        if (!previous) {
          if (t.teams.length >= t.teamLimit) fail('Tournament team capacity reached', 409);
          let team;
          if (choice.action === 'link') {
            team = await Team.findOne({ _id: choice.teamId, status: 'active' }).session(session);
            if (!team || team.teamName.toLowerCase() !== row.data.teamName.toLowerCase()) fail('Existing team changed. Preview again.', 409);
          } else {
            if (await Team.exists({ teamName: { $regex: `^${row.data.teamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } }).session(session)) fail('A team with this name was created. Preview again.', 409);
            const captain = await createAccount(b, row, 'Player', session);
            const manager = row.data.managerName ? await createAccount(b, row, 'TeamManager', session) : null;
            [team] = await Team.create([{ teamName: row.data.teamName, game: t.game, region: row.data.region, captain: captain._id, manager: manager?._id || null, members: [captain._id] }], { session });
            await User.updateMany({ _id: { $in: [captain._id, ...(manager ? [manager._id] : [])] } }, { $set: { team: team._id } }).session(session);
          }
          if (!t.teams.some(id => String(id) === String(team._id))) { t.teams.push(team._id); await t.save({ session }); }
          await Registration.create([{ tournament: t._id, rowKey: row.key, team: team._id, batch: b._id }], { session });
          row.teamId = String(team._id);
        }
        row.status = 'imported';
      }
      b.markModified('rows'); await b.save({ session });
    });
  }
  res.json(await view(await batch(req)));
  require('../utils/credentialEmail').drain().catch(() => {});
});
exports.download = endpoint(async (req, res) => {
  const b = await batch(req);
  const credentials = await Credential.find({ batch: b._id, expiresAt: { $gt: new Date() } }).select('+secret').lean();
  const active = await User.find({ _id: { $in: credentials.map(item => item.user) }, mustChangePassword: true, banned: { $ne: true }, isBanned: { $ne: true } }).select('_id').lean();
  const lines = [['Team', 'Role', 'Login ID', 'Temporary password', 'Delivery email']];
  for (const item of credentials) if (active.some(user => String(user._id) === String(item.user))) lines.push([item.teamName, item.role, item.login, decrypt(item.secret), item.recipient]);
  res.set('Content-Disposition', 'attachment; filename="team-credentials.csv"').type('text/csv').send(lines.map(line => line.map(csvCell).join(',')).join('\r\n'));
});
exports.retry = endpoint(async (req, res) => {
  const b = await batch(req);
  if (req.body.confirm !== true) fail('Confirm retry; an interrupted send may already have delivered the email');
  await Credential.updateMany({ batch: b._id, status: { $in: ['failed', 'unknown'] }, expiresAt: { $gt: new Date() } }, { $set: { status: 'pending', error: '' } });
  res.json({ message: 'Failed deliveries queued again' });
  require('../utils/credentialEmail').drain().catch(() => {});
});
