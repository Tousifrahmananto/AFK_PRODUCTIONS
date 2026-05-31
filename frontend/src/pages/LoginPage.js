import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginUser } from "../services/authService";
import { AuthContext } from "../context/AuthContext";

const LoginPage = () => {
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: "", password: "" });

    const handleChange = (e) =>
        setCredentials({ ...credentials, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await loginUser(credentials);
            login(res.user, res.token);
            navigate(`/profile/${res.user._id}`);
        } catch (err) {
            alert(err.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="container">
            <div className="card">
                <img src="/logo.png" alt="AFK Logo" className="logo" />
                <h2>Sign in to AFK Productions</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
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
