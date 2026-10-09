import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import { getBracket } from "../services/tournamentService";
import BracketPage from "./BracketPage";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: () => ({ id: "tournament-id" }),
  useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock("../components/AdSlot", () => () => null);
jest.mock("../services/tournamentService", () => ({ getBracket: jest.fn(), setMatchResult: jest.fn() }));

beforeEach(() => {
  mockNavigate.mockClear();
  getBracket.mockResolvedValue({ title: "Layout Cup", bracketData: { rounds: [
    [{ p1: { id: "a", label: "Alpha" }, p2: { id: "b", label: "Bravo" } },
      { p1: { id: "c", label: "Charlie" }, p2: { id: "d", label: "Delta" } }],
    [{ p1: null, p2: null }],
  ] } });
});
async function show(role) {
  const view = render(<AuthContext.Provider value={{ user: { role }, token: "test-token" }}><BracketPage /></AuthContext.Provider>);
  await screen.findByRole("heading", { name: "Layout Cup" });
  return view.container.querySelectorAll(".afk-bracket-match");
}

test("admin rows reserve space for actions and keep the next round centered", async () => {
  const matches = await show("Admin");
  expect(parseFloat(matches[1].style.top) - parseFloat(matches[0].style.top)).toBe(160);
  expect(parseFloat(matches[2].style.top)).toBe((parseFloat(matches[0].style.top) + parseFloat(matches[1].style.top)) / 2);
  expect(matches[0].style.width).toBe("100%");
  fireEvent.click(screen.getByRole("button", { name: "Stats for round 1, match 2" }));
  expect(mockNavigate).toHaveBeenLastCalledWith("/admin/match-stats/tournament-id?r=0&m=1");
  fireEvent.click(screen.getByRole("button", { name: "Media for round 2, match 1" }));
  expect(mockNavigate).toHaveBeenLastCalledWith("/admin/match-media/tournament-id?r=1&m=0");
});

test("player rows keep normal spacing without admin controls", async () => {
  const matches = await show("Player");
  expect(parseFloat(matches[1].style.top) - parseFloat(matches[0].style.top)).toBe(116);
  expect(screen.queryByRole("button", { name: /Stats for/ })).not.toBeInTheDocument();
});

test('compact play-in connects only its real feeder and pending matches cannot be awarded', async () => {
  const p = id => ({ id, label: id });
  getBracket.mockResolvedValue({ title: 'Layout Cup', bracketData: { graphVersion: 1, compact: true, format: 'Single Elimination', roundLabels: ['Play-in', 'Semifinals', 'Final'], rounds: [
    [{ id: 'play-in', p1: p('a'), p2: p('b'), feeds: {}, status: 'ready' }],
    [{ id: 'semi-1', p1: p('c'), p2: null, feeds: { p2: { matchId: 'play-in', outcome: 'winner' } }, status: 'pending' }, { id: 'semi-2', p1: p('d'), p2: p('e'), feeds: {}, status: 'ready' }],
    [{ id: 'final', p1: null, p2: null, feeds: { p1: { matchId: 'semi-1', outcome: 'winner' }, p2: { matchId: 'semi-2', outcome: 'winner' } }, status: 'pending' }],
  ] } });
  const matches = await show('Admin');
  expect(matches.length).toBe(4);
  expect(matches[0].style.top).toBe(matches[1].style.top);
  expect(parseFloat(matches[2].style.top) - parseFloat(matches[1].style.top)).toBe(160);
  expect(parseFloat(matches[3].style.top)).toBe((parseFloat(matches[1].style.top) + parseFloat(matches[2].style.top)) / 2);
  expect(document.querySelector('[data-source="play-in"]').getAttribute('data-target')).toBe('semi-1');
  expect(matches[1].querySelector('button[title="Set as winner"]')).toBeNull();
  expect(matches[3].querySelector('button[title="Set as winner"]')).toBeNull();
  expect(screen.queryByText('BYE')).not.toBeInTheDocument();
});
