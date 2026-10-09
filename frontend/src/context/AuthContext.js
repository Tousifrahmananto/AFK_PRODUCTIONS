import React, { createContext, useCallback, useState, useEffect, useRef } from "react";
import { API_BASE } from "../services/apiConfig";

export const AuthContext = createContext();

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const verification = useRef(null);

    const logout = useCallback(() => {
        verification.current?.abort();
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
        setLoading(false);
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        verification.current = controller;
        const storedToken = localStorage.getItem("token");
        if (!storedToken) { logout(); return; }
        // Browser storage is a cache; only the API can establish identity and role.
        fetch(API_BASE + "/auth/me", {
            headers: { Authorization: "Bearer " + storedToken },
            signal: controller.signal,
            cache: "no-store",
        }).then(async response => {
            if (!response.ok) throw new Error("Session verification failed");
            const { user: currentUser } = await response.json();
            if (!currentUser?._id || !currentUser.role) throw new Error("Invalid session");
            if (controller.signal.aborted) return;
            localStorage.setItem("user", JSON.stringify(currentUser));
            setUser(currentUser);
            setToken(storedToken);
            setLoading(false);
        }).catch(() => { if (!controller.signal.aborted) logout(); });
        return () => controller.abort();
    }, [logout]);

    useEffect(() => {
        if (!token) return;
        try {
            const { exp } = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
            if (!exp) return;
            const timer = setTimeout(logout, Math.max(0, exp * 1000 - Date.now()));
            return () => clearTimeout(timer);
        } catch { /* Session identity is validated by the API, never by this expiry timer. */ }
    }, [token, logout]);

    const login = (userData, jwt) => {
        verification.current?.abort();
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", jwt);
        setUser(userData);
        setToken(jwt);
        setLoading(false);
    };

    return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}
