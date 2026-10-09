const Credential = require('../models/ProvisionedCredential');
const GoogleConnection = require('../models/GoogleConnection');
const User = require('../models/User');
const { accessToken } = require('../controllers/googleController');
const { decrypt } = require('./integrationSecrets');
let running = false;
async function drain() {
  if (running) return;
  running = true;
  try {
    await Credential.updateMany({ status: 'sending', attemptedAt: { $lt: new Date(Date.now() - 120000) } }, { $set: { status: 'unknown', error: 'Delivery interrupted; confirm receipt before retrying' } });
    const senders = await GoogleConnection.find({ purpose: 'gmail' }).select('owner email').lean();
    for (const sender of senders) {
      if (!await User.exists({ _id: sender.owner, role: 'Admin', banned: { $ne: true }, isBanned: { $ne: true } })) continue;
      for (let i = 0; i < 5; i++) {
        const credential = await Credential.findOneAndUpdate({ owner: sender.owner, status: 'pending', expiresAt: { $gt: new Date() } }, { $set: { status: 'sending', attemptedAt: new Date() } }, { new: true }).select('+secret');
        if (!credential) break;
        try {
          const user = await User.findById(credential.user).select('mustChangePassword banned isBanned');
          if (!user?.mustChangePassword || user.banned || user.isBanned) { await credential.deleteOne(); continue; }
          const access = await accessToken(sender.owner, 'gmail');
          const text = `Your AFK Productions ${credential.role} account for ${credential.teamName}\n\nLogin ID: ${credential.login}\nTemporary password: ${decrypt(credential.secret)}\nSign in: ${process.env.CLIENT_ORIGIN || 'http://localhost:3000'}/login\n\nChange your temporary password on first login. Keep your captain and manager credentials separate.`;
          const message = [`From: ${sender.email}`, `To: ${credential.recipient}`, 'Subject: Your AFK Productions team account', `Message-ID: <afk-${credential._id}@accounts.afk.invalid>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64')].join('\r\n');
          const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: 'Bearer ' + access, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: Buffer.from(message).toString('base64url') }), signal: AbortSignal.timeout(20000) });
          if (!response.ok) { credential.status = 'failed'; credential.error = 'Gmail rejected delivery (' + response.status + '). Reconnect or retry after checking sender limits.'; }
          else { const result = await response.json(); credential.status = 'sent'; credential.providerId = result.id; credential.error = ''; }
        } catch (error) { credential.status = error.status ? 'failed' : 'unknown'; credential.error = error.status ? error.message : 'Delivery outcome unknown. Confirm receipt before retrying.'; }
        await credential.save();
      }
    }
  } finally { running = false; }
}
function start() {
  const tick = () => drain().catch(error => console.error('Credential email queue unavailable:', error.message));
  tick(); const timer = setInterval(tick, 30000); timer.unref();
  return timer;
}
module.exports = { drain, start };
