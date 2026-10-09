import axios from "axios";

import { API_BASE as API } from "./apiConfig";

function authHeader(token) {
  const t = token || localStorage.getItem("token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function getAllTournaments(params = {}, token) {
  const res = await axios.get(`${API}/tournaments`, {
    params,
    headers: authHeader(token),
  });
  return res.data;
}

export async function createTournament(payload, token) {
  const res = await axios.post(`${API}/tournaments/create`, payload, {
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  return res.data;
}

export async function updateTournament(id, payload, token) {
  const res = await axios.put(`${API}/tournaments/${id}`, payload, {
    headers: { "Content-Type": "application/json", ...authHeader(token) },
  });
  return res.data;
}
export async function getTeamRoster(teamId, token) {
  const res = await axios.get(`${API}/teams/${teamId}`, {
    headers: authHeader(token),
  });
  return res.data;
}
export async function getUserProfile(userId, token) {
  const res = await axios.get(`${API}/users/${userId}`, {
    headers: authHeader(token),
  });
  return res.data;
}
export async function deleteTournament(id, token) {
  const res = await axios.delete(`${API}/tournaments/${id}`, {
    headers: authHeader(token),
  });
  return res.data;
}

export async function toggleRegistration(id, token) {
  const res = await axios.post(
    `${API}/tournaments/${id}/toggle-registration`,
    {},
    { headers: authHeader(token) }
  );
  return res.data;
}

export async function generateBracket(id, token) {
  const res = await axios.post(
    `${API}/tournaments/${id}/generate-bracket`,
    {},
    { headers: authHeader(token) }
  );
  return res.data;
}

export async function getBracketVisibility(id, token) {
  const res = await axios.get(`${API}/tournaments/${id}/bracket/visibility`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data;
}

export async function getBracket(id, token) {
  const res = await axios.get(`${API}/tournaments/${id}/bracket`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data;
}


export async function setMatchResult(id, payload, token) {
  const res = await axios.post(
    `${API}/tournaments/${id}/bracket/match-result`,
    payload,
    { headers: { "Content-Type": "application/json", ...authHeader(token) } }
  );
  return res.data;
}

export async function getMatchPlayerStats(tournamentId, roundIndex, matchIndex, token) {
  const res = await axios.get(
    `${API}/tournaments/${tournamentId}/matches/${roundIndex}/${matchIndex}/player-stats`,
    { headers: authHeader(token) }
  );
  return res.data;
}

export async function setMatchPlayerStats(tournamentId, roundIndex, matchIndex, stats, token, meta) {
  const body = meta ? { stats, meta } : { stats };
  const res = await axios.post(
    `${API}/tournaments/${tournamentId}/matches/${roundIndex}/${matchIndex}/player-stats`,
    body,
    { headers: { "Content-Type": "application/json", ...authHeader(token) } }
  );
  return res.data;
}

export async function getMyStatus(id, token) {
  const res = await axios.get(`${API}/tournaments/${id}/my-status`, {
    headers: authHeader(token),
  });
  return res.data;
}

export async function registerSolo(id, token) {
  const res = await axios.post(
    `${API}/tournaments/${id}/register-solo`,
    {},
    { headers: authHeader(token) }
  );
  return res.data;
}

export async function registerTeam(id, token) {
  const res = await axios.post(
    `${API}/tournaments/${id}/register-team`,
    {},
    { headers: authHeader(token) }
  );
  return res.data;
}

export async function unregisterSolo(id, token) {
  const headers = authHeader(token);
  try {
    const res = await axios.delete(`${API}/tournaments/${id}/unregister-solo`, { headers });
    return res.data;
  } catch {
    const res = await axios.post(`${API}/tournaments/${id}/unregister-solo`, {}, { headers });
    return res.data;
  }
}

export async function unregisterTeam(id, token) {
  const headers = authHeader(token);
  try {
    const res = await axios.delete(`${API}/tournaments/${id}/unregister-team`, { headers });
    return res.data;
  } catch {
    const res = await axios.post(`${API}/tournaments/${id}/unregister-team`, {}, { headers });
    return res.data;
  }
}
