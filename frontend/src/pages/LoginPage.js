import React, { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login as loginUser } from "../services/authService";
import { AuthContext } from "../context/AuthContext";

const LoginPage = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [credentials, setCredentials] = useState({ email: "", password: "" });

    const handleChange = (e) =>
        setCredentials({ ...credentials, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await loginUser(credentials);
            login(res.user, res.token);
            navigate(res.user.mustChangePassword ? '/change-password' : location.state?.from || "/tournaments", { replace: true });
        } catch (err) {
            alert(err.response?.data?.message || err.message || "Login failed");
        }
    };

    return (
        <div className="container">
            <div className="card">
                <img src="/logo.png" alt="AFK Logo" className="logo" />
                <h2>Sign in to AFK Productions</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        name="email"
                        placeholder="Email or team login ID"
                        aria-label="Email or team login ID"
                        autoComplete="username"
                        onChange={handleChange}
                        required
                        className="input"
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        onChange={handleChange}
                        required
                        className="input"
                    />
                    <button type="submit" className="btn">Log In</button>
                </form>
                <p className="text-center" style={{ marginTop: '1rem' }}>
                    Don't have an account? <a href="/register">Register</a>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
