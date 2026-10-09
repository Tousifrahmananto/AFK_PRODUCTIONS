require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
// Existing email values stay untouched; only users without an email leave the unique index.
async function migrate() {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const users = mongoose.connection.collection('users');
  const duplicates = await users.aggregate([{ $match: { email: { $type: 'string' } } }, { $group: { _id: '$email', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $limit: 1 }]).toArray();
  if (duplicates.length) throw new Error('Duplicate existing emails must be resolved before migration');
  const indexes = await users.indexes();
  const old = indexes.find(index => index.key.email === 1 && Object.keys(index.key).length === 1);
  if (old && !old.partialFilterExpression) await users.dropIndex(old.name);
  await users.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
  console.log('Email index ready. Existing user data and passwords unchanged.');
}
if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = migrate;
