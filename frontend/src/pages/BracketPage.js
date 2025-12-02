// src/pages/BracketPage.js
import { useContext, useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
    getBracket,
    setMatchResult,
} from "../services/tournamentService";
import AdSlot from "../components/AdSlot"; // ← added (non-breaking)

export default function BracketPage() {
    const { token, user } = useContext(AuthContext);
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [bracketData, setBracketData] = useState(null);

    const isAdmin = user?.role === "Admin";

    useEffect(() => {
        (async () => {
            try {
                const data = await getBracket(tournamentId, token); // { title, bracketData }
                setTitle(data?.title || "");
                setBracketData(data?.bracketData || null);
            } catch (e) {
                console.error(e);
                alert("Failed to load bracket");
            } finally {
                setLoading(false);
            }
        })();
    }, [tournamentId, token]);

    const rounds = useMemo(() => bracketData?.rounds || [], [bracketData]);

    const clickWinner = async (rIdx, mIdx, side) => {
        try {
            await setMatchResult(tournamentId, { roundIndex: rIdx, matchIndex: mIdx, winnerSide: side }, token);
            const data = await getBracket(tournamentId, token);
            setBracketData(data?.bracketData || null);
        } catch (e) {
            alert(e?.response?.data?.message || "Failed to save result");
        }
    };

    // Calculate vertical spacing for bracket tree
    const getMatchSpacing = (roundIndex) => {
        const baseSpacing = 60;
        const multiplier = Math.pow(2, roundIndex);
        return baseSpacing * multiplier;
    };

    const renderMatchBox = (match, mIdx, rIdx, hasNextRound) => {
        if (!match) return null;

        const p1 = match?.p1?.label || match?.p1?.id || (match?.p1 ? "Player/Team" : "BYE");
        const p2 = match?.p2?.label || match?.p2?.id || (match?.p2 ? "Player/Team" : "BYE");
        const hasP1 = !!match?.p1;
        const hasP2 = !!match?.p2;
        const p1Won = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p1);
        const p2Won = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p2);

        return (
            <div style={matchWrapper} key={mIdx}>
                <div style={matchBox}>
                    <div style={{ ...playerSlot, ...(p1Won ? winnerSlot : {}) }}>
                        <span style={playerName}>{p1}</span>
                        {isAdmin && !match?.winner && hasP1 && (
                            <button
                                style={winButton}
                                onClick={() => clickWinner(rIdx, mIdx, "p1")}
                            >
                                ✓
                            </button>
                        )}
                    </div>
                    <div style={divider}></div>
                    <div style={{ ...playerSlot, ...(p2Won ? winnerSlot : {}) }}>
                        <span style={playerName}>{p2}</span>
                        {isAdmin && !match?.winner && hasP2 && (
                            <button
                                style={winButton}
                                onClick={() => clickWinner(rIdx, mIdx, "p2")}
                            >
                                ✓
                            </button>
                        )}
                    </div>
                </div>

                {/* Connector line to next round */}
                {hasNextRound && (
                    <div style={connectorLine}></div>
                )}

                {/* Admin controls */}
                {isAdmin && (
                    <div style={adminControls}>
                        <button
                            style={adminBtn}
                            onClick={() =>
                                navigate(`/admin/match-stats/${tournamentId}?r=${rIdx}&m=${mIdx}`)
                            }
                        >
                            📊
                        </button>
                        <button
                            style={adminBtn}
                            onClick={() =>
                                navigate(`/admin/match-media/${tournamentId}?r=${rIdx}&m=${mIdx}`)
                            }
                        >
                            📷
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div style={wrap}>Loading…</div>;
    if (!bracketData) return <div style={wrap}>No bracket generated yet.</div>;

    return (
        <div style={wrap}>
            <div style={header}>
                <h1 style={headerTitle}>{title || "Tournament"}</h1>
                <div style={bracketLabel}>BRACKET</div>
            </div>

            <div style={bracketContainer}>
                <div style={bracketTree}>
                    {rounds.map((round, rIdx) => {
                        const spacing = getMatchSpacing(rIdx);
                        const isLastRound = rIdx === rounds.length - 1;
                        const hasNextRound = rIdx < rounds.length - 1;

                        return (
                            <div key={rIdx} style={roundColumn}>
                                <div style={roundHeader}>
                                    {isLastRound ? "FINALS" : `ROUND ${rIdx + 1}`}
                                </div>
                                <div style={{
                                    ...matchesContainer,
                                    gap: `${spacing}px`,
                                    paddingTop: `${spacing / 2}px`,
                                    justifyContent: "center"
                                }}>
                                    {round.map((match, mIdx) => {
                                        const isEvenMatch = mIdx % 2 === 0;
                                        const hasPartner = mIdx + 1 < round.length;

                                        return (
                                            <div key={mIdx} style={{ position: 'relative', height: 'fit-content' }}>
                                                {renderMatchBox(match, mIdx, rIdx, hasNextRound)}

                                                {/* Horizontal line from each match */}
                                                {hasNextRound && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            left: '100%',
                                                            top: '46px',
                                                            width: '40px',
                                                            height: '2px',
                                                            background: '#4a5568',
                                                            zIndex: 0
                                                        }}
                                                    />
                                                )}

                                                {/* Vertical connector and line to next round (only for even matches) */}
                                                {hasNextRound && isEvenMatch && hasPartner && (
                                                    <>
                                                        {/* Vertical line connecting this match to the one below */}
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: 'calc(100% + 40px)',
                                                                top: '47px',
                                                                width: '2px',
                                                                height: `${spacing}px`,
                                                                background: '#4a5568',
                                                                zIndex: 0
                                                            }}
                                                        />
                                                        {/* Horizontal line to next round from midpoint */}
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                left: 'calc(100% + 40px)',
                                                                top: `${47 + spacing / 2}px`,
                                                                width: '40px',
                                                                height: '2px',
                                                                background: '#4a5568',
                                                                zIndex: 0
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ===== Optional second ad slot under bracket (non-intrusive) ===== */}
                <div style={adBottomBox}>
                    <AdSlot category="BracketBottom" />
                </div>
            </div>
        </div>
    );
}

/* -------------------- Tournament Bracket Styles ------------------- */
const wrap = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0e15 0%, #1a1f2e 100%)",
    color: "#e8ecf2",
    padding: "32px 24px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
};

const header = {
    textAlign: "center",
    marginBottom: 48,
    paddingBottom: 24,
    borderBottom: "2px solid #2a3142"
};

const headerTitle = {
    margin: 0,
    fontSize: 48,
    fontWeight: 800,
    background: "linear-gradient(135deg, #6ab4ff 0%, #4a9eff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px"
};

const bracketLabel = {
    fontSize: 14,
    fontWeight: 600,
    color: "#7a8599",
    letterSpacing: "3px",
    marginTop: 8
};

const bracketContainer = {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 32
};

const bracketTree = {
    display: "flex",
    gap: "80px",
    minWidth: "fit-content",
    padding: "24px",
    justifyContent: "center",
    alignItems: "flex-start"
};

const roundColumn = {
    display: "flex",
    flexDirection: "column",
    minWidth: "240px",
    position: "relative"
};

const roundHeader = {
    fontSize: 13,
    fontWeight: 700,
    color: "#6ab4ff",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: "2px",
    padding: "8px 16px",
    background: "rgba(106, 180, 255, 0.1)",
    borderRadius: 8,
    border: "1px solid rgba(106, 180, 255, 0.2)"
};

const matchesContainer = {
    display: "flex",
    flexDirection: "column",
    position: "relative"
};

const matchWrapper = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    zIndex: 1
};

const matchBox = {
    background: "linear-gradient(135deg, #1e2430 0%, #252d3d 100%)",
    border: "2px solid #2f3848",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    transition: "all 0.3s ease",
    position: "relative",
    zIndex: 2
};

const playerSlot = {
    padding: "14px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1a1f2e",
    transition: "all 0.2s ease",
    position: "relative"
};

const winnerSlot = {
    background: "linear-gradient(90deg, rgba(42, 187, 155, 0.15) 0%, rgba(42, 187, 155, 0.05) 100%)",
    borderLeft: "4px solid #2abb9b",
    fontWeight: 600
};

const playerName = {
    fontSize: 14,
    color: "#e8ecf2",
    fontWeight: 500,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
};

const divider = {
    height: 1,
    background: "#2f3848"
};

const winButton = {
    padding: "4px 12px",
    background: "#2abb9b",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginLeft: 8
};

const adminControls = {
    display: "flex",
    gap: 6,
    justifyContent: "flex-end"
};

const adminBtn = {
    padding: "6px 10px",
    background: "rgba(106, 180, 255, 0.1)",
    border: "1px solid rgba(106, 180, 255, 0.3)",
    borderRadius: 6,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#6ab4ff"
};
