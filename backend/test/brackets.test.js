const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generate, result, hasResults } = require('../utils/brackets');
const { table, rows, csvCell, slug } = require('../utils/registrationRows');
test('nine-team elimination has no padded matches and no team starts in the final', () => {
  const participants = Array.from({ length: 9 }, (_, i) => ({ id: String(i), kind: 'team', label: `Team ${i}` }));
  const single = generate(participants, 'Single Elimination');
  assert.deepEqual(single.rounds.map(round => round.length), [1, 4, 2, 1]);
  assert.equal(single.rounds.flat().some(m => m.status === 'bye' || m.winner), false);
  assert.equal(single.rounds.at(-1)[0].p1, null);
  assert.equal(single.rounds.at(-1)[0].p2, null);
  result(single, 0, 0, 'p1');
  result(single, 1, 0, 'p1');
  assert.equal(single.rounds[2][0].status, 'pending');
  assert.equal(single.rounds[2][0].winner, null);
  assert.equal(single.rounds[3][0].p1, null);
  assert.equal(single.rounds[3][0].p2, null);
  const double = generate(participants, 'Double Elimination');
  assert.equal(double.rounds.flat().length, 17);
  assert.equal(double.rounds.flat().some(m => m.status === 'bye' || m.winner), false);
  const ids = new Set(double.rounds.flat().map(m => m.id));
  for (const match of double.rounds.flat()) for (const feed of Object.values(match.feeds)) assert.ok(ids.has(feed.matchId));
});
test('compact elimination preserves correct loss counts for every field size from 2 to 32', () => {
  for (let n = 2; n <= 32; n++) for (const format of ['Single Elimination', 'Double Elimination']) {
    const bd = generate(Array.from({ length: n }, (_, i) => ({ id: String(i), label: `Team ${i}` })), format);
    assert.equal(bd.rounds.flat().some(m => m.status === 'bye'), false);
    assert.equal(bd.rounds.flat().length, format === 'Single Elimination' ? n - 1 : 2 * n - 1);
    const losses = new Map();
    for (let r = 0; r < bd.rounds.length; r++) for (let m = 0; m < bd.rounds[r].length; m++) if (bd.rounds[r][m].status === 'ready') {
      const match = bd.rounds[r][m], side = (r + m + n) % 2 ? 'p1' : 'p2';
      const loser = match[side === 'p1' ? 'p2' : 'p1'].id;
      losses.set(loser, (losses.get(loser) || 0) + 1); result(bd, r, m, side);
    }
    assert.equal(bd.rounds.flat().some(m => ['ready', 'pending', 'bye'].includes(m.status)), false);
    assert.equal([...losses.values()].filter(count => count === (format === 'Single Elimination' ? 1 : 2)).length, n - 1);
  }
});
for (const format of ['Single Elimination', 'Double Elimination', 'Round Robin']) for (const count of [2, 3, 8, 9, 16]) for (const reset of format === 'Double Elimination' ? [false, true] : [false]) {
  test(`${format}: ${count} teams${reset ? ', final reset' : ''}`, () => {
    const bd = generate(Array.from({ length: count }, (_, i) => ({ id: String(i + 1), kind: 'team', label: `Team ${i + 1}` })), format);
    assert.equal(hasResults(bd), false);
    const losses = {}, pairs = new Set(); let played = 0;
    for (let r = 0; r < bd.rounds.length; r++) for (let m = 0; m < bd.rounds[r].length; m++) {
      const match = bd.rounds[r][m];
      if (match.status !== 'ready') continue;
      assert.notEqual(match.p1.id, match.p2.id);
      const pair = [match.p1.id, match.p2.id].sort().join(':');
      if (format === 'Round Robin') { assert.equal(pairs.has(pair), false); pairs.add(pair); }
      const side = match.resetOf ? 'p1' : bd.roundLabels[r] === 'Grand final' && reset ? 'p2' : 'p1';
      const loser = match[side === 'p1' ? 'p2' : 'p1'].id;
      losses[loser] = (losses[loser] || 0) + 1;
      result(bd, r, m, side); played++;
    }
    assert.equal(bd.rounds.flat().some(match => ['ready', 'pending'].includes(match.status)), false);
    assert.equal(new Set(bd.rounds.flat().map(match => match.id)).size, bd.rounds.flat().length);
    if (format === 'Single Elimination') { assert.equal(played, count - 1); assert.equal(Object.values(losses).every(n => n === 1), true); }
    if (format === 'Double Elimination') { assert.equal(played, 2 * count - (reset ? 1 : 2)); assert.equal(Object.values(losses).filter(n => n === 2).length, count - 1); }
    if (format === 'Round Robin') { assert.equal(played, count * (count - 1) / 2); assert.equal(bd.standings.every(row => row.played === count - 1), true); }
  });
}
test('CSV handles quotes, BOM, duplicate rows, fallback recipients and formula-safe exports', () => {
  const values = table(Buffer.from('\ufeffTeam,Captain,Contact,Manager\r\n"Alpha, squad",Alice,one@example.test,Bob\r\n"Alpha, squad",Alice,one@example.test,Bob\r\nBroken,No,email,\r\n'));
  const result = rows(values, { teamName: 0, captainName: 1, contactEmail: 2, managerName: 3 });
  assert.equal(result[0].data.teamName, 'Alpha, squad'); assert.equal(result[0].data.managerEmail, 'one@example.test');
  assert.equal(result[0].status, 'new'); assert.equal(result[1].status, 'invalid'); assert.equal(result[2].status, 'invalid');
  assert.equal(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.throws(() => rows(values, { teamName: -1, captainName: 1 }));
  assert.match(slug('বাংলা'), /^team-[a-f0-9]{8}$/);
});
