import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
const MIN_SPACING  = 24;

function computeOffsets(rounds, matchHeight) {
    if (!rounds || rounds.length === 0) return [];

    const firstCount = rounds[0].length;
    const firstOffsets = Array.from({ length: firstCount }, (_, i) =>
        i * (matchHeight + MIN_SPACING)
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

function compactOffsets(rounds, matchHeight) {
    const matches = new Map(rounds.flat().map(match => [match.id, match]));
    const positions = new Map();
    let row = 0;
    function position(match) {
        if (positions.has(match.id)) return positions.get(match.id);
        const feeders = Object.values(match.feeds || {}).filter(feed => feed.outcome === 'winner').map(feed => matches.get(feed.matchId)).filter(Boolean);
        const y = feeders.length ? feeders.reduce((sum, feeder) => sum + position(feeder), 0) / feeders.length : row++ * (matchHeight + MIN_SPACING);
        positions.set(match.id, y);
        return y;
    }
    for (const round of [...rounds].reverse()) for (const match of round) position(match);
    return rounds.map(round => round.map(match => positions.get(match.id)));
}

function legacyReady(rounds, r, m) {
    const match = rounds[r]?.[m];
    if (!match) return true;
    if (r > 0 && (!legacyReady(rounds, r - 1, m * 2) || !legacyReady(rounds, r - 1, m * 2 + 1))) return false;
    return !!match.winner || !(match.p1 && match.p2);
}

export default function BracketPage() {
    const { token, user } = useContext(AuthContext);
    const { id: tournamentId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading]     = useState(true);
    const [title, setTitle]         = useState("");
    const [bracketData, setBracketData] = useState(null);
    const [vetoEnabled, setVetoEnabled] = useState(false);
    const [vetoTeamIds, setVetoTeamIds] = useState([]);

    const isAdmin = user?.role === "Admin";
    const matchHeight = MATCH_H + (isAdmin ? 44 : 0) + (vetoEnabled ? 44 : 0);

    const load = useCallback(async () => {
        try {
            const data = await getBracket(tournamentId, token);
            setTitle(data?.title || "");
            setBracketData(data?.bracketData || null);
            setVetoEnabled(!!data?.vetoSettings?.enabled);
            setVetoTeamIds(data?.vetoTeamIds || []);
        } catch (e) {
            console.error(e);
            alert("Failed to load bracket");
        } finally {
            setLoading(false);
        }
    }, [tournamentId, token]);

    useEffect(() => { load(); }, [load]);

    const rounds = useMemo(() => bracketData?.rounds || [], [bracketData]);
    const linearRounds = bracketData?.graphVersion && bracketData.format !== 'Single Elimination';
    const allOffsets = useMemo(() => linearRounds ? rounds.map(round => round.map((_, i) => i * (matchHeight + MIN_SPACING))) : bracketData?.compact ? compactOffsets(rounds, matchHeight) : computeOffsets(rounds, matchHeight), [rounds, matchHeight, linearRounds, bracketData?.compact]);

    const columnHeights = useMemo(() =>
        allOffsets.map((offsets) =>
            offsets.length === 0 ? 0 : offsets[offsets.length - 1] + matchHeight
        ),
    [allOffsets, matchHeight]);

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
        <div style={wrap} className="afk-bracket">
            <div style={header}>
                <h1 style={headerTitle}>{title || "Tournament"}</h1>
                <div style={bracketLabel}>BRACKET</div>
            </div>

            {bracketData.standings && <div style={{ overflowX: 'auto', marginBottom: 24 }}><h2>Standings</h2><p>One point per win. Teams with equal wins share a rank.</p><table><thead><tr><th>Rank</th><th>Team</th><th>Played</th><th>Wins</th><th>Losses</th></tr></thead><tbody>{bracketData.standings.map(row => <tr key={row.id}><td>{row.rank}</td><td>{row.label}</td><td>{row.played}</td><td>{row.wins}</td><td>{row.losses}</td></tr>)}</tbody></table></div>}

            <div style={bracketContainer} role="region" aria-label="Tournament bracket" tabIndex={0}>
                <div style={{
                    ...bracketTree,
                    height: maxHeight + 64,
                    gridTemplateColumns: `repeat(${Math.max(1, rounds.length)}, minmax(${MATCH_W}px, 1fr))`,
                    minWidth: rounds.length * MATCH_W + Math.max(0, rounds.length - 1) * ROUND_GAP,
                    maxWidth: rounds.length * 360 + Math.max(0, rounds.length - 1) * ROUND_GAP,
                }}>

                    {rounds.map((round, rIdx) => {
                        const offsets      = allOffsets[rIdx] || [];
                        const hasNext      = rIdx < rounds.length - 1;
                        const isLastRound  = rIdx === rounds.length - 1;

                        return (
                            <div
                                key={rIdx}
                                style={{
                                    ...roundColumn,
                                    height: maxHeight + 64,
                                }}
                            >
                                <div style={roundHeader}>
                                    {bracketData.roundLabels?.[rIdx] || (isLastRound
                                        ? rounds.length === 1 ? "FINALS" : "GRAND FINALS"
                                        : rIdx === rounds.length - 2
                                            ? "SEMI-FINALS"
                                            : `ROUND ${rIdx + 1}`)}
                                </div>

                                {round.map((match, mIdx) => {
                                    if (!match) return null;
                                    const top = (offsets[mIdx] ?? 0) + 48;

                                    const empty = match.status === 'pending' ? 'TBD' : match.status === 'not-needed' ? 'Not needed' : 'BYE';
                                    const p1     = match?.p1?.label || match?.p1?.id || empty;
                                    const p2     = match?.p2?.label || match?.p2?.id || empty;
                                    const hasP1  = !!match?.p1;
                                    const hasP2  = !!match?.p2;
                                    const ready = match.status ? ['ready', 'completed'].includes(match.status) : rIdx === 0 || (legacyReady(rounds, rIdx - 1, mIdx * 2) && legacyReady(rounds, rIdx - 1, mIdx * 2 + 1));
                                    const p1Won  = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p1);
                                    const p2Won  = match?.winner && JSON.stringify(match.winner) === JSON.stringify(match.p2);

                                    return (
                                        <div
                                            key={mIdx}
                                            className="afk-bracket-match"
                                            style={{ ...matchWrapper, position: "absolute", top, left: 0, width: "100%" }}
                                        >
                                            <div style={{
                                                ...matchBox,
                                                borderColor: match?.winner ? "#9a9a9a44" : "#373737",
                                            }}>
                                                <div style={{ ...playerSlot, ...(p1Won ? winnerSlot : {}) }}>
                                                    <span style={{
                                                        ...playerName,
                                                        color: p1Won ? "#9a9a9a" : !hasP1 ? "#545454" : "#ececec",
                                                        fontStyle: !hasP1 ? "italic" : "normal",
                                                    }}>{p1}</span>
                                                    {isAdmin && !match?.winner && hasP1 && hasP2 && ready && (
                                                        <button type="button" style={winButton} onClick={() => clickWinner(rIdx, mIdx, "p1")} title="Set as winner" aria-label={`Set ${p1} as winner of round ${rIdx + 1}, match ${mIdx + 1}`}>
                                                            ✓
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={divider} />

                                                <div style={{ ...playerSlot, ...(p2Won ? winnerSlot : {}) }}>
                                                    <span style={{
                                                        ...playerName,
                                                        color: p2Won ? "#9a9a9a" : !hasP2 ? "#545454" : "#ececec",
                                                        fontStyle: !hasP2 ? "italic" : "normal",
                                                    }}>{p2}</span>
                                                    {isAdmin && !match?.winner && hasP2 && hasP1 && ready && (
                                                        <button type="button" style={winButton} onClick={() => clickWinner(rIdx, mIdx, "p2")} title="Set as winner" aria-label={`Set ${p2} as winner of round ${rIdx + 1}, match ${mIdx + 1}`}>
                                                            ✓
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {vetoEnabled && match.id && ready && match.p1?.kind === 'team' && match.p2?.kind === 'team' && (isAdmin || [match.p1.id, match.p2.id].some(id => vetoTeamIds.includes(String(id)))) && (
                                                <div style={adminControls}><button type="button" style={adminBtn} onClick={() => navigate(`/tournaments/${tournamentId}/matches/${match.id}/veto`)}>Map veto</button></div>
                                            )}
                                            {isAdmin && (
                                                <div style={adminControls}>
                                                    <button
                                                        type="button"
                                                        style={adminBtn}
                                                        title="Match Stats"
                                                        aria-label={`Stats for round ${rIdx + 1}, match ${mIdx + 1}`}
                                                        onClick={() => navigate(`/admin/match-stats/${tournamentId}?r=${rIdx}&m=${mIdx}`)}
                                                    >Stats</button>
                                                    <button
                                                        type="button"
                                                        style={adminBtn}
                                                        title="Match Media"
                                                        aria-label={`Media for round ${rIdx + 1}, match ${mIdx + 1}`}
                                                        onClick={() => navigate(`/admin/match-media/${tournamentId}?r=${rIdx}&m=${mIdx}`)}
                                                    >Match media</button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {hasNext && !linearRounds && (
                                    <svg
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: "100%",
                                            width: ROUND_GAP,
                                            height: "100%",
                                            overflow: "visible",
                                            pointerEvents: "none",
                                        }}
                                        aria-hidden="true"
                                    >
                                        {bracketData.compact ? round.map((match, mIdx) => {
                                            const nextIndex = rounds[rIdx + 1].findIndex(next => Object.values(next.feeds || {}).some(feed => feed.matchId === match.id));
                                            if (nextIndex < 0) return null;
                                            const from = offsets[mIdx] + 48 + MATCH_H / 2;
                                            const to = allOffsets[rIdx + 1][nextIndex] + 48 + MATCH_H / 2;
                                            return <path key={match.id} data-source={match.id} data-target={rounds[rIdx + 1][nextIndex].id} d={`M 0 ${from} H ${ROUND_GAP / 2} V ${to} H ${ROUND_GAP}`} stroke="#555" strokeWidth="2" fill="none" />;
                                        }) : round.map((_, mIdx) => {
                                            const currTop    = (offsets[mIdx]         ?? 0) + 48;

                                            const y1 = currTop + MATCH_H / 2;

                                            const xMid = ROUND_GAP / 2;

                                            const isEven = mIdx % 2 === 0;

                                            const oddMIdx = mIdx + 1;
                                            const oddTop  = (offsets[oddMIdx] ?? offsets[mIdx] ?? 0) + 48;
                                            const yOdd   = oddTop + MATCH_H / 2;

                                            return (
                                                <g key={mIdx} stroke="#4d4d4d" strokeWidth="2" fill="none">
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
            <style>{`.afk-bracket button:focus-visible, .afk-bracket [role="region"]:focus-visible { outline: 2px solid #aaaaaa; outline-offset: 3px; } .afk-bracket button:hover { filter: brightness(1.2); }`}</style>
        </div>
    );
}

const wrap = {
    minHeight: "100vh",
    background: "var(--app-bg)",
    color: "#ececec",
    padding: "32px clamp(12px, 2vw, 40px) 64px",
    minWidth: 0,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const loadingBox = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    fontSize: 18,
    color: "#aaaaaa",
    opacity: 0.7,
};

const emptyBox = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "60vh",
    fontSize: 18,
    color: "#848484",
};

const header = {
    textAlign: "center",
    marginBottom: 48,
    paddingBottom: 24,
    borderBottom: "1px solid #252525",
};

const headerTitle = {
    margin: 0,
    fontSize: "clamp(26px, 4vw, 46px)",
    overflowWrap: "anywhere",
    fontWeight: 800,
    background: "linear-gradient(135deg, #aaaaaa 0%, #939393 60%, #717171 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px",
};

const bracketLabel = {
    fontSize: 12,
    fontWeight: 700,
    color: "#4d4d4d",
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
    display: "grid",
    columnGap: ROUND_GAP,
    width: "100%",
    margin: "0 auto",
};

const roundColumn = {
    position: "relative",
    minWidth: 0,
};

const roundHeader = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    fontSize: 11,
    fontWeight: 700,
    color: "#aaaaaa",
    textAlign: "center",
    letterSpacing: "2.5px",
    padding: "7px 12px",
    background: "rgba(147,147,147, 0.07)",
    borderRadius: 8,
    border: "1px solid rgba(147,147,147, 0.15)",
    boxSizing: "border-box",
};

const matchWrapper = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
};

const matchBox = {
    background: "linear-gradient(160deg, #191919 0%, #222222 100%)",
    border: "1.5px solid #373737",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
    transition: "border-color 0.3s ease, box-shadow 0.3s ease",
    height: MATCH_H,
    boxSizing: "border-box",
    flexShrink: 0,
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
    background: "linear-gradient(90deg, rgba(154,154,154,0.14) 0%, rgba(154,154,154,0.03) 100%)",
    borderLeft: "3px solid #9a9a9a",
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
    background: "#292929",
    flexShrink: 0,
};

const winButton = {
    flexShrink: 0,
    padding: "3px 10px",
    background: "linear-gradient(135deg, #9a9a9a, #7e7e7e)",
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
    gap: 8,
    height: 36,
};

const adminBtn = {
    padding: "8px 12px",
    minHeight: 36,
    flex: 1,
    lineHeight: 1,
    boxSizing: "border-box",
    background: "rgba(147,147,147, 0.08)",
    border: "1px solid rgba(147,147,147, 0.2)",
    borderRadius: 7,
    fontSize: 12,
    cursor: "pointer",
    transition: "background 0.15s ease",
    color: "#aaaaaa",
    fontWeight: 500,
};

const adBottomBox = {
    marginTop: 48,
    maxWidth: 800,
    marginLeft: "auto",
    marginRight: "auto",
};
