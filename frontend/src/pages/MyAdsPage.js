import PrivateMedia from "../components/PrivateMedia";
import React, { useEffect, useState } from "react";
import { listMyAds, createAd, deleteAd } from "../services/adService";

const CATEGORIES = ["Homepage", "Tournament", "Gallery", "Sidebar", "Header"];
const STATUSES = ["Draft", "Active", "Paused", "Ended"];

export default function MyAdsPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: "",
    category: "Homepage",
    gameFilter: "",
    tournament: "",
    imageUrl: "",
    linkUrl: "",
    startDate: "",
    endDate: "",
    status: "Draft",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await listMyAds();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("load ads error:", err);
      alert("Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!form.title.trim()) {
        alert("Title is required");
        return;
      }
      if (!form.startDate || !form.endDate) {
        alert("Please set a start and end date");
        return;
      }
      await createAd(form);
      await load();
      setForm((f) => ({ ...f, title: "", imageUrl: "", linkUrl: "" }));
      alert("Ad created");
    } catch (err) {
      console.error("create ad error:", err);
      alert("Failed to create ad");
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this ad?")) return;
    try {
      await deleteAd(id);
      await load();
    } catch (err) {
      console.error("delete ad error:", err);
      alert("Delete failed");
    }
  };

  return (
    <div style={{ padding: 16, color: "#e8ecf2", background: "#0f1115", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: 12 }}>My Ad Campaigns</h2>

      <div
        style={{
          background: "#151922",
          border: "1px solid #232838",
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
          <input
            name="title"
            placeholder="Campaign title"
            value={form.title}
            onChange={onChange}
            required
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <select name="category" value={form.category} onChange={onChange}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              name="gameFilter"
              placeholder="Game filter (optional)"
              value={form.gameFilter}
              onChange={onChange}
            />
            <input
              name="tournament"
              placeholder="Tournament ID (optional)"
              value={form.tournament}
              onChange={onChange}
            />
          </div>

          <input
            name="imageUrl"
            placeholder="Banner image URL"
            value={form.imageUrl}
            onChange={onChange}
          />
          <input
            name="linkUrl"
            placeholder="Click-through link URL"
            value={form.linkUrl}
            onChange={onChange}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <input type="date" name="startDate" value={form.startDate} onChange={onChange} />
            <input type="date" name="endDate" value={form.endDate} onChange={onChange} />
            <select name="status" value={form.status} onChange={onChange}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={{ padding: "10px 12px", borderRadius: 8 }}>
            Create
          </button>
        </form>
      </div>

      <h3 style={{ marginBottom: 8 }}>Your Campaigns</h3>

      {loading ? (
        <div style={{ opacity: 0.8 }}>Loading…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {list.map((ad) => (
            <div
              key={ad._id}
              style={{
                background: "#151922",
                border: "1px solid #232838",
                borderRadius: 12,
                padding: 10,
              }}
            >
              <div style={{ fontWeight: 700 }}>{ad.title}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                {ad.category} · {ad.status}
              </div>

              {ad.imageUrl && (
                <PrivateMedia
                  src={ad.imageUrl}
                  alt=""
                  style={{ width: "100%", marginTop: 6, borderRadius: 8 }}
                />
              )}

              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                Flight: {(ad.startDate || "").slice(0, 10)} → {(ad.endDate || "").slice(0, 10)}
              </div>

              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Impressions: {ad.impressions ?? 0} · Clicks: {ad.clicks ?? 0}
              </div>

              <button onClick={() => onDelete(ad._id)} style={{ marginTop: 8 }}>
                Delete
              </button>
            </div>
          ))}
          {list.length === 0 && <div style={{ opacity: 0.7 }}>No campaigns yet.</div>}
        </div>
      )}
    </div>
  );
}
