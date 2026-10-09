import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export function RequireAuth({ children }) {
    const { user, token, loading } = useContext(AuthContext) || {};
    const location = useLocation();
    if (loading) return <p role="status" style={{ padding: 24 }}>Verifying your session…</p>;
    if (!user || !token) return <Navigate to="/login" replace state={{ from: location }} />;
    if (user.mustChangePassword && location.pathname !== '/change-password') return <Navigate to="/change-password" replace />;
    return children;
}

export function RequireRole({ roles, children }) {
    const { user } = useContext(AuthContext) || {};
    return <RequireAuth>{roles.includes(user?.role) ? children : <Navigate to="/" replace />}</RequireAuth>;
}

export function RequireAdmin({ children }) {
    return <RequireRole roles={["Admin"]}>{children}</RequireRole>;
}

export function GuestOnly({ children }) {
    const { user, token, loading } = useContext(AuthContext) || {};
    if (loading) return <p role="status" style={{ padding: 24 }}>Verifying your session…</p>;
    return user && token ? <Navigate to={user.mustChangePassword ? '/change-password' : '/tournaments'} replace /> : children;
}
