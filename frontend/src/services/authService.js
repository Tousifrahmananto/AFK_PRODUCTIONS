import { API_BASE as API } from "./apiConfig";

export async function register({ username, email, password, role }) {
    const allowed = new Set(["Player", "Sponsor", "Partner"]);
    const safeRole = allowed.has(role) ? role : "Player";

    const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role: safeRole }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Registration failed");
    }
    return res.json();
}

export async function login({ email, password }) {
    const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Login failed");
    }
    return res.json();
}
