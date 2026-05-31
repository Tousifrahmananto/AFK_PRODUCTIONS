import axios from "axios";

const API = process.env.REACT_APP_API || "http://localhost:5000/api";

export async function fetchMedia(params = {}, token) {
    const res = await axios.get(`${API}/media`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
}

export async function createMedia({ file, fields = {} }, token) {
    const fd = new FormData();
    if (file) fd.append("file", file);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    const res = await axios.post(`${API}/media`, fd, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
}

export async function deleteMedia(id, token) {
    const res = await axios.delete(`${API}/media/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
}

export async function listVideos(token) {
    const res = await axios.get(`${API}/media/videos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
}

export async function createVideo(file, token) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await axios.post(`${API}/media/videos`, fd, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            "Content-Type": "multipart/form-data",
        },
    });
    return res.data;
}

export async function deleteVideo(id, token) {
    const res = await axios.delete(`${API}/media/videos/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.data;
}

export async function listMatchMedia(tournamentId, r, m, token) {
    const res = await axios.get(
        `${API}/tournaments/${tournamentId}/matches/${r}/${m}/media`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return res.data;
}

export async function uploadMatchMedia(tournamentId, r, m, kind, files, token) {
    const fd = new FormData();
    fd.append("kind", kind);
    for (const f of files) fd.append("files", f);
    const res = await axios.post(
        `${API}/tournaments/${tournamentId}/matches/${r}/${m}/media`,
        fd,
        {
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                "Content-Type": "multipart/form-data",
            },
        }
    );
    return res.data;
}

export async function deleteMatchMedia(tournamentId, r, m, kind, url, token) {
    const res = await axios.delete(
        `${API}/tournaments/${tournamentId}/matches/${r}/${m}/media`,
        {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            data: { kind, url },
        }
    );
    return res.data;
}
