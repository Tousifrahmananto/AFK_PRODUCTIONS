import axios from "axios";

import { API_BASE } from "./apiConfig";

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
