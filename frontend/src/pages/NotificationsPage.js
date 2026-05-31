import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import {
  getMyNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from "../services/notificationService";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const { token, user } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user || !token) return;
    setLoading(true);
    try {
      const data = await getMyNotifications(token);
      setItems(data);
    } catch (e) {
      alert("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const onRead = async (id) => {
    try { await markRead(id, token); await load(); } catch {}
  };
  const onReadAll = async () => {
    try { await markAllRead(token); await load(); } catch {}
  };
  const onDelete = async (id) => {
    try { await deleteNotification(id, token); await load(); } catch {}
  };

  if (!user) return <div className="container mt-8">Please log in.</div>;

  return (
    <div className="container mt-8">
      <style>{`
        .notif-card {
          background: #12131c;
          border: 1px solid #23263A;
          border-radius: 14px;
          padding: 16px;
        }
        .notif-unread {
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.25);
        }
        .notif-title { font-weight: 600; }
        .notif-meta { opacity: 0.7; font-size: 12px; }
        .notif-actions button {
          background: #1f2937;
          border: 1px solid #2f3348;
          color: #e5e7eb;
          border-radius: 10px;
          padding: 6px 10px;
          margin-left: 8px;
        }
        .notif-actions button:hover { filter: brightness(1.15); }
      `}</style>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <button className="btn" onClick={onReadAll}>Mark All Read</button>
      </div>

      {loading && <div>Loading…</div>}
      {!loading && items.length === 0 && <div>No notifications.</div>}

      <div className="grid gap-3">
        {items.map((n) => (
          <div key={n._id} className={`notif-card ${n.read ? "" : "notif-unread"}`}>
            <div className="notif-title">{n.title}</div>
            <div className="mt-1">{n.message}</div>
            <div className="notif-meta mt-1">
              {new Date(n.createdAt).toLocaleString()}
            </div>

            <div className="notif-actions mt-3">
              {!n.read && <button onClick={() => onRead(n._id)}>Mark Read</button>}
              <button onClick={() => onDelete(n._id)}>Delete</button>
              {n.link ? (
                <Link to={n.link} className="btn ml-2">Open</Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
