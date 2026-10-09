import axios from "axios";
import { API_BASE as API } from "./apiConfig";

export async function getPlayersLeaderboard({ tournamentId, limit = 100 } = {}) {
    const params = {};
    if (tournamentId) params.tournament = tournamentId;
    if (limit) params.limit = limit;
    const res = await axios.get(`${API}/leaderboard/players`, {
        params, headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
    });
    return res.data;
}
