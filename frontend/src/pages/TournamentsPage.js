import React, { useContext, useEffect, useState } from "react";
import {
  getAllTournaments,
  getMyStatus,
  registerSolo,
  registerTeam,
  unregisterSolo,
  unregisterTeam,
} from "../services/tournamentService";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import AdSlot from "../components/AdSlot";

export default function TournamentsPage() {
  const { user, token } = useContext(AuthContext);
  const [list, setList] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "-");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllTournaments({}, token);
      setList(data || []);
      if (user) {
        const map = {};
        for (const t of data || []) {
          try {
            const s = await getMyStatus(t._id, token);
            map[t._id] = s || { isSoloRegistered: false, isTeamRegistered: false };
          } catch {
            map[t._id] = { isSoloRegistered: false, isTeamRegistered: false };
          }
        }
        setStatusMap(map);
      } else {
        setStatusMap({});
      }
    } catch (e) {
      console.error(e);
      alert("Failed to load tournaments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const doSolo = async (t) => {
    try {
      if (statusMap[t._id]?.isSoloRegistered) {
        await unregisterSolo(t._id, token);
      } else {
        await registerSolo(t._id, token);
      }
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Action failed");
    }
  };

  const doTeam = async (t) => {
    try {
      if (statusMap[t._id]?.isTeamRegistered) {
        await unregisterTeam(t._id, token);
      } else {
        await registerTeam(t._id, token);
      }
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Action failed");
    }
  };

  return (
    <>
      <style>{`
        .tp-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 16px 56px;
        }
        .tp-header { margin-bottom: 10px; }
        .tp-title {
          margin: 0 0 6px;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 800;
          letter-spacing: .3px;
        }
        .tp-sub { margin: 0 0 22px; opacity: .7; }
        .tp-empty { text-align: center; opacity: .8; padding: 48px 0; }

        .tour-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 20px;
        }

        .tour-card {
          grid-column: span 12;
          background: var(--app-panel);
          border: 1px solid #23263a;
          border-radius: 14px;
          padding: 18px 18px 16px;
          box-shadow: 0 8px 22px rgba(0,0,0,.45);
        }
        @media (min-width: 680px)  { .tour-card { grid-column: span 6; } }
        @media (min-width: 1024px) { .tour-card { grid-column: span 4; } }

        .tour-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 10px;
        }
        .tour-title { margin: 0; font-size: 18px; font-weight: 700; }
        .tour-badge {
          font-size: 12px;
          line-height: 1;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #2b2f48;
          background: #101426;
          text-transform: uppercase;
          letter-spacing: .06em;
          opacity: .9;
        }
        .tour-badge.upcoming { color: #e2e8f0; }
        .tour-badge.live     { color: #22c55e; border-color: #1e9d4b; background:#0c1a14; }
        .tour-badge.completed{ color: #a8b3cf; }

        .tour-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 16px;
          margin-bottom: 14px;
          font-size: 14px;
          opacity: .95;
        }
        .meta-label { opacity: .65; margin-right: 6px; }

        .tour-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 480px) { .tour-actions { grid-template-columns: 1fr; } }

        .btn-neon {
          position: relative;
          display: inline-block;
          text-align: center;
          padding: 10px 14px;
          font-weight: 700;
          border-radius: 10px;
          text-decoration: none;
          color: #e6e6e6;
          background: #0b0b0b;
          border: 1px solid #2b2b2b;
          transition: transform .06s ease, background .15s ease, color .15s ease, box-shadow .15s ease;
          overflow: hidden;
        }
        .btn-neon::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(90deg, #ffffff, #9ca3af, #ffffff);
          background-size: 200% 100%;
          animation: tp-neon-scan 2.8s linear infinite;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          opacity: .85;
        }
        .btn-neon:hover { transform: translateY(-1px); box-shadow: 0 0 16px rgba(209,213,219,.2); }
        @keyframes tp-neon-scan { from { background-position: 0% 0; } to { background-position: 200% 0; } }

        .btn-primary { background:#166534; color:#fff; }
        .btn-primary:hover { background:#238636; }
        .btn-ghost   { background:#0b0b0b; color:#e6e6e6; }
        .btn-danger  { background:#3b0d0d; color:#fff; border-color:#4c1111; }
        .btn-danger:hover { background:#5e1515; }
      `}</style>

      <div className="tp-page">
        <div className="tp-header">
          <h1 className="tp-title">Tournaments</h1>
          <p className="tp-sub">Explore upcoming events and manage your registrations.</p>
        </div>

        <div style={{ margin: "0 0 18px 0" }}>
          <AdSlot category="TournamentPage" />
        </div>

        {loading && <div className="tp-empty">Loading…</div>}
        {!loading && list.length === 0 && <div className="tp-empty">No tournaments.</div>}

        {!loading && list.length > 0 && (
          <div className="tour-grid">
            {list.map((t) => {
              const s = statusMap[t._id] || { isSoloRegistered: false, isTeamRegistered: false };

              const soloUsed = t.soloCount ?? (t.soloPlayers ? t.soloPlayers.length : 0);
              const teamUsed = t.teamCount ?? (t.teams ? t.teams.length : 0);

              const soloLeft = t.playerLimit > 0 ? Math.max(0, t.playerLimit - (soloUsed || 0)) : null;
              const teamLeft = t.teamLimit > 0 ? Math.max(0, t.teamLimit - (teamUsed || 0)) : null;

              return (
                <article key={t._id} className="tour-card">
                  <header className="tour-head">
                    <h3 className="tour-title">{t.title}</h3>
                    <span className={`tour-badge ${(t.status || "Upcoming").toLowerCase()}`}>
                      {t.status || "Upcoming"}
                    </span>
                  </header>

                  <div className="tour-meta">
                    <div><span className="meta-label">Game:</span>{t.game}</div>
                    <div><span className="meta-label">Format:</span>{t.bracket}</div>
                    <div><span className="meta-label">Reg. deadline:</span>{fmt(t.registrationDeadline)}</div>
                    <div><span className="meta-label">Start:</span>{fmt(t.startDate)}</div>
                    <div><span className="meta-label">Teams:</span>{t.teamLimit > 0 ? `${teamUsed} cap (${teamLeft} left)` : "—"}</div>
                    <div><span className="meta-label">Solo:</span>{t.playerLimit > 0 ? `${soloUsed} cap (${soloLeft} left)` : "—"}</div>
                  </div>

                  <div className="tour-actions">
                    <Link to={`/tournaments/${t._id}/bracket`} className="btn-neon btn-ghost">
                      View Bracket
                    </Link>

                    {user && (
                      <>
                        {t.playerLimit > 0 && (
                          <button className="btn-neon btn-primary" onClick={() => doSolo(t)}>
                            {s.isSoloRegistered ? "Unregister Solo" : "Register Solo"}
                          </button>
                        )}

                        {t.teamLimit > 0 && (
                          <button
                            className={`btn-neon ${s.isTeamRegistered ? "btn-danger" : "btn-primary"}`}
                            onClick={() => doTeam(t)}
                          >
                            {s.isTeamRegistered ? "Unregister Team" : "Register Team"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
