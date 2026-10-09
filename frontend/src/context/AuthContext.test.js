import React, { useContext } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AuthProvider, { AuthContext } from "./AuthContext";

function Session() {
    const { user, logout } = useContext(AuthContext);
    return <button onClick={logout}>{user?.username || "anonymous"}</button>;
}
afterEach(() => localStorage.clear());
test("corrupt stored sessions are cleared without crashing", () => {
    localStorage.setItem("user", "{invalid");
    localStorage.setItem("token", "stored-token");
    render(<AuthProvider><Session /></AuthProvider>);
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
});
test("logout preserves unrelated local settings", () => {
    localStorage.setItem("user", JSON.stringify({ username: "test" }));
    localStorage.setItem("token", "stored-token");
    localStorage.setItem("theme", "dark");
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByText("test"));
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
});
