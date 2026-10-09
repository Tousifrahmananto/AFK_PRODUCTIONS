import React, { useEffect, useState } from "react";
import { getPlayersLeaderboard } from "../services/leaderboardService";

export default function LeaderboardPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState({ tournamentId: "", limit: 100 });

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const data = await getPlayersLeaderboard(query);
                setItems(data.items || []);
            } catch {
                setItems([]);
            } finally {
                setLoading(false);
            }
        })();
    }, [query]);

    return (
        <div style={wrap}>
            <div style={panel}>
                <h2 style={{ margin: 0 }}>Players Leaderboard</h2>

                <div style={card}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                            placeholder="Tournament ID (optional)"
                            value={query.tournamentId}
                            onChange={(e) => setQuery(q => ({ ...q, tournamentId: e.target.value.trim() }))}
                            style={input}
                        />
                        <select
                            value={query.limit}
                            onChange={(e) => setQuery(q => ({ ...q, limit: e.target.value }))}
                            style={input}
                        >
                            {[25, 50, 100, 200].map(n => <option key={n} value={n}>Top {n}</option>)}
                        </select>
                    </div>
                </div>

                <div style={card}>
                    {loading ? (
                        <div>Loading…</div>
                    ) : items.length === 0 ? (
                        <div>No data yet.</div>
                    ) : (
                        <div className="table-wrap">
                            <table style={table}>
                                <thead>
                                    <tr>
                                        <th style={th}>#</th>
                                        <th style={th}>Player</th>
                                        <th style={th}>Score</th>
                                        <th style={th}>Kills</th>
                                        <th style={th}>Deaths</th>
                                        <th style={th}>Assists</th>
                                        <th style={th}>KD</th>
                                        <th style={th}>KDA</th>
                                        <th style={th}>Entries</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((r, i) => (
                                        <tr key={r.userId}>
                                            <td style={td}>{i + 1}</td>
                                            <td style={td}>{r.username}</td>
                                            <td style={td}>{r.totalScore}</td>
                                            <td style={td}>{r.kills}</td>
                                            <td style={td}>{r.deaths}</td>
                                            <td style={td}>{r.assists}</td>
                                            <td style={td}>{Number(r.kd).toFixed(2)}</td>
                                            <td style={td}>{Number(r.kda).toFixed(2)}</td>
                                            <td style={td}>{r.entries}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
        .table-wrap{ overflow:auto; border-radius:10px; border:1px solid #232838 }
      `}</style>
        </div>
    );
}

const wrap = { minHeight: "100vh", background: "var(--app-bg)", color: "#e8ecf2", padding: 16, display: "flex", justifyContent: "center" };
const panel = { width: "100%", maxWidth: 1100, display: "grid", gap: 12 };
const card = { background: "var(--app-panel)", border: "1px solid #232838", borderRadius: 12, padding: 12 };
const input = { padding: "10px 12px", borderRadius: 10, background: "var(--app-input)", border: "1px solid #232838", color: "#e8ecf2" };
const table = { width: "100%", borderCollapse: "collapse", background: "var(--app-input)" };
const th = { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #232838", background: "#111629", position: "sticky", top: 0 };
const td = { padding: "10px 12px", borderBottom: "1px solid #232838" };
