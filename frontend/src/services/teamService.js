import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export async function listAllPlayers(token) {
    const res = await axios.get(`${API_BASE}/teams/players`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
}

export async function addPlayerToTeam(teamId, userId, token) {
    const res = await axios.post(
        `${API_BASE}/teams/${teamId}/add`,
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}
