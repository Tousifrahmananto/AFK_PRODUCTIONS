import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  getAllTournaments,
  createTournament as apiCreate,
  updateTournament as apiUpdate,
  deleteTournament as apiDelete,
  toggleRegistration,
  generateBracket,
} from "../services/tournamentService";
import { AuthContext } from "../context/AuthContext";
import VetoSettingsEditor from '../components/VetoSettingsEditor';
import RegistrationImport from '../components/RegistrationImport';
import { vetoRequest } from '../services/vetoService';

const BRACKETS = ["Single Elimination", "Double Elimination", "Round Robin"];
const STATUSES = ["Upcoming", "Live", "Completed"];

const emptyForm = {
  title: "",
  game: "",
  bracket: "Single Elimination",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  playerLimit: 0,
  teamLimit: 0,
  status: "Upcoming",
  registrationOpen: true,
  description: "",
  rules: "",
  location: "",
  prizePool: "",
  entryFee: "",
  vetoSettings: { enabled: false },
};

export default function CreateTournamentPage() {
  const { token } = useContext(AuthContext);
  const [form, setForm] = useState(emptyForm);
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllTournaments({}, token);
      setList(data || []);
    } catch (e) {
      console.error(e);
      alert("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [token]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const pickForEdit = (t) => {
    setEditingId(t._id);
    setForm({
      title: t.title || "",
      game: t.game || "",
      bracket: t.bracket || "Single Elimination",
      startDate: t.startDate ? t.startDate.slice(0, 10) : "",
      endDate: t.endDate ? t.endDate.slice(0, 10) : "",
      registrationDeadline: t.registrationDeadline ? t.registrationDeadline.slice(0, 10) : "",
      playerLimit: t.playerLimit ?? 0,
      teamLimit: t.teamLimit ?? 0,
      status: t.status || "Upcoming",
      registrationOpen: Boolean(t.registrationOpen),
      description: t.description || "",
      rules: t.rules || "",
      location: t.location || "",
      prizePool: t.prizePool || "",
      entryFee: t.entryFee || "",
      vetoSettings: t.vetoSettings || { enabled: false },
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => { setEditingId(null); setForm(emptyForm); };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        playerLimit: Number(form.playerLimit || 0),
        teamLimit: Number(form.teamLimit || 0),
      };
      if (isEditing) await apiUpdate(editingId, payload, token);
      else await apiCreate(payload, token);
      await load();
      resetForm();
      alert(isEditing ? "Tournament updated" : "Tournament created");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save tournament");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this tournament?")) return;
    try { await apiDelete(id, token); await load(); }
    catch (err) { alert(err?.response?.data?.message || "Delete failed"); }
  };

  const onToggleReg = async (id) => {
    try { await toggleRegistration(id, token); await load(); }
    catch (err) { alert(err?.response?.data?.message || "Toggle failed"); }
  };

  const onGenerateBracket = async (id) => {
    try { await generateBracket(id, token); alert("Bracket generated"); }
    catch (err) { alert(err?.response?.data?.message || "Failed to generate bracket"); }
  };

  return (
    <div className="ctp-root">
      <style>{`
        .ctp-root {
          background:#111111; color:#ececec; min-height:100vh;
          padding:20px 10px 40px; display:flex; justify-content:center;
        }
        .ctp-container { width:100%; max-width:900px; min-width:0; }
        .ctp-card {
          background:#191919; border:1px solid #303030; border-radius:12px; overflow-x:auto;
          padding:20px; margin-bottom:22px; box-shadow:0 6px 16px rgba(0,0,0,.4);
        }
        form { display:grid; gap:14px; }
        .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:640px){ .row-2 { grid-template-columns:1fr; } }
        label { font-size:13px; color:#a2a2a2; margin-bottom:4px; display:block; }
        input, select, textarea {
          width:100%; padding:10px; border-radius:8px;
          border:1px solid #2f2f2f; background:#151515; color:#fff;
          box-sizing:border-box; max-width:100%;
        }
        textarea { resize:vertical; min-height:80px; }
        .actions { display:flex; gap:10px; margin-top:8px; flex-wrap:wrap; }
        .ctp-root .btn { border:1px solid #555; border-radius:8px; padding:8px 14px; font-weight:600; cursor:pointer; background:#eee; color:#111; }
        .ctp-root .btn:hover { background:#ccc; color:#111; }
        .ctp-root .btn:disabled { opacity:.5; cursor:not-allowed; }
        .ctp-root .btn:focus-visible { outline:2px solid #fff; outline-offset:3px; }
        .ctp-root .btn-primary { background:#eee; color:#111; }
        .ctp-root .btn-secondary { background:#2f2f2f; color:#fff; }
        .ctp-root .btn-danger { background:#545454; color:#fff; }
        .ctp-root .btn-warning { background:#828282; color:#fff; }
        .ctp-root .btn-success { background:#eee; color:#111; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:10px; border-bottom:1px solid #2f2f2f; font-size:14px; }
        th { text-align:left; color:#a2a2a2; }
      `}</style>

      <div className="ctp-container">
        <div className="ctp-card">
          <form onSubmit={onSubmit}>
            <div>
              <label>Title</label>
              <input name="title" value={form.title} onChange={onChange} required />
            </div>

            <div className="row-2">
              <div>
                <label>Game</label>
                <input name="game" value={form.game} onChange={onChange} required />
              </div>
              <div>
                <label>Format</label>
                <select name="bracket" value={form.bracket} onChange={onChange}>
                  {BRACKETS.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
            </div>

            <div className="row-2">
              <div>
                <label>Start Date</label>
                <input type="date" name="startDate" value={form.startDate} onChange={onChange} />
              </div>
              <div>
                <label>End Date</label>
                <input type="date" name="endDate" value={form.endDate} onChange={onChange} />
              </div>
            </div>

            <div>
              <label>Registration Deadline</label>
              <input type="date" name="registrationDeadline" value={form.registrationDeadline} onChange={onChange} />
            </div>

            <div className="row-2">
              <div>
                <label>Team Cap</label>
                <input type="number" min="0" name="teamLimit" value={form.teamLimit} onChange={onChange} />
              </div>
              <div>
                <label>Solo Cap</label>
                <input type="number" min="0" name="playerLimit" value={form.playerLimit} onChange={onChange} />
              </div>
            </div>

            <div className="row-2">
              <div>
                <label>Status</label>
                <select name="status" value={form.status} onChange={onChange}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label>
                  <input type="checkbox" name="registrationOpen" checked={form.registrationOpen} onChange={onChange} /> Registration Open
                </label>
              </div>
            </div>

            <div>
              <label>Location</label>
              <input name="location" value={form.location} onChange={onChange} />
            </div>

            <div className="row-2">
              <div>
                <label>Prize Pool</label>
                <input name="prizePool" value={form.prizePool} onChange={onChange} />
              </div>
              <div>
                <label>Entry Fee</label>
                <input name="entryFee" value={form.entryFee} onChange={onChange} />
              </div>
            </div>

            <div>
              <label>Description</label>
              <textarea name="description" value={form.description} onChange={onChange} />
            </div>
            <div>
              <label>Rules</label>
              <textarea name="rules" value={form.rules} onChange={onChange} />
            </div>

            <VetoSettingsEditor value={form.vetoSettings} game={form.game} token={token} onChange={vetoSettings => setForm(f => ({ ...f, vetoSettings }))} />
            <div className="actions">
              <button type="submit" className="btn btn-primary">{isEditing ? "Update" : "Create"}</button>
              {isEditing && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
            </div>
          </form>
        </div>

        <RegistrationImport tournaments={list} onImported={load} />

        <div className="ctp-card">
          {loading && <div>Loading…</div>}
          {!loading && list.length === 0 && <div>No tournaments yet.</div>}
          {!loading && list.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Title</th><th>Game</th><th>Bracket</th><th>Deadline</th>
                  <th>Start</th><th>End</th><th>Solo/Team</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t._id}>
                    <td>{t.title}</td>
                    <td>{t.game}</td>
                    <td>{t.bracket}</td>
                    <td>{t.registrationDeadline ? new Date(t.registrationDeadline).toLocaleDateString() : "—"}</td>
                    <td>{t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"}</td>
                    <td>{t.endDate ? new Date(t.endDate).toLocaleDateString() : "—"}</td>
                    <td>{t.playerLimit}/{t.teamLimit}</td>
                    <td>{t.status}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-secondary" onClick={() => pickForEdit(t)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => onDelete(t._id)}>Delete</button>
                        <button className="btn btn-warning" onClick={() => onToggleReg(t._id)}>
                          {t.registrationOpen ? "Close" : "Open"}
                        </button>
                        <button className="btn btn-success" onClick={() => onGenerateBracket(t._id)}>Bracket</button>
                        <button className="btn btn-secondary" onClick={async () => { if (!window.confirm('Clear this unplayed bracket? Registered teams will remain.')) return; try { await vetoRequest(`/tournaments/${t._id}/reset-bracket`, token, {}); await load(); } catch (error) { alert(error.message); } }}>Clear unplayed bracket</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
