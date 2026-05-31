import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { listAllPlayers, addPlayerToTeam } from "../services/teamService";
import axios from "axios";

const PlayerListPage = () => {
    const { user, token } = useContext(AuthContext);
    const [players, setPlayers] = useState([]);
    const [team, setTeam] = useState(null);

    useEffect(() => {
        listAllPlayers(token).then(setPlayers).catch(console.error);

        axios
            .get("http://localhost:5000/api/teams/my", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setTeam(res.data))
            .catch(() => setTeam(null));
    }, [token]);

    if (user?.role !== "TeamManager") {
        return <div className="text-center mt-10">Access denied.</div>;
    }

    if (!team) {
        return <div className="text-center mt-10">Loading team…</div>;
    }

    const handleAdd = async (playerId) => {
        try {
            await addPlayerToTeam(team._id, playerId, token);
            alert("Player added!");
            setPlayers((prev) => prev.filter((p) => p._id !== playerId));
        } catch (err) {
            alert(err.response?.data?.message || "Failed to add player");
        }
    };

    return (
        <div className="container">
            <div className="card" style={{ maxWidth: 600, margin: "auto" }}>
                <h2>All Players</h2>
                {players.length === 0 ? (
                    <p>No players found.</p>
                ) : (
                    <ul>
                        {players.map((p) => (
                            <li
                                key={p._id}
                                className="flex justify-between items-center mb-2"
                            >
                                <span>{p.username} ({p.email})</span>
                                <button
                                    onClick={() => handleAdd(p._id)}
                                    className="btn btn-sm"
                                >
                                    Add to My Team
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default PlayerListPage;
