import React from "react";
import { Link } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const tagline = "Stay AFK We handle the Rest";
  const chars = tagline.length;

  return (
    <main className="afk-dashboard">
      <section className="afk-left">
        <img src="/logo.png" alt="AFK Productions" width="500" className="afk-logo" />
        <h1 className="afk-typewriter">
          <span className="afk-typewriter-text" style={{ "--chars": chars, marginLeft: "70px" }}>
            {tagline}
          </span>
        </h1>
      </section>

      <section className="afk-right">
        <div className="afk-actions">
          <Link to="/login" className="afk-btn afk-btn-wide">Login</Link>
          <Link to="/register" className="afk-btn afk-btn-wide">Register</Link>
        </div>
      </section>
    </main>
  );
}
