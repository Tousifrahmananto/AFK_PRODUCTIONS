import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export function RequireAdmin({ children }) {
    const ctx = useContext(AuthContext) || {};
    const location = useLocation();

    const tokenFromCtx = ctx.token;
    const tokenFromLS = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const hasToken = Boolean(tokenFromCtx || tokenFromLS);

    if (!hasToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (!ctx.user) return null;
    if (ctx.user.role !== "Admin") {
        return <Navigate to="/" replace />;
    }

    return children;
}

export function RequireAuth({ children }) {
    const ctx = useContext(AuthContext) || {};
    const location = useLocation();

    const tokenFromCtx = ctx.token;
    const tokenFromLS = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    const hasToken = Boolean(tokenFromCtx || tokenFromLS);

    if (!hasToken) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    return children;
}
