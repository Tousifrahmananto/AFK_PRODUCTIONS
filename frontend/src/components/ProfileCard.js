import React from "react";

export default function ProfileCard({ user, myTournaments = [] }) {
  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");
  const teamName = user.team?.teamName || user.team?.name || "N/A";

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h2 style={styles.name}>{user.username || user.name}</h2>

        {(user.email || user.contactEmail) && <p><strong>{user.email ? 'Email' : 'Delivery email'}:</strong> {user.email || user.contactEmail}</p>}
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Country:</strong> {user.country || "N/A"}</p>
        <p><strong>Team:</strong> {teamName}</p>

        <p><strong>K/D Ratio:</strong> {user.stats?.kdr ?? "N/A"}</p>
        <p><strong>Win Rate:</strong> {user.stats?.winRate ?? "N/A"}</p>

        <div style={{ marginTop: 18 }}>
          <p><strong>Tournaments:</strong></p>
          {myTournaments.length === 0 ? (
            <p>None</p>
          ) : (
            <ul>
              {myTournaments.map((t) => (
                <li key={t._id}>
                  <span style={{ fontWeight: 600 }}>{t.title}</span>{" "}
                  <span style={{ opacity: 0.8 }}>({t.mode})</span> • {t.game} • {t.bracket} • starts {fmt(t.startDate)} • status {t.status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", justifyContent: "center", padding: "40px 16px" },
  card: {
    width: "min(900px, 96%)",
    background: "#141821",
    border: "1px solid #1f2430",
    borderRadius: 14,
    padding: 24,
    color: "#E6EDF3",
    boxShadow: "0 18px 48px rgba(0,0,0,.45)",
  },
  name: { textAlign: "center", marginTop: 0 },
};
