const { parse } = require('csv-parse/sync');
const { createHash } = require('node:crypto');
const fields = ['teamName', 'captainName', 'captainEmail', 'contactEmail', 'managerName', 'managerEmail', 'region'];
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
function table(buffer) {
  if (buffer.length > 5 * 1024 * 1024) fail('CSV exceeds 5 MB');
  try { return parse(buffer, { bom: true, skip_empty_lines: true, relax_column_count: true, max_record_size: 100000 }); }
  catch { fail('Malformed CSV. Export a fresh CSV snapshot with a header row.'); }
}
function rows(values, mapping) {
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) fail('Choose column mappings');
  if (!Array.isArray(values) || values.length < 2 || values.length > 1001) fail('Provide a header and 1–1000 registration rows');
  if (values.some(row => row.length > 200)) fail('Use at most 200 columns');
  const headers = values[0].map(String);
  for (const field of ['teamName', 'captainName']) if (!Number.isInteger(mapping[field]) || mapping[field] < 0 || mapping[field] >= headers.length) fail(`Map ${field}`);
  const seen = new Set();
  return values.slice(1).filter(row => row.some(cell => String(cell).trim())).map((row, index) => {
    const data = Object.fromEntries(fields.map(field => [field, Number.isInteger(mapping[field]) && mapping[field] >= 0 ? String(row[mapping[field]] || '').trim() : '']));
    data.captainEmail = (data.captainEmail || data.contactEmail).toLowerCase();
    data.managerEmail = (data.managerEmail || data.contactEmail).toLowerCase();
    const key = hash([data.teamName.toLowerCase(), data.captainEmail]);
    let error = '';
    if (!data.teamName || !data.captainName) error = 'Team and captain names are required';
    if (Object.values(data).some(value => value.length > 254)) error = 'A field exceeds 254 characters';
    const email = value => /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value);
    if (!email(data.captainEmail) || (data.managerName && !email(data.managerEmail))) error = 'A valid delivery email is required for each account';
    if (!slug(data.teamName)) error = 'Team name needs at least one Latin letter or number for its login ID';
    if (seen.has(key)) error = 'Duplicate registration in this snapshot';
    seen.add(key);
    return { index, key, data, status: error ? 'invalid' : 'new', error };
  });
}
function slug(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45); }
function csvCell(value) { const text = String(value ?? ''); return '"' + (/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replace(/"/g, '""') + '"'; }
module.exports = { table, rows, hash, slug, csvCell };
