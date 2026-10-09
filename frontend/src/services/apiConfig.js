export const API_ORIGIN = (process.env.REACT_APP_API_URL || "http://localhost:5000")
    .replace(/\/+$/, "").replace(/\/api$/i, "");
export const API_BASE = `${API_ORIGIN}/api`;
