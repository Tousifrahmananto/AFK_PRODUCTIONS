import React, { useContext } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AuthProvider, { AuthContext } from "./AuthContext";

function Session() {
    const { user, loading, logout } = useContext(AuthContext);
    return <><span>{loading ? "verifying" : "ready"}</span><button onClick={logout}>{user ? user.username + ":" + user.role : "anonymous"}</button></>;
}
const originalFetch = global.fetch;
afterEach(() => { localStorage.clear(); global.fetch = originalFetch; });
const verified = { _id: "user-id", username: "test", role: "Player" };

test.each([401, 403, 500])("failed verification (%s) clears the session", async status => {
    localStorage.setItem("user", "{invalid");
    localStorage.setItem("token", "stored-token");
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status });
    render(<AuthProvider><Session /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
});
test("logout preserves unrelated local settings", async () => {
    localStorage.setItem("user", JSON.stringify({ username: "test" }));
    localStorage.setItem("token", "stored-token");
    localStorage.setItem("theme", "dark");
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: verified }) });
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(await screen.findByText("test:Player"));
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
});

test("forged cached admin identity is hidden until the API validates it", async () => {
    localStorage.setItem("user", JSON.stringify({ username: "forged", role: "Admin" }));
    localStorage.setItem("token", "stored-token");
    let resolve;
    global.fetch = jest.fn(() => new Promise(r => { resolve = r; }));
    render(<AuthProvider><Session /></AuthProvider>);
    expect(screen.getByText("verifying")).toBeInTheDocument();
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    await act(async () => resolve({ ok: true, json: async () => ({ user: verified }) }));
    expect(screen.getByText("test:Player")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("user")).role).toBe("Player");
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer stored-token");
});

test("logout cannot be undone by a pending session check", async () => {
    localStorage.setItem("token", "stored-token");
    let resolve;
    global.fetch = jest.fn(() => new Promise(r => { resolve = r; }));
    render(<AuthProvider><Session /></AuthProvider>);
    fireEvent.click(screen.getByText("anonymous"));
    await act(async () => resolve({ ok: true, json: async () => ({ user: verified }) }));
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
});

test("an expired session clears protected identity without requiring a reload", async () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 1 }));
    localStorage.setItem("token", "header." + payload + ".signature");
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: verified }) });
    render(<AuthProvider><Session /></AuthProvider>);
    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
    expect(screen.getByText("anonymous")).toBeInTheDocument();
});
