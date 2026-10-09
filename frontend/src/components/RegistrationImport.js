import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../services/apiConfig';
import { vetoRequest } from '../services/vetoService';
const fields = { teamName: 'Team name (required)', captainName: 'Captain name (required)', captainEmail: 'Captain delivery email', contactEmail: 'Fallback team contact email', managerName: 'Manager name (optional)', managerEmail: 'Manager delivery email', region: 'Region (optional)' };
let googleLoader;
function loadPicker() {
  if (!googleLoader) googleLoader = new Promise((resolve, reject) => {
    const load = () => window.gapi.load('picker', { callback: resolve, onerror: reject });
    if (window.gapi) return load();
    const script = document.createElement('script'); script.src = 'https://apis.google.com/js/api.js'; script.onload = load; script.onerror = () => reject(new Error('Unable to load Google Picker')); document.head.appendChild(script);
  });
  return googleLoader;
}
export default function RegistrationImport({ tournaments, onImported }) {
  const { token } = useContext(AuthContext);
  const [tournamentId, setTournament] = useState(''), [file, setFile] = useState(null), [source, setSource] = useState({ type: 'csv' }), [tabs, setTabs] = useState([]);
  const [headers, setHeaders] = useState([]), [sample, setSample] = useState([]), [mapping, setMapping] = useState({}), [data, setData] = useState(null), [decisions, setDecisions] = useState({});
  const [connections, setConnections] = useState(null), [history, setHistory] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = (path, body, method) => vetoRequest(path, token, body, method);
  useEffect(() => {
    let active = true;
    Promise.all([vetoRequest('/google', token), vetoRequest('/tournament-imports', token)]).then(([google, batches]) => { if (active) { setConnections(google); setHistory(batches); } }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [token]);
  async function run(fn) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  function show(value) {
    setData(value);
    setDecisions(Object.fromEntries(value.batch.rows.map(row => [row.index, { action: row.status === 'new' ? 'create' : 'skip' }])));
  }
  function clearPreview() { setHeaders([]); setData(null); setMapping({}); }
  async function preview(mapped) {
    const form = new FormData(); form.append('tournamentId', tournamentId); form.append('source', JSON.stringify(source));
    if (source.type === 'csv' && file) form.append('file', file);
    if (mapped) form.append('mapping', JSON.stringify(mapping));
    const response = await fetch(API_BASE + '/tournament-imports/preview', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form, cache: 'no-store' });
    const result = await response.json(); if (!response.ok) throw new Error(result.message);
    if (mapped) show(result); else { setHeaders(result.headers); setSample(result.sample); }
  }
  async function pickGoogle() {
    if (!connections?.pickerKey || !connections?.appId) throw new Error('Configure the Google Picker API key and Cloud project number first');
    const result = await request('/google/sheets/picker-token', {});
    await loadPicker();
    const g = window.google.picker;
    const picker = new g.PickerBuilder().setDeveloperKey(connections.pickerKey).setAppId(connections.appId).setOAuthToken(result.accessToken).setOrigin(window.location.origin).addView(new g.DocsView(g.ViewId.SPREADSHEETS)).setCallback(async event => {
      if (event.action === g.Action.PICKED) await run(async () => {
        const id = event.docs[0].id, result = await request(`/google/sheets/${encodeURIComponent(id)}/tabs`);
        clearPreview(); setTabs(result.tabs); setSource({ type: 'google', spreadsheetId: id, tab: result.tabs[0] });
      });
    }).build(); picker.setVisible(true);
  }
  async function download() {
    const response = await fetch(API_BASE + `/tournament-imports/${data.batch._id}/credentials.csv`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!response.ok) throw new Error((await response.json()).message);
    const url = URL.createObjectURL(await response.blob()), link = document.createElement('a'); link.href = url; link.download = 'team-credentials.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function confirm() {
    let result = data;
    do { result = await request(`/tournament-imports/${result.batch._id}/confirm`, { decisions }); setData(result); }
    while (result.batch.rows.some(row => !['imported', 'skipped'].includes(row.status)));
    await onImported(); setHistory(await request('/tournament-imports'));
  }
  return <section className="ctp-card" aria-label="Import registrations"><h2>Import team registrations</h2>
    <p>Create the tournament above, then import its Google Forms responses. Only captain and optional manager accounts are created. Roster columns are ignored.</p>
    {error && <p role="alert">{error}</p>}
    <label>Tournament<select value={tournamentId} disabled={busy} onChange={e => { setTournament(e.target.value); clearPreview(); }}><option value="">Select a team tournament</option>{tournaments.filter(t => t.teamLimit > 0 && !t.playerLimit && t.status === 'Upcoming').map(t => <option key={t._id} value={t._id}>{t.title}</option>)}</select></label>
    <div className="actions">{['sheets', 'gmail'].map(purpose => <button type="button" className="btn btn-secondary" disabled={busy || !connections?.configured} key={purpose} onClick={() => run(async () => { const result = await request(`/google/${purpose}/connect`, {}); window.location.assign(result.url); })}>{connections?.connections?.some(c => c.purpose === purpose) ? 'Reconnect' : 'Connect'} {purpose === 'sheets' ? 'private Google Sheets' : 'Gmail sender'}</button>)}</div>
    {connections?.setupMessage && <p>{connections.setupMessage}</p>}
    <p>Without a Gmail connection, credentials wait in the delivery queue and remain available as a private download for seven days.</p>
    <label>CSV snapshot<input type="file" accept=".csv,text/csv" disabled={busy} onChange={e => { setFile(e.target.files[0] || null); setSource({ type: 'csv' }); clearPreview(); }} /></label>
    <button type="button" className="btn btn-secondary" disabled={busy || !connections?.connections?.some(c => c.purpose === 'sheets')} onClick={() => run(pickGoogle)}>Choose private spreadsheet</button>
    {source.type === 'google' && <label>Response tab<select value={source.tab} onChange={e => { setSource({ ...source, tab: e.target.value }); clearPreview(); }}>{tabs.map(tab => <option key={tab}>{tab}</option>)}</select></label>}
    <button type="button" className="btn" disabled={busy || !tournamentId || (source.type === 'csv' && !file)} onClick={() => run(() => preview(false))}>Read columns</button>
    {headers.length > 0 && <><h3>Map columns</h3>{Object.entries(fields).map(([key, label]) => <label key={key} style={{ display: 'block' }}>{label}<select value={mapping[key] ?? -1} onChange={e => setMapping({ ...mapping, [key]: Number(e.target.value) })}><option value={-1}>Not mapped</option>{headers.map((header, index) => <option key={index} value={index}>{header || `Column ${index + 1}`}</option>)}</select></label>)}<details><summary>Sample responses</summary><div style={{ overflowX: 'auto' }}><table><thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{sample.map((row, i) => <tr key={i}>{headers.map((_, j) => <td key={j}>{row[j]}</td>)}</tr>)}</tbody></table></div></details><button type="button" className="btn" disabled={busy} onClick={() => run(() => preview(true))}>Preview registrations</button></>}
    {data && <><h3>Review {data.batch.rows.length} registrations</h3><p>Linking keeps all existing accounts and passwords. Skipped rows are final for this snapshot. New login IDs use the team name with captain/manager suffixes; a number is added if already taken.</p><div style={{ overflowX: 'auto' }}><table><thead><tr><th>Team</th><th>Captain delivery</th><th>Manager delivery</th><th>Status</th><th>Decision</th></tr></thead><tbody>{data.batch.rows.map(row => <tr key={row.index}><td>{row.data.teamName}</td><td>{row.data.captainName}<br />{row.data.captainEmail}</td><td>{row.data.managerName ? <>{row.data.managerName}<br />{row.data.managerEmail}</> : 'No manager account'}</td><td>{row.status}<br />{row.error}</td><td>{!['imported', 'skipped'].includes(row.status) && <select aria-label={`Decision for ${row.data.teamName}`} value={decisions[row.index]?.action === 'link' ? decisions[row.index].teamId : decisions[row.index]?.action || 'skip'} onChange={e => setDecisions({ ...decisions, [row.index]: ['create', 'skip'].includes(e.target.value) ? { action: e.target.value } : { action: 'link', teamId: e.target.value } })}><option value="skip">Skip</option>{row.status === 'new' && <option value="create">Create accounts and team</option>}{row.candidates?.map(team => <option value={team.id} key={team.id}>Link {team.name} ({team.game})</option>)}</select>}</td></tr>)}</tbody></table></div>
    <div className="actions"><button className="btn" disabled={busy || data.batch.rows.every(row => ['imported', 'skipped'].includes(row.status))} onClick={() => run(confirm)}>{busy ? 'Working…' : 'Confirm import'}</button><button className="btn btn-secondary" disabled={busy} onClick={() => run(download)}>Download temporary credentials</button><button className="btn btn-secondary" disabled={busy} onClick={() => run(async () => setData(await request(`/tournament-imports/${data.batch._id}`)))}>Refresh delivery status</button><button className="btn btn-secondary" disabled={busy} onClick={() => { if (window.confirm('Retry failed or interrupted emails? An interrupted send may already have delivered.')) run(async () => { await request(`/tournament-imports/${data.batch._id}/retry-email`, { confirm: true }); setData(await request(`/tournament-imports/${data.batch._id}`)); }); }}>Retry failed deliveries</button></div>
    <ul>{data.credentials.map(item => <li key={item._id}>{item.login} → {item.recipient}: {item.status}{item.error && ` — ${item.error}`}</li>)}</ul></>}
    {history.length > 0 && <label>Resume a previous import<select value="" disabled={busy} onChange={e => e.target.value && run(async () => { const result = await request(`/tournament-imports/${e.target.value}`); setTournament(String(result.batch.tournament)); show(result); })}><option value="">Select batch</option>{history.map(b => <option key={b._id} value={b._id}>{b.source.name || b.source.tab} · {new Date(b.createdAt).toLocaleString()}</option>)}</select></label>}
  </section>;
}
