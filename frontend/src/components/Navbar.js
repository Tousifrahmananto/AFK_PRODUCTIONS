import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { io as socketIO } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

import { API_ORIGIN as API } from "../services/apiConfig";
const AX = axios.create({ baseURL: API });

export default function Navbar() {
  const { user, token, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const headerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    setOpen(false);
    headerRef.current?.querySelectorAll("details").forEach(detail => { detail.open = false; });
  }, [pathname]);

  useEffect(() => {
    const closeMenus = event => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && headerRef.current?.contains(event.target)) return;
      setOpen(false);
      setMenuOpen(false);
      headerRef.current?.querySelectorAll("details").forEach(detail => {
        if (detail.open && event.type === "keydown") detail.querySelector("summary")?.focus();
        detail.open = false;
      });
      if (event.type === "keydown" && menuOpen) menuRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, [menuOpen]);

  const authCfg = useMemo(
    () => (token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    [token]
  );

  useEffect(() => {
    if (!token || !user) return;

    const s = socketIO(API, { auth: { token }, withCredentials: true, transports: ["websocket"] });

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
  const manageLinks = useMemo(() => {
    const base = [];

    if (role === "Admin") {
      base.push({ to: "/admin/create-tournament", label: "Create Tournament" });
      base.push({ to: "/ads/mine", label: "Manage Ads" });
      base.push({ to: "/admin/user-moderation", label: "User Moderation" });
      base.push({ to: "/admin/media", label: "Manage Media" });
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
    <header className="afk-header" ref={headerRef}>
      <nav className="afk-nav" aria-label="Main navigation">
        <Link to="/dashboard" className="afk-brand" aria-label="AFK Productions home"><span className="afk-brand-mark" aria-hidden="true">AFK</span><span>AFK <span className="afk-brand-sub">Productions</span></span></Link>
        <button ref={menuRef} type="button" className="afk-menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="afk-navigation" onClick={() => setMenuOpen(value => !value)}><span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span></button>
        <div id="afk-navigation" className={"afk-nav-links " + (menuOpen ? "is-open" : "")}>
          {[
            { to: "/tournaments", label: "Tournaments" },
            { to: "/browse", label: "Browse" },
            { to: "/leaderboard", label: "Leaderboard" },
            { to: "/media", label: "Media" },
          ].map(link => <NavLink key={link.to} to={link.to} className={({ isActive }) => "afk-nav-link" + (isActive ? " is-active" : "")}>{link.label}</NavLink>)}
          {manageLinks.length > 0 && <details className="afk-manage">
            <summary className={"afk-nav-link" + (manageLinks.some(link => pathname === link.to) ? " is-active" : "")}>{role === "Admin" ? "Admin tools" : "Manage"}<span aria-hidden="true">⌄</span></summary>
            <div className="afk-manage-panel"><span className="afk-menu-caption">{role === "Admin" ? "Administration" : "Your workspace"}</span>
              {manageLinks.map(link => <NavLink key={link.to} to={link.to} className="afk-manage-link">{link.label}</NavLink>)}
            </div>
          </details>}
        </div>
        <div className={"afk-nav-account " + (menuOpen ? "is-open" : "")}>
          {user ? <>
            <div className="afk-notif">
              <button type="button" className="afk-bell" onClick={() => setOpen(value => !value)} aria-label={unread > 0 ? "Notifications, " + unread + " unread" : "Notifications"} aria-expanded={open} aria-controls="afk-notifications">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
                {unread > 0 && <span className="afk-badge">{unread > 99 ? "99+" : unread}</span>}
              </button>
              {open && <div id="afk-notifications" className="afk-notifications">
                <div className="afk-notifications-heading"><strong>Notifications</strong><button type="button" onClick={markAllRead}>Mark all read</button></div>
                <div className="afk-notifications-body">
                  {items.length === 0 ? <div className="afk-notifications-empty">You’re all caught up.</div> : items.map(n => <button type="button" key={n._id} className={"afk-notification" + (n.read ? "" : " is-unread")} onClick={() => openItem(n)}>
                    <strong>{n.title || "Notification"}</strong><span>{n.message}</span><time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString()}</time>
                  </button>)}
                </div>
                <Link to="/notifications" className="afk-notifications-all">View all notifications →</Link>
              </div>}
            </div>
            <Link to="/profile" className="afk-profile" aria-label="My Profile"><span className="afk-avatar" aria-hidden="true">{(user.username || "P").slice(0, 1).toUpperCase()}</span><span className="afk-profile-text"><strong>{user.username || "My Profile"}</strong><small>{role === "TeamManager" ? "Team Manager" : role}</small></span></Link>
            <button type="button" className="afk-logout" onClick={logout}>Log out</button>
          </> : <><Link to="/login" className="afk-signin">Log in</Link><Link to="/register" className="afk-join">Join AFK <span aria-hidden="true">↗</span></Link></>}
        </div>
      </nav>
    </header>
  );
}
