import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { vetoRequest } from '../services/vetoService';
import { makeSocket } from '../socket';
import './MapVetoPage.css';

export default function MapVetoPage() {
  const { id, matchId } = useParams();
  const { token } = useContext(AuthContext);
  const path = `/tournaments/${id}/matches/${matchId}`;
  const [data, setData] = useState(null);
  const [catalogues, setCatalogues] = useState(null);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [live, setLive] = useState(false);
  const [pending, setPending] = useState(null);
  const [reason, setReason] = useState('');
  const [adminTeam, setAdminTeam] = useState('');
  const [managerNames, setManagerNames] = useState({});
  const request = useRef(0);
  const mounted = useRef(true);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    try {
      await vetoRequest(path + '/veto/heartbeat', token, {});
      const state = await vetoRequest(path + '/veto', token);
      if (!mounted.current || current !== request.current) return;
      setData(previous => previous?.session && state.session && previous.session.id === state.session.id && previous.session.revision > state.session.revision ? previous : state);
      setLoadError('');
    } catch (e) {
      if (!mounted.current || current !== request.current) return;
      setLoadError(e.message);
      if ([401, 403].includes(e.status)) { setData(null); setRevoked(true); }
    }
  }, [path, token]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (revoked) return;
    refresh();
    vetoRequest('/maps', token).then(value => { if (mounted.current) setCatalogues(value); }).catch(() => {});
    const socket = makeSocket(token);
    socket.on('connect', () => socket.emit('veto:subscribe', { tournamentId: id, matchId }, ack => { if (mounted.current) setLive(!!ack.ok); }));
    socket.on('disconnect', () => { if (mounted.current) setLive(false); });
    socket.on('veto:updated', refresh);
    socket.on('veto:revoked', () => { setData(null); setRevoked(true); setError('Room access revoked'); });
    const interval = setInterval(refresh, 5000);
    return () => { clearInterval(interval); socket.disconnect(); };
  }, [id, matchId, token, refresh, revoked]);

  const session = data?.session;
  const state = session?.state;
  const expected = session?.expected;
  useEffect(() => { setPending(null); }, [session?.id, session?.revision]);
  const admin = data?.permissions.isAdmin;
  const actingTeam = admin ? (expected?.teamId || adminTeam || data?.teams[0]?.id) : data?.permissions.actorTeams[0];
  const name = teamId => data?.teams.find(t => t.id === teamId)?.name || teamId;
  const catalogue = catalogues?.[state?.game || data?.settings.game];
  const mapName = map => catalogue?.maps.find(m => m.id === map)?.name || map;
  const canAct = !data?.finished && (admin || data?.permissions.actorTeams.length === 1) && (!expected || expected.teamId === actingTeam);
  const act = async action => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const body = { ...action, requestId: crypto.randomUUID(), expectedRevision: session?.revision || 0, ...(admin ? { teamId: actingTeam, reason } : {}) };
      await vetoRequest(path + '/veto/actions', token, body);
      setPending(null); await refresh();
    } catch (e) { setError(e.message); if (e.status === 409) await refresh(); }
    finally { if (mounted.current) setBusy(false); }
  };
  const reset = async () => {
    if (!window.confirm('Archive this veto and require both teams to start again?')) return;
    setBusy(true);
    try { await vetoRequest(path + '/veto/reset', token, { reason, expectedRevision: session.revision }); setPending(null); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const saveFormat = async bestOf => {
    setBusy(true);
    try { await vetoRequest(path + '/settings', token, { bestOf }, 'PATCH'); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const assignManager = async teamId => {
    setBusy(true);
    try { await vetoRequest(`/teams/${teamId}/manager`, token, { username: managerNames[teamId] || '' }, 'PATCH'); await refresh(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <main className="veto-room">
    <Link to={`/tournaments/${id}/bracket`}>← Tournament bracket</Link>
    <header><p className="veto-eyebrow">AFK PRODUCTIONS / MAP VETO</p><h1>{data?.title || 'Match map veto'}</h1>
      {data && <p>BO{state?.bestOf || data.bestOf} · {live ? 'Live connection' : 'Updates every 5 seconds'}</p>}</header>
    {(error || loadError) && <p className="veto-notice" role="alert">{error || loadError}</p>}
    {!data && !error && !loadError && <p role="status">Checking match access…</p>}
    {data && <>
      <div className="veto-teams">{data.teams.map(team => <section className="veto-panel" key={team.id}>
        <p className="veto-eyebrow">{state?.t1 === team.id ? 'TEAM 1 · BAN FIRST' : state?.t2 === team.id ? 'TEAM 2 · SIDE FIRST' : 'MATCH TEAM'}</p>
        <h2>{team.name}</h2><p>{data.online.includes(team.id) ? 'Representative connected' : 'Waiting for representative'} · {state?.ready.includes(team.id) ? 'Ready' : 'Not ready'}</p>
        {admin && <form onSubmit={e => { e.preventDefault(); assignManager(team.id); }}><label>Assign manager by username<input value={managerNames[team.id] || ''} onChange={e => setManagerNames({ ...managerNames, [team.id]: e.target.value })} placeholder="Existing TeamManager username" /></label><button disabled={busy}>Assign manager</button></form>}
      </section>)}</div>
      {!data.settings.enabled && <p className="veto-notice">An admin must enable map veto in the tournament settings.</p>}
      {admin && <section className="veto-panel"><h2>Admin controls</h2>
        {!session && <label>Match format <select value={data.bestOf || 3} disabled={busy || data.finished} onChange={e => saveFormat(Number(e.target.value))}>{[1, 3, 5].map(n => <option key={n} value={n}>BO{n}</option>)}</select></label>}
        <label>Intervention reason<input maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Required for acting or resetting" /></label>
        {!expected && <label>Act for team<select value={adminTeam || data.teams[0].id} onChange={e => setAdminTeam(e.target.value)}>{data.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
        {session && <button disabled={busy || data.finished || reason.trim().length < 3} onClick={reset}>Archive and reset veto</button>}
      </section>}
      {data.settings.enabled && <section className="veto-panel" aria-live="polite">
        {(!state || state.phase === 'waiting') && <><h2>Ready for the coin flip?</h2><p>Heads: {data.teams[0].name}. Tails: {data.teams[1].name}. Both teams must join and confirm readiness.</p>
          {canAct ? <button disabled={busy || !data.online.includes(actingTeam) || (state?.ready.includes(actingTeam) && !data.teams.every(t => data.online.includes(t.id))) || (admin && reason.trim().length < 3)} onClick={() => act({ type: 'ready' })}>{state?.ready.includes(actingTeam) ? 'Check both teams and flip' : 'Confirm readiness'}</button> : <p>Captain and assigned manager controls only.</p>}</>}
        {state?.tossWinner && <p className="veto-coin">{state.tossFace} · {name(state.tossWinner)} won the toss</p>}
        {state?.phase === 'decision' && <><h2>{name(expected.teamId)} chooses its advantage</h2><p>Ban first as Team 1, or choose starting sides first as Team 2.</p>{canAct && <div className="veto-actions"><button disabled={busy || (admin && reason.trim().length < 3)} onClick={() => act({ type: 'decision', choice: 'ban-first' })}>Ban first</button><button disabled={busy || (admin && reason.trim().length < 3)} onClick={() => act({ type: 'decision', choice: 'side-first' })}>Choose sides first</button></div>}</>}
        {state?.phase === 'veto' && <><h2>{name(expected.teamId)}: {expected.type === 'ban' ? 'ban a map' : 'pick a map'}</h2><p>Confirm your choice below. Accepted actions cannot be undone.</p></>}
        {state?.phase === 'sides' && <><h2>{name(expected.teamId)}: choose sides on {mapName(expected.mapId)}</h2><p>Map {expected.mapIndex + 1} of {state.bestOf}</p>{canAct && <div className="veto-actions">{catalogue?.sides.map(side => <button key={side} disabled={busy || (admin && reason.trim().length < 3)} onClick={() => act({ type: 'side', mapId: expected.mapId, side })}>Start {side}</button>)}</div>}</>}
        {state?.phase === 'completed' && <><h2>Map veto complete</h2><p>Maps and starting sides are locked. Good luck to both teams.</p></>}
        {data.finished && <p>Match result recorded. This room is read-only.</p>}
      </section>}
      {data.settings.enabled && <div className="veto-maps">{(state?.pool || data.settings.pool || []).map(map => {
        const picked = state?.maps.find(m => m.mapId === map);
        const banned = state && !state.available.includes(map) && !picked;
        return <button key={map} className={`veto-map ${pending === map ? 'selected' : ''}`} disabled={busy || !canAct || state?.phase !== 'veto' || banned || !!picked}
          onClick={() => setPending(map)} aria-pressed={pending === map}><strong>{mapName(map)}</strong><span>{picked ? (picked.pickedBy ? `Picked by ${name(picked.pickedBy)}` : 'Decider') : banned ? 'Banned' : 'Available'}</span></button>;
      })}</div>}
      {pending && state?.phase === 'veto' && <section className="veto-panel"><p>{expected.type === 'ban' ? 'Ban' : 'Pick'} <strong>{mapName(pending)}</strong>?</p><div className="veto-actions"><button disabled={busy || !canAct || !state.available.includes(pending) || (admin && reason.trim().length < 3)} onClick={() => act({ type: expected.type, mapId: pending })}>Confirm {expected.type}</button><button onClick={() => setPending(null)}>Cancel</button></div></section>}
      {!!state?.maps.length && <section className="veto-panel"><h2>Match maps</h2><ol>{state.maps.map(map => <li key={map.mapId}><strong>{mapName(map.mapId)}</strong> · {map.pickedBy ? `Picked by ${name(map.pickedBy)}` : 'Decider'}{map.sides && <p>{data.teams.map(t => `${t.name}: ${map.sides[t.id]}`).join(' / ')}</p>}</li>)}</ol></section>}
      {!!session?.history.length && <section className="veto-panel"><h2>Veto history</h2><ol>{session.history.map((h, i) => <li key={h.requestId || i}>{name(h.teamId)} · {h.type} {h.mapId ? mapName(h.mapId) : ''} {h.choice || h.side || ''}{h.reason && <span> · Admin: {h.reason}</span>} <time dateTime={h.at}>{new Date(h.at).toLocaleTimeString()}</time></li>)}</ol></section>}
    </>}
  </main>;
}
