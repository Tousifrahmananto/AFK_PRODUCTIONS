import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { vetoRequest } from '../services/vetoService';
export default function ChangePasswordPage() {
  const { token, user, login, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError('');
    if (password !== confirmation) return setError('Passwords do not match');
    setBusy(true);
    try { const data = await vetoRequest('/auth/change-password', token, { currentPassword, password }); login(data.user, data.token); navigate('/tournaments', { replace: true }); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="container account-activation"><style>{`.account-activation .card { background:#191919; border-color:#333; color:#eee; } .account-activation .input { background:#111; border-color:#444; color:#fff; } .account-activation .btn { background:#eee; color:#111; } .account-activation .btn:disabled { opacity:.5; }`}</style><div className="card"><h1>Set your password</h1><p>Welcome, {user.username}. Replace your temporary password to activate your account.</p><form onSubmit={submit}>
    <label>Temporary or current password<input className="input" type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
    <label>New password<input className="input" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e => setPassword(e.target.value)} /></label>
    <p>Use at least 12 characters (maximum 72 UTF-8 bytes).</p>
    <label>Confirm password<input className="input" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
    {error && <p role="alert">{error}</p>}<button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Activate account'}</button>
  </form><button className="btn" onClick={logout}>Sign out</button></div></main>;
}
