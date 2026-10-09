import { useEffect, useState } from 'react';
import { vetoRequest } from '../services/vetoService';

export default function VetoSettingsEditor({ value = { enabled: false }, onChange, game, token }) {
  const [catalogues, setCatalogues] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    vetoRequest('/maps', token).then(data => { if (active) setCatalogues(data); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [token]);
  const gameId = ({ valo: 'valorant', valorant: 'valorant', cs2: 'cs2', 'counter strike 2': 'cs2', 'counter-strike 2': 'cs2' })[String(game).trim().toLowerCase()];
  const catalogue = catalogues?.[gameId];
  const enabled = value.enabled;
  return <fieldset style={{ border: '1px solid #555', borderRadius: 10, padding: 16 }}>
    <legend>Match map veto</legend>
    {error && <p role="alert">{error}</p>}
    <label><input type="checkbox" checked={!!enabled} disabled={!catalogue}
      onChange={e => onChange(e.target.checked ? { enabled: true, game: gameId, bestOf: 3, pool: catalogue.preset } : { enabled: false })} /> Enable Valorant / CS2 map veto</label>
    {!catalogue && <p>Enter Valorant or CS2 as the tournament game to configure veto.</p>}
    {enabled && catalogue && <>
      {value.game !== gameId && <p role="alert">Game changed: disable and re-enable veto to choose the correct pool.</p>}
      <label>Default match format <select value={value.bestOf} onChange={e => onChange({ ...value, bestOf: Number(e.target.value) })}>
        {[1, 3, 5].map(n => <option key={n} value={n}>BO{n}</option>)}
      </select></label>
      <p>Choose an odd number of maps, at least seven. Selected: {value.pool?.length || 0}.</p>
      <button type="button" onClick={() => onChange({ ...value, game: gameId, pool: catalogue.preset })}>Use competitive preset</button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginTop: 16 }}>
        {catalogue.maps.map(map => <label key={map.id}><input type="checkbox" checked={value.pool?.includes(map.id) || false}
          onChange={e => onChange({ ...value, pool: e.target.checked ? [...value.pool, map.id] : value.pool.filter(id => id !== map.id) })} /> {map.name}</label>)}
      </div>
      <p><small>Preset verified {catalogue.verifiedAt}. <a href={catalogue.source} target="_blank" rel="noreferrer">Official source</a></small></p>
    </>}
  </fieldset>;
}
