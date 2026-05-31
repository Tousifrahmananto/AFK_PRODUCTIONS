import axios from "axios";
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export async function getPlayersLeaderboard({ tournamentId, limit = 100 } = {}) {
    const params = {};
    if (tournamentId) params.tournament = tournamentId;
    if (limit) params.limit = limit;
    const res = await axios.get(`${API}/leaderboard/players`, { params });
    return res.data;
}
