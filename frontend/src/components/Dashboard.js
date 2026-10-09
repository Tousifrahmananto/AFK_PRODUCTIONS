import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Dashboard.css";

export default function Dashboard() {
    const { user, token, loading } = useContext(AuthContext) || {};
    const signedIn = Boolean(user && token);
    return (
        <main className="afk-landing">
            <div className="landing-shell">
                <header className="landing-brandline">
                    <Link to="/dashboard" className="landing-brand" aria-label="AFK Productions home"><span>AFK</span> PRODUCTIONS</Link>
                    <span className="landing-brand-note">FOR THE LOVE OF THE GAME</span>
                </header>
                <section className="landing-hero" aria-labelledby="landing-title">
                    <div className="landing-copy">
                        <p className="landing-eyebrow"><span /> YOUR NEXT CHAPTER STARTS HERE</p>
                        <h1 id="landing-title">Stay AFK.<br />We handle<br /><em>the rest.</em></h1>
                        <p className="landing-description">Bring your team. Find your competition. From the first match to the final moment, AFK Productions keeps you in the game.</p>
                        <div className="landing-actions">
                            {loading ? <p role="status">Checking your session…</p> : <>
                                <Link className="landing-primary" to={signedIn ? "/tournaments" : "/register"}>{signedIn ? "Enter the arena" : "Join the arena"}<span aria-hidden="true">↗</span></Link>
                                <Link className="landing-secondary" to={signedIn ? "/profile" : "/login"}>{signedIn ? "My profile" : "Sign in"}<span aria-hidden="true">→</span></Link>
                            </>}
                        </div>
                        <p className="landing-access-note">Sign in to explore tournaments, teams, and match highlights.</p>
                    </div>
                    <div className="landing-visual" role="img" aria-label="Illustrated path from qualifying to becoming a champion. Demonstration only.">
                        <div className="landing-visual-top"><span>THE PATH TO VICTORY</span><span>AFK / PLAYBOOK</span></div>
                        <div className="landing-visual-word" aria-hidden="true">AFK</div>
                        <div className="landing-path" aria-hidden="true">
                            <div className="landing-stage"><span className="landing-round">01 / QUALIFY</span><div className="landing-match"><strong>YOUR TEAM</strong><span>CHALLENGER</span></div><div className="landing-match landing-match-muted"><span>CONTENDER</span><span>THE UNDERDOG</span></div></div>
                            <div className="landing-stage landing-stage-final"><span className="landing-round">02 / ADVANCE</span><div className="landing-match"><strong>THE FINALS</strong><span>MAKE IT COUNT</span></div></div>
                            <div className="landing-stage landing-stage-champion"><span className="landing-round">03 / CONQUER</span><div className="landing-champion"><span>★</span><strong>YOUR LEGACY</strong><small>STARTS HERE</small></div></div>
                        </div>
                        <div className="landing-visual-bottom"><span>PLAY. WIN. REPEAT.</span><span>BUILT FOR THE COMPETITION ↗</span></div>
                    </div>
                </section>
                <section className="landing-features" aria-label="Your game, all in one place">
                    <article><span className="landing-feature-number">01</span><div><h2>Find your arena.</h2><p>Discover tournaments and get your team ready for the next challenge.</p></div></article>
                    <article><span className="landing-feature-number">02</span><div><h2>Follow every round.</h2><p>Stay on top of brackets, match results, and the road to the final.</p></div></article>
                    <article><span className="landing-feature-number">03</span><div><h2>Make your mark.</h2><p>Track the leaderboard and relive the moments that matter.</p></div></article>
                </section>
                <footer className="landing-footer"><span>AFK PRODUCTIONS</span><span>LESS SETUP. MORE GAME.</span></footer>
            </div>
        </main>
    );
}
