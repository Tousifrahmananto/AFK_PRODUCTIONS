const API = process.env.REACT_APP_API_BASE || "http://localhost:5000/api";

function authHeaders() {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function listMyAds() {
    const res = await fetch(`${API}/ads/mine`, { headers: authHeaders() });
    return res.json();
}
export async function createAd(form) {
    const res = await fetch(`${API}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(form),
    });
    if (!res.ok) throw new Error("createAd failed");
    return res.json();
}
export async function deleteAd(id) {
    const res = await fetch(`${API}/ads/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("deleteAd failed");
    return res.json();
}

export async function getPlacement(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${API}/ads/placement?${q}`);
    return res.json();
}
export async function clickAd(id) {
    try {
        await fetch(`${API}/ads/${id}/click`, { method: "POST" });
    } catch { }
}
