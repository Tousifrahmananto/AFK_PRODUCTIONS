import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import { RequireAdmin } from "./ProtectedRoute";

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
