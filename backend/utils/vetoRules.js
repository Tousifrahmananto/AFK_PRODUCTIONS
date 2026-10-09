const { randomInt } = require('node:crypto');

const catalogues = {
  valorant: {
    maps: ['Abyss', 'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Summit', 'Sunset'],
    preset: ['Abyss', 'Ascent', 'Haven', 'Lotus', 'Split', 'Summit', 'Sunset'],
    sides: ['Attack', 'Defense'], source: 'https://playvalorant.com/en-us/maps/',
  },
  cs2: {
    maps: ['Ancient', 'Anubis', 'Boulder', 'Cache', 'Dust II', 'Fachwerk', 'Inferno', 'Italy', 'Mirage', 'Nuke', 'Office', 'Overpass', 'Shelter', 'Train', 'Vertigo'],
    preset: ['Ancient', 'Anubis', 'Cache', 'Dust II', 'Inferno', 'Mirage', 'Nuke'],
    sides: ['T', 'CT'], source: 'https://store.steampowered.com/news/app/730/view/1836506165581827',
  },
};
const mapId = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
function gameId(game) {
  return ({ valorant: 'valorant', valo: 'valorant', cs2: 'cs2', 'counter-strike 2': 'cs2', 'counter strike 2': 'cs2' })[String(game).trim().toLowerCase()];
}
function fail(message, status = 400) { throw Object.assign(new Error(message), { status }); }
function validateSettings(settings, game) {
  if (!settings || settings.enabled === false) return { enabled: false };
  const id = gameId(game);
  if (!id || settings.game !== id) fail('Veto game must match Valorant or CS2 tournament game');
  if (![1, 3, 5].includes(settings.bestOf)) fail('Best of must be 1, 3, or 5');
  const pool = settings.pool;
  if (!Array.isArray(pool) || pool.length < 7 || pool.length % 2 !== 1 || new Set(pool).size !== pool.length) fail('Choose an odd pool of at least seven distinct maps');
  if (pool.some(id => !catalogues[settings.game].maps.some(name => mapId(name) === id))) fail('Unknown map or map from a different game');
  return { enabled: true, game: id, bestOf: settings.bestOf, pool: [...pool], rulesVersion: 1 };
}
function sequence(bestOf, poolSize) {
  const steps = [];
  const add = (type, team) => steps.push({ type, team });
  for (let i = 0; i < poolSize - 7; i++) add('ban', i % 2 + 1);
  if (bestOf === 1) for (let i = 0; i < 6; i++) add('ban', i % 2 + 1);
  else {
    add('ban', 1); add('ban', 2); add('pick', 1); add('pick', 2);
    add(bestOf === 3 ? 'ban' : 'pick', 1); add(bestOf === 3 ? 'ban' : 'pick', 2);
  }
  return steps;
}
function createState(settings, teams) {
  return { phase: 'waiting', game: settings.game, bestOf: settings.bestOf, rulesVersion: 1,
    pool: [...settings.pool], teams: [...teams], ready: [], tossWinner: null, tossFace: null,
    t1: null, t2: null, step: 0, available: [...settings.pool], maps: [] };
}
function expectedAction(state) {
  if (state.phase === 'decision') return { type: 'decision', teamId: state.tossWinner };
  if (state.phase === 'veto') {
    const action = sequence(state.bestOf, state.pool.length)[state.step];
    return { type: action.type, teamId: action.team === 1 ? state.t1 : state.t2 };
  }
  if (state.phase === 'sides') {
    const index = state.maps.findIndex(m => !m.sides);
    const map = state.maps[index];
    return { type: 'side', mapId: map.mapId, mapIndex: index, teamId: map.pickedBy ? (map.pickedBy === state.t1 ? state.t2 : state.t1) : state.t2 };
  }
  return null;
}
function transition(previous, action, teamId, connectedTeams = [], flip = () => randomInt(2)) {
  const state = structuredClone(previous);
  if (!state.teams.includes(teamId)) fail('Not one of the match teams', 403);
  if (action.type === 'ready') {
    if (state.phase !== 'waiting') fail('Toss already performed', 409);
    if (!connectedTeams.includes(teamId)) fail('Join the room before confirming readiness', 409);
    if (!state.ready.includes(teamId)) state.ready.push(teamId);
    if (state.teams.every(t => state.ready.includes(t) && connectedTeams.includes(t))) {
      const result = flip();
      state.tossFace = result === 0 ? 'Heads' : 'Tails';
      state.tossWinner = state.teams[result]; state.phase = 'decision';
    }
    return state;
  }
  const expected = expectedAction(state);
  if (!expected || expected.type !== action.type) fail('Action is not allowed in the current step', 409);
  if (expected.teamId !== teamId) fail('It is the other team’s turn', 403);
  if (action.type === 'decision') {
    if (!['ban-first', 'side-first'].includes(action.choice)) fail('Choose ban-first or side-first');
    const other = state.teams.find(t => t !== teamId);
    state.t1 = action.choice === 'ban-first' ? teamId : other;
    state.t2 = state.teams.find(t => t !== state.t1); state.phase = 'veto';
  } else if (action.type === 'side') {
    if (!catalogues[state.game].sides.includes(action.side)) fail('Invalid starting side');
    if (action.mapId !== expected.mapId) fail('Choose sides in map order', 409);
    state.maps[expected.mapIndex].sides = Object.fromEntries(state.teams.map(t => [t, t === teamId ? action.side : catalogues[state.game].sides.find(s => s !== action.side)]));
    if (state.maps.every(m => m.sides)) state.phase = 'completed';
  } else {
    if (!state.available.includes(action.mapId)) fail('Map is unavailable', 409);
    state.available = state.available.filter(id => id !== action.mapId);
    if (action.type === 'pick') state.maps.push({ mapId: action.mapId, pickedBy: teamId });
    state.step++;
    if (state.step === sequence(state.bestOf, state.pool.length).length) {
      state.maps.push({ mapId: state.available[0], pickedBy: null }); state.phase = 'sides';
    }
  }
  return state;
}
function permissions(user, teams) {
  const id = String(user.userId);
  const actorTeams = teams.filter(t => String(t.captain) === id || (user.role === 'TeamManager' && String(t.manager) === id)).map(t => String(t._id));
  const canView = user.role === 'Admin' || actorTeams.length > 0 || teams.some(t => (t.members || []).some(m => String(m) === id));
  return { canView, actorTeams, isAdmin: user.role === 'Admin' };
}
module.exports = { catalogues, mapId, gameId, fail, validateSettings, sequence, createState, expectedAction, transition, permissions };
