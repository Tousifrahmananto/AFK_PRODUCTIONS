import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import { RequireAdmin, RequireAuth, RequireRole, GuestOnly } from "./ProtectedRoute";

jest.mock("react-router-dom", () => ({
    Navigate: ({ to }) => <div>redirect:{to}</div>,
    useLocation: () => ({ pathname: "/admin/media" }),
}), { virtual: true });
afterEach(() => localStorage.clear());
function renderGuard(value) {
    render(<AuthContext.Provider value={value}><RequireAdmin><div>admin content</div></RequireAdmin></AuthContext.Provider>);
}
test("anonymous visitors redirect to login", () => {
    renderGuard({ user: null, token: null });
    expect(screen.getByText("redirect:/login")).toBeInTheDocument();
});

test("member pages do not trust a token saved in storage", () => {
    localStorage.setItem("token", "forged-token");
    render(<AuthContext.Provider value={{}}><RequireAuth>private content</RequireAuth></AuthContext.Provider>);
    expect(screen.queryByText("private content")).not.toBeInTheDocument();
    expect(screen.getByText("redirect:/login")).toBeInTheDocument();
});

test("member pages wait for verification before mounting their children", () => {
    render(<AuthContext.Provider value={{ loading: true }}><RequireAuth>private content</RequireAuth></AuthContext.Provider>);
    expect(screen.getByRole("status")).toHaveTextContent("Verifying");
    expect(screen.queryByText("private content")).not.toBeInTheDocument();
});

test.each(["Sponsor", "Partner", "Admin"])("%s can enter advertiser pages", role => {
    render(<AuthContext.Provider value={{ user: { role }, token: "verified" }}><RequireRole roles={["Sponsor", "Partner", "Admin"]}>advertiser content</RequireRole></AuthContext.Provider>);
    expect(screen.getByText("advertiser content")).toBeInTheDocument();
});

test("players cannot enter team management pages", () => {
    render(<AuthContext.Provider value={{ user: { role: "Player" }, token: "verified" }}><RequireRole roles={["TeamManager", "Admin"]}>create team</RequireRole></AuthContext.Provider>);
    expect(screen.queryByText("create team")).not.toBeInTheDocument();
    expect(screen.getByText("redirect:/")).toBeInTheDocument();
});

test("signed-in members are redirected away from login and registration", () => {
    render(<AuthContext.Provider value={{ user: { role: "Player" }, token: "verified" }}><GuestOnly>sign in</GuestOnly></AuthContext.Provider>);
    expect(screen.getByText("redirect:/tournaments")).toBeInTheDocument();
});
test("stored token does not expose admin content while user loads", () => {
    localStorage.setItem("token", "stored-token");
    renderGuard({ user: null, token: null });
    expect(screen.queryByText("admin content")).not.toBeInTheDocument();
});
test("players cannot enter admin pages", () => {
    renderGuard({ user: { role: "Player" }, token: "token" });
    expect(screen.getByText("redirect:/")).toBeInTheDocument();
});
test("admins can enter admin pages", () => {
    renderGuard({ user: { role: "Admin" }, token: "token" });
    expect(screen.getByText("admin content")).toBeInTheDocument();
});
