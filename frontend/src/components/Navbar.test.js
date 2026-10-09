import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import Navbar from "./Navbar";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
  NavLink: ({ to, children, className }) => <a href={to} className={typeof className === "function" ? className({ isActive: to === "/tournaments" }) : className}>{children}</a>,
  useLocation: () => ({ pathname: "/tournaments" }),
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock("axios", () => ({ create: () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(() => Promise.resolve({})) }) }));
jest.mock("socket.io-client", () => ({ io: () => ({ on: jest.fn(), off: jest.fn(), disconnect: jest.fn() }) }));

function show(user = null) {
  const logout = jest.fn();
  render(<AuthContext.Provider value={{ user, token: null, logout }}><Navbar /></AuthContext.Provider>);
  return logout;
}

test("public navigation highlights the page and provides sign-in links", () => {
  show();
  expect(screen.getByRole("link", { name: "Tournaments" })).toHaveClass("is-active");
  expect(screen.getByRole("link", { name: /Join AFK/ })).toHaveAttribute("href", "/register");
  expect(screen.queryByText("Admin tools")).not.toBeInTheDocument();
});

test("admin links are grouped and Escape closes both navigation menus", () => {
  show({ role: "Admin", username: "Admin" });
  const tools = screen.getByText("Admin tools").closest("details");
  expect(tools).toContainElement(screen.getByRole("link", { name: "Create Tournament" }));
  expect(tools).toContainElement(screen.getByRole("link", { name: "Manage Media" }));
  tools.open = true;
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(tools.open).toBe(false);
  expect(screen.getByRole("button", { name: "Open navigation" })).toHaveAttribute("aria-expanded", "false");
});

test("notifications close on outside click and logout retains its action", () => {
  const logout = show({ role: "Player", username: "Player" });
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  expect(screen.getByText("You’re all caught up.")).toBeInTheDocument();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByText("You’re all caught up.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Log out" }));
  expect(logout).toHaveBeenCalledTimes(1);
});
