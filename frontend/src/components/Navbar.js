import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { io as socketIO } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const AX = axios.create({ baseURL: API });

export default function Navbar() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const socketRef = useRef(null);

  const authCfg = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token]
  );

  useEffect(() => {
    if (!token || !user) return;

    const s = socketIO(API, { withCredentials: true, transports: ["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      const uid = user.userId || user._id;
      if (uid) s.emit("identify", { userId: String(uid) });
    });

    s.on("notify", (n) => {
      setUnread((u) => u + 1);
      setItems((prev) => [n, ...prev].slice(0, 20));
    });

    return () => {
      try {
        s.off("notify");
        s.disconnect();
      } catch { }
    };
  }, [token, user]);

  useEffect(() => {
    if (!token) {
      setUnread(0);
      setItems([]);
      return;
    }
    AX.get("/api/notifications/unread-count", authCfg)
      .then((r) => setUnread(r.data?.count || 0))
      .catch(() => setUnread(0));
  }, [token, authCfg]);

  useEffect(() => {
    if (!open || !token) return;
    AX.get("/api/notifications", authCfg)
      .then((r) => setItems(r.data || []))
      .catch(() => { });
  }, [open, token, authCfg]);

  const markAllRead = async () => {
    try {
      await AX.post("/api/notifications/read-all", {}, authCfg);
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { }
  };

  const openItem = async (n) => {
    try {
      if (!n.read) {
        await AX.post(`/api/notifications/${n._id}/read`, {}, authCfg);
        setUnread((u) => Math.max(0, u - 1));
        setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      }
    } catch { }
    if (n.link) navigate(n.link);
  };

  const role = user?.role;
  const leftLinks = useMemo(() => {
    const base = [
      { to: "/tournaments", label: "Tournaments" },
      { to: "/browse", label: "Browse" },
      { to: "/leaderboard", label: "Leaderboard" },
    ];

    if (role === "Admin") {
      base.push({ to: "/admin/create-tournament", label: "Create Tournament" });
      base.push({ to: "/ads/mine", label: "Manage Ads" });
      base.push({ to: "/admin/user-moderation", label: "User Moderation" });
    }
    if (role === "TeamManager") {
      base.push({ to: "/create-team", label: "Create Team" });
      base.push({ to: "/my-team", label: "My Team" });
    }
    if (role === "Sponsor" || role === "Partner") {
      base.push({ to: "/ads/mine", label: "My Ads" });
    }
    return base;
  }, [role]);

  const isAuthPage = pathname === "/login" || pathname === "/register";
  if (isAuthPage) return null;

  return (
    <header className="nav-wrap">
      <nav className="nav">
        <div className="left">
          <Link to="/dashboard" className="brand">AFK Productions</Link>
          {leftLinks.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
          <NavLink
            to="/media"
            style={({ isActive }) => ({
              color: '#e6edf3',
              textDecoration: 'none',
              marginRight: 14,
              fontWeight: isActive ? 800 : 400,
            })}
          >
            Media
          </NavLink>
        </div>

        <div className="right">
          {user ? (
            <>
              <div className="notif">
                <button
                  type="button"
                  className="bell"
                  onClick={() => setOpen((v) => !v)}
                  title="Notifications"
                >
                  <span className="bell-icon">🔔</span>
                  {unread > 0 && <span className="badge">{unread}</span>}
                </button>
                {open && (
                  <div className="dropdown">
                    <div className="dropdown-header">
                      <span>Notifications</span>
                      <button className="link" onClick={markAllRead}>Mark all read</button>
                    </div>
                    <div className="dropdown-body">
                      {items.length === 0 ? (
                        <div className="empty">No notifications</div>
                      ) : (
                        items.map((n) => (
                          <button
                            key={n._id}
                            className={`notif-item ${n.read ? "read" : "unread"}`}
                            onClick={() => openItem(n)}
                          >
                            <div className="title">{n.title || "Notification"}</div>
                            <div className="msg">{n.message}</div>
                            <div className="time">{new Date(n.createdAt).toLocaleString()}</div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link to="/profile">My Profile</Link>
              <button className="logout" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </nav>

      <style>{`
        .nav-wrap{position:sticky;top:0;z-index:50;background:#0d0f15;border-bottom:1px solid #23263a}
        .nav{max-width:1200px;margin:0 auto;padding:10px 16px;display:flex;align-items:center;justify-content:space-between}
        .left a,.right a{color:#e6edf3;text-decoration:none;margin-right:14px}
        .brand{font-weight:800}
        .right{display:flex;align-items:center;gap:12px}
        .logout{background:#1f6feb;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer}

        .notif{position:relative}
        .bell{position:relative;background:#161b22;color:#e6edf3;border:1px solid #30363d;border-radius:10px;padding:6px 10px;cursor:pointer}
        .bell-icon{font-size:16px;line-height:1}
        .badge{position:absolute;top:-6px;right:-6px;background:#098658;color:#fff;border-radius:999px;font-size:10px;padding:2px 6px}

        .dropdown{position:absolute;right:0;top:38px;width:320px;background:#0d1117;border:1px solid #30363d;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.45);overflow:hidden}
        .dropdown-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #21262d;color:#c9d1d9}
        .dropdown-header .link{background:none;border:0;color:#58a6ff;cursor:pointer}
        .dropdown-body{max-height:360px;overflow:auto}
        .empty{padding:12px;color:#8b949e}
        .notif-item{display:block;width:100%;text-align:left;background:#0d1117;border:0;border-bottom:1px solid #161b22;padding:10px 12px;cursor:pointer}
        .notif-item.unread{background:#0e141a}
        .notif-item:hover{background:#0f1620}
        .notif-item .title{color:#e6edf3;font-weight:600;margin-bottom:2px}
        .notif-item .msg{color:#9aa4ad;font-size:13px}
        .notif-item .time{color:#6e7681;font-size:12px;margin-top:4px}
      `}</style>
    </header>
  );
}
