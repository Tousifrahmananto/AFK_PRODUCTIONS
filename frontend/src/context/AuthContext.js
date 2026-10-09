import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);

    useEffect(() => {
        const u = localStorage.getItem("user");
        const t = localStorage.getItem("token");
        try {
            if (u && t) {
                setUser(JSON.parse(u));
                setToken(t);
            }
        } catch {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        }
    }, []);

    const login = (userData, jwt) => {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", jwt);
        setUser(userData);
        setToken(jwt);
    };

    const logout = () => {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
