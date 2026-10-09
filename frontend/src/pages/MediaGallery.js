import PrivateMedia from "../components/PrivateMedia";
// client/src/pages/MediaGallery.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { fetchMedia } from "../services/mediaService"; // GET /api/media

function computeApiOrigin() {
    const api = process.env.REACT_APP_API || process.env.REACT_APP_API_URL || "";
    if (api) return api.replace(/\/api\/?$/i, ""); // e.g. http://localhost:5000
    try {
        return window.location.origin.replace(":3000", ":5000");
    } catch {
        return "http://localhost:5000";
    }
}

export default function MediaGallery() {
    const { token } = useContext(AuthContext);
    const API_ORIGIN = useMemo(() => computeApiOrigin(), []);
    const toUrl = (p) => {
        if (!p) return "";
        if (/^https?:\/\//i.test(p)) return p; // already absolute (external/CDN)
        return `${API_ORIGIN}${p.startsWith("/") ? "" : "/"}${p}`;
    };

    const [items, setItems] = useState([]);
    const [q, setQ] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await fetchMedia({}, token);
                const list = Array.isArray(data) ? data : [];
                // normalize a preview URL for each item
                setItems(
                    list.map((m) => ({
                        ...m,
                        previewUrl: toUrl(m.filePath || m.externalUrl || ""),
                    }))
                );
            } catch (e) {
                console.error("fetchMedia error:", e);
                alert(e?.response?.data?.message || "Failed to load media");
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const filterList = (arr) => {
        const needle = q.trim().toLowerCase();
        if (!needle) return arr;
        return arr.filter((x) =>
            [
                x.title,
                x.description,
                Array.isArray(x.tags) ? x.tags.join(",") : x.tags,
                x.matchId,
            ]
                .join(" ")
                .toLowerCase()
                .includes(needle)
        );
    };

    const card = {
        background: "#121826",
        border: "1px solid #1f273a",
        borderRadius: 12,
        padding: 12,
    };

    return (
        <div style={{ padding: 24, color: "#e8ecf2", background: "#0f1115", minHeight: "100vh" }}>
            <h2 style={{ marginBottom: 8 }}>Media Showcase</h2>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <input
                    placeholder="Search title/description/tags…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{
                        background: "#111827",
                        border: "1px solid #1f2937",
                        borderRadius: 8,
                        color: "#e5e7eb",
                        padding: "10px 12px",
                        width: 320,
                    }}
                />
            </div>

            {filterList(items).length === 0 && <div style={{ opacity: 0.7 }}>No media yet.</div>}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 14,
                }}
            >
                {filterList(items).map((m) => (
                    <div key={m._id} style={card}>
                        <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                            {m.title || "Untitled"}
                            <span
                                style={{
                                    marginLeft: 6,
                                    fontSize: 12,
                                    fontWeight: 400,
                                    padding: "2px 6px",
                                    border: "1px solid #2a3350",
                                    borderRadius: 999,
                                    background: "#101523",
                                }}
                            >
                                {m.kind}
                            </span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                            {m.matchId ? `Match ${m.matchId.replace("r=", "R").replace("&m=", " · M")}` : "—"}
                        </div>

                        {/* Preview */}
                        {m.kind === "image" && m.previewUrl && (
                            <PrivateMedia
                                src={m.previewUrl}
                                alt={m.title}
                                title={m.previewUrl}
                                style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, background: "#0a0a0a" }}
                                onError={(e) => (e.currentTarget.style.opacity = "0.4")}
                            />
                        )}
                        {m.kind === "video" && m.previewUrl && (
                            <PrivateMedia as="video"
                                src={m.previewUrl}
                                controls
                                style={{ width: "100%", height: 180, objectFit: "cover", borderRadius: 8, background: "#000" }}
                                onError={(e) => (e.currentTarget.style.opacity = "0.4")}
                            />
                        )}

                        {m.externalUrl && (
                            <a href={m.externalUrl} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8 }}>
                                Open External
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
