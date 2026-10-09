import { useEffect, useState } from 'react';
import { vetoRequest } from '../services/vetoService';
import './VetoSettingsEditor.css';

export default function VetoSettingsEditor({ value = { enabled: false }, onChange, onGameChange, game, token }) {
  const [catalogues, setCatalogues] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    vetoRequest('/maps', token).then(data => { if (active) setCatalogues(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [token, attempt]);
  const gameId = ({ valo: 'valorant', valorant: 'valorant', cs2: 'cs2', 'counter strike 2': 'cs2', 'counter-strike 2': 'cs2' })[String(game).trim().toLowerCase()];
  const catalogue = catalogues?.[gameId];
  const enabled = value.enabled;
  return <fieldset className="veto-settings">
    <legend>Match map veto</legend>
    {onGameChange && <label>Veto game<select aria-label="Veto game" value={gameId || ''} onChange={e => onGameChange(e.target.value === 'valorant' ? 'Valorant' : 'CS2')}>
      <option value="" disabled>Choose Valorant or CS2</option><option value="valorant">Valorant</option><option value="cs2">Counter-Strike 2 (CS2)</option>
    </select></label>}
    {error && <div><p role="alert">{error}</p><button type="button" onClick={() => setAttempt(n => n + 1)}>Retry map catalogue</button></div>}
    {!catalogues && !error && <p role="status">Loading map catalogue…</p>}
    <label className="veto-check"><input type="checkbox" checked={!!enabled} disabled={!enabled && !catalogue}
      onChange={e => onChange(e.target.checked ? { enabled: true, game: gameId, bestOf: 3, pool: catalogue.preset } : { enabled: false })} /> Enable Valorant / CS2 map veto</label>
    {!gameId && <p>Choose a veto game above to set the tournament game and unlock map selection.</p>}
    {enabled && catalogue && <>
      {value.game !== gameId && <p role="alert">Game changed: disable and re-enable veto to choose the correct pool.</p>}
      <label>Default match format <select value={value.bestOf} onChange={e => onChange({ ...value, bestOf: Number(e.target.value) })}>
        {[1, 3, 5].map(n => <option key={n} value={n}>BO{n}</option>)}
      </select></label>
      <p>Choose an odd number of maps, at least seven. Selected: {value.pool?.length || 0}.</p>
      <button type="button" onClick={() => onChange({ ...value, game: gameId, pool: catalogue.preset })}>Use competitive preset</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 16 }}>
        {catalogue.maps.map(map => <label className="veto-check" key={map.id}><input type="checkbox" checked={value.pool?.includes(map.id) || false}
          onChange={e => onChange({ ...value, pool: e.target.checked ? [...(value.pool || []), map.id] : (value.pool || []).filter(id => id !== map.id) })} /> {map.name}</label>)}
      </div>
      <p><small>Preset verified {catalogue.verifiedAt}. <a href={catalogue.source} target="_blank" rel="noreferrer">Official source</a></small></p>
    </>}
  </fieldset>;
}
