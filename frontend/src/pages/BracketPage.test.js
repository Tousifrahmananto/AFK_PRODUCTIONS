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
