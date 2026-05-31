import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
    getBracket,
    setMatchResult,
} from "../services/tournamentService";
import AdSlot from "../components/AdSlot";

const MATCH_H      = 92;
const MATCH_W      = 240;
const ROUND_GAP    = 80;
const STUB         = 36;
const MIN_SPACING  = 20;

function computeOffsets(rounds) {
    if (!rounds || rounds.length === 0) return [];

    const firstCount = rounds[0].length;
    const firstOffsets = Array.from({ length: firstCount }, (_, i) =>
        i * (MATCH_H + MIN_SPACING)
    );

    const allOffsets = [firstOffsets];

    for (let r = 1; r < rounds.length; r++) {
        const prevOffsets = allOffsets[r - 1];
        const currCount   = rounds[r].length;
        const currOffsets = [];

        for (let m = 0; m < currCount; m++) {
            const top    = prevOffsets[m * 2]     ?? prevOffsets[prevOffsets.length - 1] ?? 0;
            const bottom = prevOffsets[m * 2 + 1] ?? top;
            const topCentre    = top    + MATCH_H / 2;
            const bottomCentre = bottom + MATCH_H / 2;
            currOffsets.push((topCentre + bottomCentre) / 2 - MATCH_H / 2);
        }
        allOffsets.push(currOffsets);
    }

    return allOffsets;
}

