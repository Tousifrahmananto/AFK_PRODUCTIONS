import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAllTournaments,
    getMyStatus,
    registerSolo,
    unregisterSolo,
    registerTeam,
    unregisterTeam,
    getBracketVisibility,
    getBracket,
} from "../services/tournamentService";
import { useToast } from "../components/ToastHost";
import AdSlot from "../components/AdSlot";

const STATUSES = ["All", "Upcoming", "Live", "Completed"];

export default function TournamentsBrowsePage() {
    const toast = useToast();

    const [loading, setLoading] = useState(true);
    const [list, setList] = useState([]);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("All");
    const [game, setGame] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [mineOnly, setMineOnly] = useState(false);

    const navigate = useNavigate();
    const [openId, setOpenId] = useState(null);
    const [meStatus, setMeStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [bracketInfo, setBracketInfo] = useState(null);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (list || []).filter((t) => {
            if (status !== "All" && t.status !== status) return false;
            if (game && !new RegExp(game, "i").test(t.game || "")) return false;
            if (from && (!t.startDate || new Date(t.startDate) < new Date(from))) return false;
            if (to && (!t.startDate || new Date(t.startDate) > new Date(to))) return false;
            if (mineOnly && !t.__mine) return false;
            if (term) {
                const hay = `${t.title || ""} ${t.game || ""} ${t.bracket || ""}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            return true;
        });
    }, [list, q, status, game, from, to, mineOnly]);

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getAllTournaments({});
            setList(data || []);
        } catch (e) {
            console.error(e);
            setError("Failed to load tournaments.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const markMine = async (arr) => {
        const withMine = await Promise.all(
            arr.map(async (t) => {
                try {
                    const st = await getMyStatus(t._id);
                    return { ...t, __mine: !!(st.isSoloRegistered || st.isTeamRegistered) };
                } catch {
                    return { ...t, __mine: false };
                }
            })
        );
        setList(withMine);
    };

    useEffect(() => {
        if (mineOnly && list.length) { markMine(list); }
    }, [mineOnly]);

    const openDetails = async (id) => {
        setOpenId(id);
        setBracketInfo(null);
        try {
            const st = await getMyStatus(id);
            setMeStatus(st);
        } catch (e) {
            console.error(e);
        }
    };
    const closeDetails = () => { setOpenId(null); setMeStatus(null); setBracketInfo(null); };
    const tById = (id) => list.find((x) => String(x._id) === String(id));

    const ok = (m) => toast.push(m, "ok");
    const err = (m) => toast.push(m, "err");

    const actRegisterSolo = async (id) => {
        setBusy(true);
        try {
            await registerSolo(id); ok("Registered as solo.");
            const st = await getMyStatus(id); setMeStatus(st); await load();
        } catch (e) { err(e?.response?.data?.message || "Could not register (solo)."); }
        finally { setBusy(false); }
    };
    const actUnregisterSolo = async (id) => {
        setBusy(true);
        try {
            await unregisterSolo(id); ok("Unregistered (solo).");
            const st = await getMyStatus(id); setMeStatus(st); await load();
        } catch (e) { err(e?.response?.data?.message || "Could not unregister (solo)."); }
        finally { setBusy(false); }
    };
    const actRegisterTeam = async (id) => {
        setBusy(true);
        try {
            await registerTeam(id); ok("Team registered.");
            const st = await getMyStatus(id); setMeStatus(st); await load();
        } catch (e) { err(e?.response?.data?.message || "Could not register team."); }
        finally { setBusy(false); }
    };
    const actUnregisterTeam = async (id) => {
        setBusy(true);
        try {
            await unregisterTeam(id); ok("Team unregistered.");
            const st = await getMyStatus(id); setMeStatus(st); await load();
        } catch (e) { err(e?.response?.data?.message || "Could not unregister team."); }
        finally { setBusy(false); }
    };

    const viewBracket = async (id) => {
        try {
            const vis = await getBracketVisibility(id);
            if (!vis.visible) { err("Bracket is not visible yet."); return; }
            const { title, bracketData } = await getBracket(id);
            setBracketInfo({ id, visible: true, title, data: bracketData });
        } catch (e) {
            err(e?.response?.data?.message || "Failed to load bracket.");
        }
    };

    return (
        <div className="tb-root">
            <style>{`
        .tb-root { --bg:#0f1115; --panel:#151922; --line:#232838; --text:#e8ecf2; --muted:#9aa3b2;
          --pill:#10141c; --accent:#4f8cff; min-height:100vh; background:var(--bg); color:var(--text);
          padding:24px 12px 60px; display:flex; justify-content:center; }
        .tb-container { width:100%; max-width:1050px; }
        .tb-title { font-size:26px; font-weight:800; margin:0 0 14px; }
        .tb-card { background:var(--panel); border:1px solid var(--line); border-radius:14px; padding:14px; }
        .tb-card + .tb-card { margin-top:18px; }
        .tb-filter { display:grid; gap:10px; grid-template-columns: 1fr 140px 160px 160px 160px 130px; }
        @media(max-width:1000px){ .tb-filter { grid-template-columns: 1fr 1fr 1fr; } }
        input, select { width:100%; background:#11151d; border:1px solid var(--line); color:var(--text);
          border-radius:10px; padding:9px 11px; outline:none; }
        .check { display:flex; align-items:center; gap:8px; color:var(--muted); font-size:13px; }

        .tb-grid { display:grid; gap:12px; grid-template-columns:repeat(3, 1fr); }
        @media(max-width:1024px){ .tb-grid { grid-template-columns:repeat(2, 1fr); } }
        @media(max-width:680px){ .tb-grid { grid-template-columns: 1fr; } }
        .tb-item { background:#11151d; border:1px solid var(--line); border-radius:12px; padding:12px; }
        .tb-item h4 { margin:0 0 6px; font-size:16px; }
        .row { display:flex; gap:8px; flex-wrap:wrap; }
        .pill { background:var(--pill); border:1px solid var(--line); color:var(--muted);
          border-radius:999px; padding:3px 8px; font-size:12px; }
        .meta { font-size:13px; color:var(--muted); }
        .btn { border:0; border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
        .btn-primary { background:var(--accent); color:#fff; }
        .btn-ghost { background:#272b36; color:#fff; border:1px solid var(--line); }
        .btn-danger { background:#b23b3b; color:#fff; }
        .btn-slim { padding:6px 10px; font-weight:600; }
        .tb-actions { display:flex; gap:8px; flex-wrap:wrap; }

        .drawer { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:flex-start; justify-content:center; padding:40px 12px; z-index:50; }
        .drawer-card { width:100%; max-width:720px; background:var(--panel); border:1px solid var(--line);
          border-radius:14px; padding:16px; box-shadow:0 12px 28px rgba(0,0,0,.45); }
        .drawer-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
        .x { background:#222736; color:#fff; border:1px solid var(--line); border-radius:10px; padding:6px 10px; cursor:pointer; }
        .cols { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
        @media(max-width:680px){ .cols { grid-template-columns: 1fr; } }
        .mt8 { margin-top:8px; }
        .f13 { font-size:13px; color:var(--muted); }

        .modal { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; padding:20px; z-index:60; }
        .modal-card { background:var(--panel); border:1px solid var(--line); color:var(--text); width:100%; max-width:880px; border-radius:14px; padding:16px; }
        .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size:12px; }
      `}</style>

            <div className="tb-container">
                <div className="tb-title">Tournaments</div>

                <div style={{ margin: "0 0 14px 0" }}>
                    <AdSlot category="TournamentBrowse" />
                </div>

                <div className="tb-card" style={{ marginBottom: 12 }}>
                    <div className="tb-filter">
                        <input placeholder="Search title, game…" value={q} onChange={(e) => setQ(e.target.value)} />
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            {STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <input placeholder="Game (regex ok)" value={game} onChange={(e) => setGame(e.target.value)} />
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                        <label className="check">
                            <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                            My tournaments only
                        </label>
                    </div>
                </div>

                <div className="tb-card">
                    {loading && <div>Loading…</div>}
                    {!loading && error && <div>{error}</div>}
                    {!loading && !error && filtered.length === 0 && <div>No tournaments match your filters.</div>}
                    {!loading && !error && filtered.length > 0 && (
                        <div className="tb-grid">
                            {filtered.map((t) => (
                                <div className="tb-item" key={t._id}>
                                    <h4>{t.title}</h4>
                                    <div className="row">
                                        <span className="pill">{t.game}</span>
                                        <span className="pill">{t.bracket}</span>
                                        <span className="pill">{t.status}</span>
                                    </div>
                                    <div className="meta mt8">
                                        Start: {t.startDate ? new Date(t.startDate).toLocaleDateString() : "—"} •
                                        {" "}End: {t.endDate ? new Date(t.endDate).toLocaleDateString() : "—"}
                                    </div>
                                    <div className="meta">Deadline: {t.registrationDeadline ? new Date(t.registrationDeadline).toLocaleDateString() : "—"}</div>
                                    <div className="meta">Solo Cap: {t.playerLimit || 0} • Team Cap: {t.teamLimit || 0}</div>
                                    <div className="tb-actions mt8">
                                        <button className="btn btn-ghost btn-slim" onClick={() => openDetails(t._id)}>Details</button>
                                        <button className="btn btn-ghost btn-slim" onClick={() => viewBracket(t._id)}>View Bracket</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {openId && (
                <div className="drawer" onClick={closeDetails}>
                    <div className="drawer-card" onClick={(e) => e.stopPropagation()}>
                        <div className="drawer-hd">
                            <h3 style={{ margin: 0 }}>{tById(openId)?.title || "Tournament"}</h3>
                            <button className="x" onClick={closeDetails}>Close</button>
                        </div>

                        <div className="cols">
                            <div><div className="f13">Game</div><div>{tById(openId)?.game}</div></div>
                            <div><div className="f13">Format</div><div>{tById(openId)?.bracket}</div></div>
                            <div><div className="f13">Dates</div>
                                <div>
                                    {tById(openId)?.startDate ? new Date(tById(openId).startDate).toLocaleDateString() : "—"} →{" "}
                                    {tById(openId)?.endDate ? new Date(tById(openId).endDate).toLocaleDateString() : "—"}
                                </div>
                            </div>
                            <div><div className="f13">Registration Deadline</div>
                                <div>{tById(openId)?.registrationDeadline ? new Date(tById(openId).registrationDeadline).toLocaleDateString() : "—"}</div>
                            </div>
                            <div><div className="f13">Caps</div><div>Solo: {tById(openId)?.playerLimit || 0} • Team: {tById(openId)?.teamLimit || 0}</div></div>
                            <div><div className="f13">Status</div><div><span className="pill">{tById(openId)?.status}</span></div></div>
                        </div>

                        {tById(openId)?.description && (<><div className="f13" style={{ marginTop: 12 }}>Description</div><div>{tById(openId).description}</div></>)}
                        {tById(openId)?.rules && (<><div className="f13" style={{ marginTop: 12 }}>Rules</div><div>{tById(openId).rules}</div></>)}

                        <div className="tb-actions" style={{ marginTop: 14 }}>
                            {meStatus?.isSoloRegistered ? (
                                <button disabled={busy} className="btn btn-danger" onClick={() => actUnregisterSolo(openId)}>Unregister Solo</button>
                            ) : (
                                <button disabled={busy} className="btn btn-primary" onClick={() => actRegisterSolo(openId)}>Register Solo</button>
                            )}
                            {meStatus?.isTeamRegistered ? (
                                <button disabled={busy} className="btn btn-danger" onClick={() => actUnregisterTeam(openId)}>Unregister Team</button>
                            ) : (
                                <button disabled={busy} className="btn btn-ghost" onClick={() => actRegisterTeam(openId)}>Register Team</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {bracketInfo && (
                <div className="modal" onClick={() => setBracketInfo(null)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h3 style={{ margin: 0 }}>Bracket · {bracketInfo.title}</h3>
                            <button className="x" onClick={() => setBracketInfo(null)}>Close</button>
                        </div>
                        {!bracketInfo.data ? (
                            <div style={{ color: "#9aa3b2", padding: "24px 0", textAlign: "center" }}>
                                Bracket not generated yet.
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                                    <span className="pill" style={{ fontSize: 13, padding: "6px 12px" }}>
                                        👥 {bracketInfo.data.participants?.length || 0} participants
                                    </span>
                                    <span className="pill" style={{ fontSize: 13, padding: "6px 12px" }}>
                                        🔁 {bracketInfo.data.rounds?.length || 0} rounds
                                    </span>
                                    {bracketInfo.data.method && (
                                        <span className="pill" style={{ fontSize: 13, padding: "6px 12px" }}>
                                            ⚙️ {bracketInfo.data.method.replace(/-/g, " ")}
                                        </span>
                                    )}
                                </div>

                                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
                                    {(bracketInfo.data.rounds || []).map((round, rIdx) => {
                                        const total    = round.length;
                                        const decided  = round.filter(m => m?.winner).length;
                                        const isLast   = rIdx === bracketInfo.data.rounds.length - 1;
                                        return (
                                            <div key={rIdx} style={{
                                                flex: "0 0 auto",
                                                background: "#11151d",
                                                border: "1px solid #232838",
                                                borderRadius: 10,
                                                padding: "10px 14px",
                                                minWidth: 110,
                                                textAlign: "center",
                                            }}>
                                                <div style={{ fontSize: 11, color: "#4f8cff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>
                                                    {isLast ? (bracketInfo.data.rounds.length === 1 ? "FINALS" : "GRAND FINALS") : `R${rIdx + 1}`}
                                                </div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: "#e8ecf2" }}>{total}</div>
                                                <div style={{ fontSize: 11, color: "#6b7a99", marginTop: 2 }}>matches</div>
                                                {decided > 0 && (
                                                    <div style={{ fontSize: 11, color: "#2abb9b", marginTop: 4 }}>
                                                        {decided}/{total} done
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setBracketInfo(null);
                                            navigate(`/tournaments/${bracketInfo.id}/bracket`);
                                        }}
                                    >
                                        Open Full Bracket →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
