import { API_BASE as API } from "../services/apiConfig";
import React, { useContext, useState} from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function CreateTeamPage() {
    const { user, token } = useContext(AuthContext);
    const [teamName, setTeamName] = useState("");
    const [game, setGame] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [bio, setBio] = useState("");
    const [region, setRegion] = useState("");
    const [socials, setSocials] = useState({ website: "", discord: "", twitter: "", youtube: "" });
    const [maxMembers, setMaxMembers] = useState(5);
    const [visibility, setVisibility] = useState("public");

    const [captainId, setCaptainId] = useState("");
    const [initialMembersCSV, setInitialMembersCSV] = useState("");

    const navigate = useNavigate();


    if (user?.role !== "TeamManager") {
        return <div className="text-center mt-10">Access denied.</div>;
    }


    const submit = async (e) => {
        e.preventDefault();
        try {
            const initialMembers = initialMembersCSV
                .split(",")
                .map(x => x.trim())
                .filter(Boolean);

            await axios.post(
                `${API}/teams/create`,
                {
                    teamName,
                    game,
                    logoUrl,
                    bio,
                    region,
                    socials,
                    maxMembers: Number(maxMembers),
                    visibility,
                    captainId: captainId || undefined,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert("Team created!");
            navigate("/teams/my");
        } catch (err) {
            console.error("CreateTeamPage error:", err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                "Unknown error creating team";
            alert(msg);
        }
    };

    const onSocialChange = (k, v) => setSocials(prev => ({ ...prev, [k]: v }));

    return (
        <div className="container mt-10">
            <div
                className="card p-6"
                style={{ maxWidth: 600, margin: "auto", background: "#1f1f2e" }}
            >
                <h2 className="text-2xl font-bold mb-4 text-center">Create Team</h2>
                <form onSubmit={submit} className="space-y-4">
                    <input
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Team Name"
                        required
                        className="input"
                    />

                    <input
                        value={game}
                        onChange={(e) => setGame(e.target.value)}
                        placeholder="Game (e.g., Valorant)"
                        required
                        className="input"
                    />

                    <input
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Logo URL (optional)"
                        className="input"
                    />

                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Team Bio (max 600 chars)"
                        maxLength={600}
                        className="input"
                        rows={3}
                    />

                    <input
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="Region (e.g., APAC / EU / NA / BD)"
                        className="input"
                    />

                    <div className="grid grid-cols-2 gap-2">
                        <input
                            value={socials.website}
                            onChange={(e) => onSocialChange("website", e.target.value)}
                            placeholder="Website"
                            className="input"
                        />
                        <input
                            value={socials.discord}
                            onChange={(e) => onSocialChange("discord", e.target.value)}
                            placeholder="Discord"
                            className="input"
                        />
                        <input
                            value={socials.twitter}
                            onChange={(e) => onSocialChange("twitter", e.target.value)}
                            placeholder="Twitter"
                            className="input"
                        />
                        <input
                            value={socials.youtube}
                            onChange={(e) => onSocialChange("youtube", e.target.value)}
                            placeholder="YouTube"
                            className="input"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={visibility}
                            onChange={(e) => setVisibility(e.target.value)}
                            className="input"
                        >
                            <option value="public">public</option>
                            <option value="private">private</option>
                        </select>

                        <input
                            type="number"
                            min="1"
                            max="20"
                            value={maxMembers}
                            onChange={(e) => setMaxMembers(e.target.value)}
                            placeholder="Max Members (1-20)"
                            className="input"
                        />
                    </div>


                    <input
                        value={captainId}
                        onChange={(e) => setCaptainId(e.target.value)}
                        placeholder="Captain UserId (leave empty to set yourself)"
                        className="input"
                    />

                    <button type="submit" className="btn w-full">Create</button>
                </form>
            </div>
        </div>
    );
}
