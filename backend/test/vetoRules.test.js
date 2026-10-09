const { test } = require('node:test');
const assert = require('node:assert/strict');
const { catalogues, mapId, validateSettings, createState, expectedAction, transition, permissions } = require('../utils/vetoRules');

for (const game of ['valorant', 'cs2']) for (const bestOf of [1, 3, 5]) for (const size of [7, 9, 11]) for (const toss of [0, 1]) for (const choice of ['ban-first', 'side-first']) {
  test(`${game} BO${bestOf}, ${size} maps, toss ${toss}, ${choice}`, () => {
    const settings = validateSettings({ enabled: true, game, bestOf, pool: catalogues[game].maps.slice(0, size).map(mapId) }, game);
    let state = createState(settings, ['a', 'b']);
    state = transition(state, { type: 'ready' }, 'a', ['a', 'b'], () => toss);
    assert.equal(state.phase, 'waiting');
    state = transition(state, { type: 'ready' }, 'b', ['a', 'b'], () => toss);
    assert.equal(state.tossWinner, ['a', 'b'][toss]);
    assert.throws(() => transition(state, { type: 'ready' }, 'a', ['a', 'b']), /already/);
    state = transition(state, { type: 'decision', choice }, state.tossWinner);
    assert.equal(state.t1 === state.tossWinner, choice === 'ban-first');
    const banned = [];
    while (state.phase === 'veto') {
      const step = expectedAction(state), selected = state.available[0];
      assert.throws(() => transition(state, { type: step.type, mapId: selected }, state.teams.find(t => t !== step.teamId)), /other team/);
      if (step.type === 'ban') banned.push(selected);
      state = transition(state, { type: step.type, mapId: selected }, step.teamId);
      assert.throws(() => transition(state, { type: expectedAction(state).type, mapId: selected }, expectedAction(state).teamId), /unavailable|map order|Invalid starting/);
    }
    assert.equal(state.maps.length, bestOf);
    assert.equal(banned.length, size - bestOf);
    assert.equal(new Set(state.maps.map(m => m.mapId)).size, bestOf);
    for (let i = 0; i < bestOf; i++) {
      const step = expectedAction(state);
      assert.equal(step.teamId, i % 2 === 0 ? state.t2 : state.t1);
      assert.equal(step.mapIndex, i);
      state = transition(state, { type: 'side', mapId: step.mapId, side: catalogues[game].sides[0] }, step.teamId);
      assert.equal(state.maps[i].sides[step.teamId], catalogues[game].sides[0]);
      assert.equal(state.maps[i].sides[state.teams.find(t => t !== step.teamId)], catalogues[game].sides[1]);
    }
    assert.equal(state.phase, 'completed');
    assert.throws(() => transition(state, { type: 'ban', mapId: state.pool[0] }, 'a'), /not allowed/);
  });
}
test('reject malformed pools and preserve waiting when a team is offline', () => {
  const settings = { enabled: true, game: 'valorant', bestOf: 3, pool: catalogues.valorant.preset.map(mapId) };
  for (const override of [{ pool: settings.pool.slice(0, 6) }, { pool: [...settings.pool, 'bind'] }, { pool: [...settings.pool.slice(0, 6), 'nuke'] }, { pool: Array(7).fill('abyss') }, { bestOf: 2 }, { game: 'cs2' }]) assert.throws(() => validateSettings({ ...settings, ...override }, 'valorant'));
  let state = createState(settings, ['a', 'b']);
  assert.throws(() => transition(state, { type: 'ready' }, 'a', []), /Join/);
  state = transition(state, { type: 'ready' }, 'a', ['a']);
  state = transition(state, { type: 'ready' }, 'b', ['b']);
  assert.equal(state.phase, 'waiting');
  state = transition(state, { type: 'ready' }, 'a', ['a', 'b'], () => 0);
  assert.equal(state.phase, 'decision');
});
test('permissions distinguish captain, assigned manager, roster, outsiders and unrelated managers', () => {
  const teams = [{ _id: 'a', captain: 'captain-a', manager: 'manager-a', members: ['player-a'] }, { _id: 'b', captain: 'captain-b', members: [] }];
  assert.deepEqual(permissions({ userId: 'captain-a', role: 'Player' }, teams).actorTeams, ['a']);
  assert.deepEqual(permissions({ userId: 'manager-a', role: 'TeamManager' }, teams).actorTeams, ['a']);
  assert.equal(permissions({ userId: 'manager-a', role: 'Player' }, teams).canView, false);
  assert.equal(permissions({ userId: 'player-a', role: 'Player' }, teams).canView, true);
  assert.deepEqual(permissions({ userId: 'player-a', role: 'Player' }, teams).actorTeams, []);
  assert.equal(permissions({ userId: 'outsider', role: 'TeamManager' }, teams).canView, false);
  assert.equal(permissions({ userId: 'admin', role: 'Admin' }, teams).canView, true);
});
