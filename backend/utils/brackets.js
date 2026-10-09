const { randomInt, randomUUID } = require('node:crypto');
const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };
const ref = (match, outcome = 'winner') => ({ matchId: match.id, outcome });
const settled = match => ['completed', 'bye', 'not-needed'].includes(match.status);
function compact(bd) {
  const routes = new Map(), rounds = [], labels = [];
  // Bypass structural byes before play; an unresolved real match is never a bye.
  bd.rounds.forEach((round, index) => {
    const retained = [];
    for (const match of round) {
      const slots = ['p1', 'p2'].map(side => {
        const feed = match.feeds[side];
        return feed ? routes.get(feed.matchId)[feed.outcome] : match[side] ? { participant: match[side] } : null;
      });
      if (!slots[0] || !slots[1]) { routes.set(match.id, { winner: slots[0] || slots[1], loser: null }); continue; }
      match.feeds = {};
      ['p1', 'p2'].forEach((side, i) => {
        match[side] = slots[i].participant || null;
        if (!slots[i].participant) match.feeds[side] = slots[i];
      });
      routes.set(match.id, { winner: ref(match), loser: ref(match, 'loser') });
      retained.push(match);
    }
    if (retained.length) { rounds.push(retained); labels.push(bd.roundLabels[index]); }
  });
  bd.rounds = rounds; bd.roundLabels = labels; bd.compact = true;
  if (bd.participants.length & (bd.participants.length - 1)) bd.roundLabels[0] = bd.format === 'Double Elimination' ? 'Winners play-in' : 'Play-in';
  if (bd.format === 'Single Elimination') {
    const names = ['Final', 'Semifinals', 'Quarterfinals'];
    for (let i = 0; i < Math.min(names.length, rounds.length); i++) if (rounds[rounds.length - 1 - i].length === 2 ** i) bd.roundLabels[rounds.length - 1 - i] = names[i];
  }
  return bd;
}
function resolve(bd) {
  const byId = new Map();
  for (const round of bd.rounds) for (const match of round) {
    let ready = true;
    if (match.resetOf) {
      const final = byId.get(match.resetOf);
      if (!settled(final)) ready = false;
      else if (final.winner?.id !== final.p2?.id) { match.status = 'not-needed'; match.p1 = null; match.p2 = null; match.winner = null; byId.set(match.id, match); continue; }
    }
    for (const side of ['p1', 'p2']) {
      const feed = match.feeds?.[side];
      if (!feed) continue;
      const source = byId.get(feed.matchId);
      if (!source || !settled(source)) { match[side] = null; ready = false; }
      else match[side] = feed.outcome === 'winner' ? source.winner : source.status === 'completed' ? (source.winner.id === source.p1.id ? source.p2 : source.p1) : null;
    }
    if (!ready) match.status = 'pending';
    else if (!match.p1 || !match.p2) { match.status = 'bye'; match.winner = match.p1 || match.p2 || null; }
    else if (match.winner) {
      if (![match.p1.id, match.p2.id].includes(match.winner.id)) fail('A downstream result prevents changing this winner');
      match.status = 'completed';
    } else match.status = 'ready';
    byId.set(match.id, match);
  }
  if (bd.format === 'Round Robin') {
    bd.standings = bd.participants.map(p => ({ ...p, played: 0, wins: 0, losses: 0 }));
    for (const round of bd.rounds) for (const m of round) if (m.status === 'completed') for (const p of [m.p1, m.p2]) {
      const row = bd.standings.find(item => item.id === p.id); row.played++; row[m.winner.id === p.id ? 'wins' : 'losses']++;
    }
    bd.standings.sort((a, b) => b.wins - a.wins || a.label.localeCompare(b.label));
    bd.standings.forEach((row, index, all) => { row.rank = index && row.wins === all[index - 1].wins ? all[index - 1].rank : index + 1; });
  }
  return bd;
}
function generate(participants, format) {
  if (participants.length < 2 || participants.length > 256) fail('Brackets support 2–256 participants');
  if (new Set(participants.map(p => p.id)).size !== participants.length) fail('Duplicate participants');
  if (!['Single Elimination', 'Double Elimination', 'Round Robin'].includes(format)) fail('Unknown bracket format');
  const order = participants.slice();
  for (let i = order.length - 1; i > 0; i--) { const j = randomInt(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  const bd = { graphVersion: 1, format, generatedAt: new Date().toISOString(), generationId: randomUUID(), method: 'crypto-fisher-yates', participants: order, rounds: [], roundLabels: [] };
  function round(label, pairs) {
    const matches = pairs.map(pair => ({ id: randomUUID(), p1: null, p2: null, winner: null, feeds: {}, ...pair }));
    bd.rounds.push(matches); bd.roundLabels.push(label); return matches;
  }
  if (format === 'Round Robin') {
    const circle = order.concat(order.length % 2 ? [null] : []);
    for (let r = 0; r < circle.length - 1; r++) {
      const pairs = [];
      for (let i = 0; i < circle.length / 2; i++) if (circle[i] && circle[circle.length - 1 - i]) pairs.push({ p1: circle[i], p2: circle[circle.length - 1 - i] });
      round(`Round ${r + 1}`, pairs);
      circle.splice(1, 0, circle.pop());
    }
    return resolve(bd);
  }
  let size = 2;
  while (size < order.length) size *= 2;
  let seeds = [1, 2];
  while (seeds.length < size) seeds = seeds.flatMap(seed => [seed, seeds.length * 2 + 1 - seed]);
  const slots = seeds.map(seed => order[seed - 1] || null), winners = [];
  winners.push(round(format === 'Double Elimination' ? 'Winners 1' : 'Round 1', Array.from({ length: size / 2 }, (_, i) => ({ p1: slots[i * 2], p2: slots[i * 2 + 1] }))));
  while (winners[winners.length - 1].length > 1) {
    const prev = winners[winners.length - 1];
    winners.push(round(`${format === 'Double Elimination' ? 'Winners' : 'Round'} ${winners.length + 1}`, Array.from({ length: prev.length / 2 }, (_, i) => ({ feeds: { p1: ref(prev[i * 2]), p2: ref(prev[i * 2 + 1]) } }))));
  }
  if (format === 'Double Elimination') {
    let losers;
    if (size > 2) {
      losers = round('Losers 1', Array.from({ length: size / 4 }, (_, i) => ({ feeds: { p1: ref(winners[0][i * 2], 'loser'), p2: ref(winners[0][i * 2 + 1], 'loser') } })));
      for (let w = 1; w < winners.length; w++) {
        const previous = losers;
        losers = round(`Losers ${w * 2}`, previous.map((match, i) => ({ feeds: { p1: ref(match), p2: ref(winners[w][previous.length - 1 - i], 'loser') } })));
        if (w < winners.length - 1) {
          const paired = losers;
          losers = round(`Losers ${w * 2 + 1}`, Array.from({ length: paired.length / 2 }, (_, i) => ({ feeds: { p1: ref(paired[i * 2]), p2: ref(paired[i * 2 + 1]) } })));
        }
      }
    }
    const winnerFinal = winners[winners.length - 1][0];
    const final = round('Grand final', [{ feeds: { p1: ref(winnerFinal), p2: losers ? ref(losers[0]) : ref(winnerFinal, 'loser') } }])[0];
    round('Grand final reset (if needed)', [{ feeds: { p1: ref(winnerFinal), p2: losers ? ref(losers[0]) : ref(winnerFinal, 'loser') }, resetOf: final.id }]);
  } else bd.roundLabels[bd.roundLabels.length - 1] = 'Final';
  return resolve(compact(bd));
}
function result(bd, roundIndex, matchIndex, side) {
  const match = bd.rounds[roundIndex]?.[matchIndex];
  if (!match || !['ready', 'completed'].includes(match.status) || !['p1', 'p2'].includes(side)) fail('This match is not ready for a result');
  match.winner = match[side];
  return resolve(bd);
}
const hasResults = bd => bd?.rounds?.some(round => round.some(match => bd.graphVersion ? match.status === 'completed' : !!match.winner));
module.exports = { generate, resolve, result, hasResults };
