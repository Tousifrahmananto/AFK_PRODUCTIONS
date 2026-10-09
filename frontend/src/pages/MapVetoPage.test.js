import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthContext } from '../context/AuthContext';
import { vetoRequest } from '../services/vetoService';
import MapVetoPage from './MapVetoPage';
jest.mock('react-router-dom', () => ({ useParams: () => ({ id: 'cup', matchId: 'match' }), Link: ({ children }) => <a href="/bracket">{children}</a> }), { virtual: true });
jest.mock('../services/vetoService', () => ({ vetoRequest: jest.fn() }));
jest.mock('../socket', () => ({ makeSocket: () => ({ on: jest.fn(), disconnect: jest.fn() }) }));
let state;
beforeEach(() => {
  jest.clearAllMocks();
  state = { title: 'Veto Cup', teams: [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }], permissions: { actorTeams: ['a'], isAdmin: false }, online: ['a', 'b'], bestOf: 3, settings: { enabled: true, game: 'valorant', pool: ['abyss', 'ascent'] }, session: null };
  vetoRequest.mockImplementation(async path => path === '/maps' ? { valorant: { maps: [{ id: 'abyss', name: 'Abyss' }, { id: 'ascent', name: 'Ascent' }], sides: ['Attack', 'Defense'] } } : path.endsWith('/heartbeat') ? {} : state);
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'test-request-id' } });
});
function show() { return render(<AuthContext.Provider value={{ token: 'test-token', user: { role: 'Player' } }}><MapVetoPage /></AuthContext.Provider>); }
test('captain confirms readiness with a revision and unique request ID', async () => {
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Confirm readiness' }));
  await waitFor(() => expect(vetoRequest).toHaveBeenCalledWith('/tournaments/cup/matches/match/veto/actions', 'test-token', { type: 'ready', requestId: 'test-request-id', expectedRevision: 0 }));
});
test('map click requires explicit confirmation and never sends a client-selected team', async () => {
  state.session = { id: 'session', revision: 4, history: [], expected: { type: 'ban', teamId: 'a' }, state: { phase: 'veto', game: 'valorant', bestOf: 3, pool: ['abyss', 'ascent'], available: ['abyss', 'ascent'], maps: [], ready: ['a', 'b'] } };
  show();
  fireEvent.click(await screen.findByRole('button', { name: 'Abyss Available' }));
  expect(vetoRequest.mock.calls.some(([path]) => path.endsWith('/actions'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm ban' }));
  await waitFor(() => expect(vetoRequest).toHaveBeenCalledWith('/tournaments/cup/matches/match/veto/actions', 'test-token', { type: 'ban', mapId: 'abyss', requestId: 'test-request-id', expectedRevision: 4 }));
});
test('roster spectator cannot act and forbidden responses expose no room data', async () => {
  state.permissions.actorTeams = [];
  const view = show();
  await screen.findByText('Captain and assigned manager controls only.');
  expect(screen.queryByRole('button', { name: 'Confirm readiness' })).not.toBeInTheDocument();
  view.unmount();
  vetoRequest.mockRejectedValue(Object.assign(new Error('Only this match’s teams and admins can enter'), { status: 403 }));
  show();
  await screen.findByRole('alert');
  expect(screen.queryByRole('heading', { name: 'Alpha' })).not.toBeInTheDocument();
});
