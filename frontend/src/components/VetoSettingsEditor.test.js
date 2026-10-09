import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import VetoSettingsEditor from './VetoSettingsEditor';
import { vetoRequest } from '../services/vetoService';
jest.mock('../services/vetoService', () => ({ vetoRequest: jest.fn() }));
const maps = Array.from({ length: 9 }, (_, i) => ({ id: `map-${i}`, name: `Map ${i}` }));
const catalogue = { maps, preset: maps.slice(0, 7).map(m => m.id), verifiedAt: '2026-10-09', source: 'https://example.test/maps' };
function Editor() {
  const [game, setGame] = useState(''), [value, setValue] = useState({ enabled: false });
  return <><output aria-label="Tournament game">{game}</output><output aria-label="Saved settings">{JSON.stringify(value)}</output><VetoSettingsEditor token="test" game={game} value={value} onChange={setValue} onGameChange={game => { setGame(game); setValue({ enabled: false }); }} /></>;
}
beforeEach(() => { vetoRequest.mockReset(); vetoRequest.mockResolvedValue({ valorant: catalogue, cs2: catalogue }); });
test('choose a game inside veto setup, enable it, change format and toggle pool maps', async () => {
  render(<Editor />);
  expect(screen.getByRole('checkbox', { name: 'Enable Valorant / CS2 map veto' })).toBeDisabled();
  fireEvent.change(screen.getByRole('combobox', { name: 'Veto game' }), { target: { value: 'valorant' } });
  await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Enable Valorant / CS2 map veto' })).toBeEnabled());
  expect(screen.getByLabelText('Tournament game')).toHaveTextContent('Valorant');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Valorant / CS2 map veto' }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(10);
  fireEvent.change(screen.getByRole('combobox', { name: 'Default match format' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Map 7', exact: true }));
  const settings = JSON.parse(screen.getByLabelText('Saved settings').textContent);
  expect(settings.bestOf).toBe(5); expect(settings.pool).toHaveLength(8);
  fireEvent.change(screen.getByRole('combobox', { name: 'Veto game' }), { target: { value: 'cs2' } });
  expect(screen.getByLabelText('Tournament game')).toHaveTextContent('CS2');
  expect(screen.getByRole('checkbox', { name: 'Enable Valorant / CS2 map veto' })).not.toBeChecked();
});
test('catalogue failure has a working retry, and existing veto can still be disabled', async () => {
  vetoRequest.mockRejectedValueOnce(new Error('API unavailable'));
  const onChange = jest.fn();
  render(<VetoSettingsEditor game="Valorant" token="test" value={{ enabled: true }} onChange={onChange} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Enable Valorant / CS2 map veto' }));
  expect(onChange).toHaveBeenCalledWith({ enabled: false });
  fireEvent.click(screen.getByRole('button', { name: 'Retry map catalogue' }));
  await screen.findByRole('combobox', { name: 'Default match format' });
  expect(vetoRequest).toHaveBeenCalledTimes(2);
});