export default function BracketPage() {
    const { token, user } = useContext(AuthContext);
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading]     = useState(true);
    const [title, setTitle]         = useState("");
    const [bracketData, setBracketData] = useState(null);

    const isAdmin = user?.role === "Admin";

    const load = useCallback(async () => {
        try {
            const data = await getBracket(tournamentId, token);
            setTitle(data?.title || "");
            setBracketData(data?.bracketData || null);
        } catch (e) {
            console.error(e);
            alert("Failed to load bracket");
        } finally {
            setLoading(false);
        }
    }, [tournamentId, token]);

    useEffect(() => { load(); }, [load]);

    const rounds = useMemo(() => bracketData?.rounds || [], [bracketData]);
    const allOffsets = useMemo(() => computeOffsets(rounds), [rounds]);

    const columnHeights = useMemo(() =>
        allOffsets.map((offsets) =>
            offsets.length === 0 ? 0 : offsets[offsets.length - 1] + MATCH_H
        ),
    [allOffsets]);

    const maxHeight = useMemo(() =>
        columnHeights.reduce((a, b) => Math.max(a, b), MATCH_H),
    [columnHeights]);

    const clickWinner = async (rIdx, mIdx, side) => {
        try {
            await setMatchResult(tournamentId, { roundIndex: rIdx, matchIndex: mIdx, winnerSide: side }, token);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || "Failed to save result");
        }
    };

    if (loading) return <div style={wrap}><div style={loadingBox}>Loading bracket…</div></div>;
    if (!bracketData) return <div style={wrap}><div style={emptyBox}>No bracket generated yet.</div></div>;

    return (
        <div style={wrap}>
            <div style={header}>
                <h1 style={headerTitle}>{title || "Tournament"}</h1>
                <div style={bracketLabel}>BRACKET</div>
            </div>

            <div style={bracketContainer}>
                <div style={{
                    ...bracketTree,
                    height: maxHeight + 60,
                    minWidth: rounds.length * (MATCH_W + ROUND_GAP) + 48,
                }}>

                    {rounds.map((round, rIdx) => {
                        const offsets      = allOffsets[rIdx] || [];
                        const nextOffsets  = allOffsets[rIdx + 1] || [];
                        const hasNext      = rIdx < rounds.length - 1;
                        const isLastRound  = rIdx === rounds.length - 1;

                        const colLeft = rIdx * (MATCH_W + ROUND_GAP);

                        return (
                            <div
                                key={rIdx}
                                style={{
                                    ...roundColumn,
                                    left: colLeft,
                                    height: maxHeight + 60,
                                }}
                            >
                                <div style={roundHeader}>
                                    {isLastRound
                                        ? rounds.length === 1 ? "FINALS" : "GRAND FINALS"
                                        : rIdx === rounds.length - 2
                                            ? "SEMI-FINALS"
                                            : `ROUND ${rIdx + 1}`}
                                </div>

                                {round.map((match, mIdx) => {
                                    if (!match) return null;
                                    const top = (offsets[mIdx] ?? 0) + 48;

                                    const p1     = match?.p1?.label || match?.p1?.id || (match?.p1 ? "TBD" : "BYE");
                                    const p2     = match?.p2?.label || match?.p2?.id || (match?.p2 ? "TBD" : "BYE");
                                    const hasP1  = !!match?.p1;
                                    const hasP2  = !!match?.p2;
                                    const p1Won  = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p1);
                                    const p2Won  = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p2);

                                    return (
                                        <div
                                            key={mIdx}
                                            style={{ ...matchWrapper, position: "absolute", top, left: 0, width: MATCH_W }}
                                        >
                                            <div style={{
                                                ...matchBox,
                                                borderColor: match?.winner ? "#2abb9b44" : "#2f3848",
                                            }}>
                                                <div style={{ ...playerSlot, ...(p1Won ? winnerSlot : {}) }}>
                                                    <span style={{
                                                        ...playerName,
                                                        color: p1Won ? "#2abb9b" : !hasP1 ? "#4a5568" : "#e8ecf2",
                                                        fontStyle: !hasP1 ? "italic" : "normal",
                                                    }}>{p1}</span>
                                                    {isAdmin && !match?.winner && hasP1 && (
                                                        <button style={winButton} onClick={() => clickWinner(rIdx, mIdx, "p1")} title="Set as winner">
                                                            ✓
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={divider} />

                                                <div style={{ ...playerSlot, ...(p2Won ? winnerSlot : {}) }}>
                                                    <span style={{
                                                        ...playerName,
                                                        color: p2Won ? "#2abb9b" : !hasP2 ? "#4a5568" : "#e8ecf2",
                                                        fontStyle: !hasP2 ? "italic" : "normal",
                                                    }}>{p2}</span>
                                                    {isAdmin && !match?.winner && hasP2 && (
                                                        <button style={winButton} onClick={() => clickWinner(rIdx, mIdx, "p2")} title="Set as winner">
                                                            ✓
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {isAdmin && (
                                                <div style={adminControls}>
                                                    <button
                                                        style={adminBtn}
                                                        title="Match Stats"
                                                        onClick={() => navigate(`/admin/match-stats/${tournamentId}?r=${rIdx}&m=${mIdx}`)}
                                                    >📊 Stats</button>
                                                    <button
                                                        style={adminBtn}
                                                        title="Match Media"
                                                        onClick={() => navigate(`/admin/match-media/${tournamentId}?r=${rIdx}&m=${mIdx}`)}
                                                    >📷 Media</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {hasNext && (
                                    <svg
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: MATCH_W,
                                            width: ROUND_GAP,
                                            height: "100%",
                                            overflow: "visible",
                                            pointerEvents: "none",
                                        }}
                                    >
                                        {round.map((_, mIdx) => {
                                            const nextMIdx   = Math.floor(mIdx / 2);
                                            const currTop    = (offsets[mIdx]         ?? 0) + 48;
                                            const nextTop    = (nextOffsets[nextMIdx] ?? 0) + 48;

                                            const y1 = currTop + MATCH_H / 2;

                                            const y2 = nextTop + MATCH_H / 2;

                                            const xMid = STUB;

                                            const isEven = mIdx % 2 === 0;

                                            const oddMIdx = mIdx + 1;
                                            const oddTop  = (offsets[oddMIdx] ?? offsets[mIdx] ?? 0) + 48;
                                            const yOdd   = oddTop + MATCH_H / 2;

                                            return (
                                                <g key={mIdx} stroke="#3d4f6b" strokeWidth="2" fill="none">
                                                    <line x1={0} y1={y1} x2={xMid} y2={y1} />

                                                    {isEven && (
                                                        <>
                                                            <line x1={xMid} y1={y1} x2={xMid} y2={yOdd} />
                                                            <line
                                                                x1={xMid}
                                                                y1={(y1 + yOdd) / 2}
                                                                x2={ROUND_GAP}
                                                                y2={(y1 + yOdd) / 2}
                                                            />
                                                        </>
                                                    )}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={adBottomBox}>
                <AdSlot category="BracketBottom" />
            </div>
        </div>
    );
}

const wrap = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #080c13 0%, #0f1520 50%, #0a0e18 100%)",
    color: "#e8ecf2",
    padding: "32px 24px 64px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const loadingBox = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    fontSize: 18,
    color: "#6ab4ff",
    opacity: 0.7,
};

const emptyBox = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    fontSize: 18,
    color: "#7a8599",
};

const header = {
    textAlign: "center",
    marginBottom: 48,
    paddingBottom: 24,
    borderBottom: "1px solid #1e2535",
};

const headerTitle = {
    margin: 0,
    fontSize: 46,
    fontWeight: 800,
    background: "linear-gradient(135deg, #6ab4ff 0%, #4a9eff 60%, #8b5cf6 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px",
};

const bracketLabel = {
    fontSize: 12,
    fontWeight: 700,
    color: "#3d4f6b",
    letterSpacing: "4px",
    marginTop: 8,
};

const bracketContainer = {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    paddingBottom: 32,
};

const bracketTree = {
    position: "relative",
    minWidth: "fit-content",
    paddingLeft: 24,
    paddingRight: 24,
};

const roundColumn = {
    position: "absolute",
};

const roundHeader = {
    position: "absolute",
    top: 0,
    left: 0,
    width: MATCH_W,
    fontSize: 11,
    fontWeight: 700,
    color: "#6ab4ff",
    textAlign: "center",
    letterSpacing: "2.5px",
    padding: "7px 12px",
    background: "rgba(74, 158, 255, 0.07)",
    borderRadius: 8,
    border: "1px solid rgba(74, 158, 255, 0.15)",
    boxSizing: "border-box",
};

const matchWrapper = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

const matchBox = {
    background: "linear-gradient(160deg, #141926 0%, #1b2233 100%)",
    border: "1.5px solid #2f3848",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    height: MATCH_H,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
};

const playerSlot = {
    height: (MATCH_H - 1) / 2,
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "transparent",
    transition: "background 0.2s ease",
};

const winnerSlot = {
    background: "linear-gradient(90deg, rgba(42,187,155,0.14) 0%, rgba(42,187,155,0.03) 100%)",
    borderLeft: "3px solid #2abb9b",
};

const playerName = {
    fontSize: 13,
    fontWeight: 500,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transition: "color 0.2s ease",
};

const divider = {
    height: 1,
    background: "#1e2a3a",
    flexShrink: 0,
};

const winButton = {
    flexShrink: 0,
    padding: "3px 10px",
    background: "linear-gradient(135deg, #2abb9b, #1e9b80)",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s ease, transform 0.1s ease",
    marginLeft: 8,
};

const adminControls = {
    display: "flex",
    gap: 5,
    justifyContent: "flex-end",
    marginTop: 4,
};

const adminBtn = {
    padding: "5px 9px",
    background: "rgba(74, 158, 255, 0.08)",
    border: "1px solid rgba(74, 158, 255, 0.2)",
    borderRadius: 7,
    fontSize: 12,
    cursor: "pointer",
    transition: "background 0.15s ease",
    color: "#6ab4ff",
    fontWeight: 500,
};

const adBottomBox = {
    marginTop: 48,
    maxWidth: 800,
    marginLeft: "auto",
    marginRight: "auto",
};
