const crypto = require('node:crypto');
const GoogleConnection = require('../models/GoogleConnection');
const GoogleOAuthState = require('../models/GoogleOAuthState');
const User = require('../models/User');
const { encrypt, decrypt, checkKey } = require('../utils/integrationSecrets');
const scopes = { sheets: 'https://www.googleapis.com/auth/drive.file', gmail: 'https://www.googleapis.com/auth/gmail.send' };
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
function config() {
  checkKey();
  const clientId = process.env.GOOGLE_CLIENT_ID, clientSecret = process.env.GOOGLE_CLIENT_SECRET, redirect = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirect) fail('Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.', 503);
  return { clientId, clientSecret, redirect };
}
async function tokenRequest(fields) {
  const cfg = config();
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...fields }), signal: AbortSignal.timeout(15000) });
  const tokens = await response.json();
  if (!response.ok) fail('Google authorization expired or was rejected. Reconnect the account.', 409);
  return { ...tokens, expiresAt: Date.now() + tokens.expires_in * 1000 };
}
async function accessToken(owner, purpose) {
  const connection = await GoogleConnection.findOne({ owner, purpose }).select('+secret');
  if (!connection) fail(`Connect ${purpose === 'gmail' ? 'Gmail' : 'Google Sheets'} first`, 409);
  let tokens = decrypt(connection.secret);
  if (tokens.expiresAt < Date.now() + 60000) {
    if (!tokens.refresh_token) fail('Google session expired. Reconnect the account.', 409);
    tokens = { ...tokens, ...await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }) };
    connection.secret = encrypt(tokens); await connection.save();
  }
  return tokens.access_token;
}
function endpoint(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (error) { res.status(error.status || 502).json({ message: error.status ? error.message : 'Google request failed. Please retry.' }); }
  };
}
const status = endpoint(async (req, res) => {
  const connections = await GoogleConnection.find({ owner: req.user.userId }).select('purpose email updatedAt').lean();
  let configured = true, setupMessage = '';
  try { config(); } catch (error) { configured = false; setupMessage = error.message; }
  res.json({ configured, setupMessage, connections, pickerKey: process.env.GOOGLE_PICKER_API_KEY || '', appId: process.env.GOOGLE_CLOUD_PROJECT_NUMBER || '' });
});
const connect = endpoint(async (req, res) => {
  const cfg = config(), purpose = req.params.purpose;
  if (!scopes[purpose]) fail('Unknown Google connection');
  const state = crypto.randomBytes(32).toString('base64url'), verifier = crypto.randomBytes(32).toString('base64url');
  await GoogleOAuthState.create({ stateHash: hash(state), owner: req.user.userId, purpose, verifier: encrypt(verifier), expiresAt: new Date(Date.now() + 10 * 60000) });
  const query = new URLSearchParams({ client_id: cfg.clientId, redirect_uri: cfg.redirect, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: `openid email ${scopes[purpose]}`, state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' });
  res.json({ url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query });
});
const callback = async (req, res) => {
  const target = new URL('/admin/create-tournament', process.env.CLIENT_ORIGIN || 'http://localhost:3000');
  try {
    if (typeof req.query.state !== 'string' || req.query.state.length > 200) fail('Invalid authorization state');
    const state = await GoogleOAuthState.findOneAndDelete({ stateHash: hash(req.query.state), expiresAt: { $gt: new Date() } });
    if (!state || !await User.exists({ _id: state.owner, role: 'Admin', banned: { $ne: true }, isBanned: { $ne: true } })) fail('Authorization state expired or access revoked');
    if (req.query.error || typeof req.query.code !== 'string' || req.query.code.length > 4096) fail('Google authorization was cancelled');
    const tokens = await tokenRequest({ code: req.query.code, code_verifier: decrypt(state.verifier), grant_type: 'authorization_code', redirect_uri: config().redirect });
    if (!String(tokens.scope || '').split(' ').includes(scopes[state.purpose])) fail('Required Google permission was not granted');
    const identity = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15000) });
    const info = await identity.json();
    if (!identity.ok || !info.email || !info.email_verified) fail('Unable to verify Google sender identity');
    await GoogleConnection.findOneAndUpdate({ owner: state.owner, purpose: state.purpose }, { secret: encrypt(tokens), email: info.email }, { upsert: true, runValidators: true });
    target.searchParams.set('google', 'connected');
  } catch { target.searchParams.set('google', 'failed'); }
  res.redirect(target.toString());
};
const disconnect = endpoint(async (req, res) => {
  if (!scopes[req.params.purpose]) fail('Unknown connection');
  await GoogleConnection.deleteOne({ owner: req.user.userId, purpose: req.params.purpose });
  res.json({ message: 'Connection removed from AFK. You can also revoke access in your Google account.' });
});
const pickerToken = endpoint(async (req, res) => res.json({ accessToken: await accessToken(req.user.userId, 'sheets') }));
async function readSheet(owner, spreadsheetId, tab) {
  if (typeof spreadsheetId !== 'string' || !/^[a-zA-Z0-9_-]{15,200}$/.test(spreadsheetId)) fail('Choose a Google spreadsheet');
  const access = await accessToken(owner, 'sheets');
  const headers = { Authorization: `Bearer ${access}` };
  const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties(title),sheets(properties(title))`, { headers, signal: AbortSignal.timeout(15000) });
  if (!metadataResponse.ok) fail('Selected private spreadsheet is unavailable. Select it again through Google Picker.', 409);
  const metadata = await metadataResponse.json();
  const tabs = metadata.sheets.map(sheet => sheet.properties.title);
  if (!tab) return { tabs, title: metadata.properties.title };
  if (!tabs.includes(tab)) fail('Response tab not found');
  const range = `'${tab.replace(/'/g, "''")}'!A1:GR1002`;
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`, { headers, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  if (!response.ok) fail('Unable to read response tab', 409);
  if (Buffer.byteLength(text) > 5 * 1024 * 1024) fail('Sheet snapshot exceeds 5 MB', 413);
  return { tabs, title: metadata.properties.title, values: JSON.parse(text).values || [] };
}
const sheetTabs = endpoint(async (req, res) => res.json(await readSheet(req.user.userId, req.params.spreadsheetId)));
module.exports = { status, connect, callback, disconnect, pickerToken, sheetTabs, accessToken, readSheet };
