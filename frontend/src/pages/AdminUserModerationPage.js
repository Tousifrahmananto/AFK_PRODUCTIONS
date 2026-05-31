import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
    adminListUsers,
    adminBanUser,
    adminUnbanUser,
} from "../services/userService";

export default function AdminUserModerationPage() {
    const { user, token } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [q, setQ] = useState("");
    const [role, setRole] = useState("All");
    const [onlyBanned, setOnlyBanned] = useState(false);
    const [error, setError] = useState("");

    const isAdmin = user?.role === "Admin";

    const load = async () => {
        setLoading(true);
        setError("");
        try {
            const list = await adminListUsers(
                {
                    q,
                    role,
                    bannedOnly: String(onlyBanned),
                },
                token
            );
            setUsers(list || []);
        } catch (e) {
            console.error(e);
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token && isAdmin) load();
    }, [token, isAdmin]);

    useEffect(() => {
        if (!loading && isAdmin) load();
    }, [q, role, onlyBanned]);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return (users || []).filter((u) => {
            if (role !== "All" && u.role !== role) return false;
            if (onlyBanned && !u.banned && !u.isBanned) return false;
            if (term) {
                const hay = `${u.username || ""} ${u.name || ""} ${u.email || ""}`.toLowerCase();
                if (!hay.includes(term)) return false;
            }
            return true;
        });
    }, [users, q, role, onlyBanned]);

    const doBan = async (id) => {
        const reason = window.prompt("Reason for soft-ban (optional):", "");
        try {
            await adminBanUser(id, token, reason || "");
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || "Failed to ban user");
        }
    };

    const doUnban = async (id) => {
        try {
            await adminUnbanUser(id, token);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || "Failed to unban user");
        }
    };

    if (!isAdmin) return <div style={wrap}>Forbidden: Admins only.</div>;

    return (
        <div style={wrap}>
            <style>{`
        .box{ background:#151922; border:1px solid #232838; border-radius:14px; padding:14px; max-width:1100px; width:100%;}
        .hdr{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
        .grid{ display:grid; grid-template-columns: 1.8fr 1.6fr 1.2fr .8fr .8fr .8fr; gap:8px; align-items:center; }
        .head{ color:#9aa3b2; font-size:12px; }
        input,select{ width:100%; background:#0f1320; border:1px solid #232838; color:#e8ecf2; border-radius:10px; padding:9px 11px; }
        .pill{ padding:4px 8px; border-radius:999px; font-size:12px; border:1px solid #2a3350; background:#101523; color:#c7d0e3 }
        .ban{ background:#5b1920; border:1px solid #74212a; color:#fff; border-radius:10px; padding:8px 10px; cursor:pointer; }
        .unban{ background:#165b2d; border:1px solid #1d7a3b; color:#fff; border-radius:10px; padding:8px 10px; cursor:pointer; }
      `}</style>

            <div className="box">
                <div className="hdr">
                    <h2 style={{ margin: 0 }}>User Moderation</h2>
                    <div style={{ display: "flex", gap: 8 }}>
                        <input
                            placeholder="Search name, username, email…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            <option>All</option>
                            <option>Admin</option>
                            <option>Player</option>
                            <option>TeamManager</option>
                        </select>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#9aa3b2" }}>
                            <input
                                type="checkbox"
                                checked={onlyBanned}
                                onChange={(e) => setOnlyBanned(e.target.checked)}
                            />
                            Banned only
                        </label>
                    </div>
                </div>

                {loading && <div>Loading…</div>}
                {!loading && error && <div>{error}</div>}
                {!loading && !error && filtered.length === 0 && <div>No users found.</div>}

                {!loading && !error && filtered.length > 0 && (
                    <div className="grid" style={{ marginTop: 8 }}>
                        <div className="head">Name</div>
                        <div className="head">Email</div>
                        <div className="head">Username</div>
                        <div className="head">Role</div>
                        <div className="head">Status</div>
                        <div className="head">Action</div>

                        {filtered.map((u) => {
                            const isBanned = !!(u.banned ?? u.isBanned);
                            return (
                                <React.Fragment key={u._id}>
                                    <div>{u.name || "—"}</div>
                                    <div>{u.email || "—"}</div>
                                    <div>{u.username || "—"}</div>
                                    <div><span className="pill">{u.role}</span></div>
                                    <div>
                                        {isBanned ? (
                                            <span className="pill" style={{ background: "#2b1a1d", borderColor: "#5b2d35", color: "#f2c9cf" }}>
                                                Banned
                                            </span>
                                        ) : (
                                            <span className="pill" style={{ background: "#1a2b22", borderColor: "#2d5b45", color: "#c9f2de" }}>
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        {isBanned ? (
                                            <button className="unban" onClick={() => doUnban(u._id)}>Unban</button>
                                        ) : (
                                            <button className="ban" onClick={() => doBan(u._id)}>Ban</button>
                                        )}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

const wrap = {
    minHeight: "100vh",
    background: "#0f1115",
    color: "#e8ecf2",
    padding: "24px 12px",
    display: "flex",
    justifyContent: "center",
};
