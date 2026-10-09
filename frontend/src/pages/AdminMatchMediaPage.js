import PrivateMedia from "../components/PrivateMedia";
import React, { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
    listMatchMedia,
    uploadMatchMedia,
    deleteMatchMedia,
} from "../services/mediaService";

export default function AdminMatchMediaPage() {
    const { id: tournamentId } = useParams();
    const [sp] = useSearchParams();
    const r = Number(sp.get("r") || 0);
    const m = Number(sp.get("m") || 0);

    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [media, setMedia] = useState({ videos: [], images: [] });
    const [loading, setLoading] = useState(true);
    const [videoFiles, setVideoFiles] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [roundLabel] = useState(`Round ${r + 1}`);
    const [matchLabel] = useState(`Match ${m + 1}`);

    const header = useMemo(
        () => `${title || "Tournament"} — ${roundLabel} / ${matchLabel}`,
        [title, roundLabel, matchLabel]
    );

    async function load() {
        setLoading(true);
        try {
            const data = await listMatchMedia(tournamentId, r, m, token);
            setTitle(data?.title || "");
            setMedia(data?.media || { videos: [], images: [] });
        } catch (e) {
            const msg = e?.response?.data?.message || e.message || "Failed to load match media.";
            alert(msg);
            console.error("listMatchMedia error:", e);
        } finally {
            setLoading(false);
        }
    }


    useEffect(() => {
        load();
    }, [tournamentId, r, m, token]);

    async function handleUpload(kind) {
        try {
            const files = kind === "video" ? videoFiles : imageFiles;
            if (!files?.length) {
                alert("Please choose file(s) to upload.");
                return;
            }
            await uploadMatchMedia(tournamentId, r, m, kind, files, token);
            setVideoFiles([]);
            setImageFiles([]);
            await load();
        } catch (e) {
            console.error(e);
            alert("Upload failed.");
        }
    }

    async function handleDelete(kind, url) {
        if (!window.confirm("Remove this item?")) return;
        try {
            await deleteMatchMedia(tournamentId, r, m, kind, url, token);
            await load();
        } catch (e) {
            console.error(e);
            alert("Failed to remove media.");
        }
    }

    const styles = {
        wrap: { maxWidth: 1100, margin: "24px auto", padding: "0 12px" },
        h1: { fontSize: 22, fontWeight: 700, marginBottom: 8 },
        sub: { color: "#94a3b8", marginBottom: 18 },
        card: {
            background: "#0f172a",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
        },
        row: { display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" },
        btn: {
            background: "#2563eb",
            border: "none",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
        },
        btnGhost: {
            background: "transparent",
            border: "1px solid #334155",
            color: "#e2e8f0",
            padding: "8px 12px",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
        },
        sectionTitle: { marginBottom: 8, fontWeight: 700 },
        grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" },
        mediaCard: {
            border: "1px solid #1f2937",
            background: "#0b1220",
            borderRadius: 10,
            padding: 10,
        },
        label: { fontSize: 12, color: "#94a3b8", marginBottom: 6 },
        input: {
            background: "#0b1220",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            padding: "10px 12px",
            borderRadius: 10,
        },
    };

    return (
        <div style={styles.wrap}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                    <div style={styles.h1}>{header}</div>
                    <div style={styles.sub}>Upload & manage videos/images for this match.</div>
                </div>
                <button
                    style={styles.btnGhost}
                    onClick={() => navigate(-1)}
                    title="Back to bracket"
                >
                    ← Back
                </button>
            </div>

            {loading ? (
                <div style={styles.card}>Loading…</div>
            ) : (
                <>
                    <div style={styles.card}>
                        <div style={styles.sectionTitle}>Videos</div>
                        <div style={styles.row}>
                            <input
                                type="file"
                                multiple
                                accept="video/*"
                                onChange={(e) => setVideoFiles([...e.target.files])}
                                style={styles.input}
                            />
                            <button style={styles.btn} onClick={() => handleUpload("video")}>
                                Upload videos
                            </button>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div style={styles.label}>Current</div>
                            <div style={styles.grid}>
                                {media.videos?.length ? (
                                    media.videos.map((v) => (
                                        <div key={v.url} style={styles.mediaCard}>
                                            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                                                {v.originalName || v.url.split("/").pop()}
                                            </div>
                                            <PrivateMedia as="video"
                                                src={v.url}
                                                controls
                                                style={{ width: "100%", borderRadius: 8, background: "#111827" }}
                                            />
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                                                <button
                                                    style={styles.btnGhost}
                                                    onClick={() => handleDelete("video", v.url)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-muted">No videos yet.</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.sectionTitle}>Images</div>
                        <div style={styles.row}>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) => setImageFiles([...e.target.files])}
                                style={styles.input}
                            />
                            <button style={styles.btn} onClick={() => handleUpload("image")}>
                                Upload images
                            </button>
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div style={styles.label}>Current</div>
                            <div style={styles.grid}>
                                {media.images?.length ? (
                                    media.images.map((img) => (
                                        <div key={img.url} style={styles.mediaCard}>
                                            <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 14 }}>
                                                {img.originalName || img.url.split("/").pop()}
                                            </div>
                                            <PrivateMedia open
                                                src={img.url}
                                                alt={img.originalName || ""}
                                                style={{ width: "100%", borderRadius: 8, background: "#111827" }}
                                            />

                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                                                <button
                                                    style={styles.btnGhost}
                                                    onClick={() => handleDelete("image", img.url)}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-muted">No images yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
