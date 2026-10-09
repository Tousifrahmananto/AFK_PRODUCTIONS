const crypto = require('node:crypto');
function key() {
  const value = Buffer.from(process.env.INTEGRATION_ENCRYPTION_KEY || '', 'base64');
  if (value.length !== 32) throw Object.assign(new Error('Configure INTEGRATION_ENCRYPTION_KEY as a base64-encoded 32-byte key'), { status: 503 });
  return value;
}
function encrypt(value) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}
function decrypt(value) {
  const bytes = Buffer.from(value, 'base64');
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), bytes.subarray(0, 12));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString('utf8'));
}
module.exports = { encrypt, decrypt, checkKey: key };
