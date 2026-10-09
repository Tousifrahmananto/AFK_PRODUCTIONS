import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import PrivateMedia from "./PrivateMedia";
import { API_ORIGIN } from "../services/apiConfig";

const originalFetch = global.fetch;
beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["image"]) });
    URL.createObjectURL = jest.fn(() => "blob:private-media");
    URL.revokeObjectURL = jest.fn();
});
afterEach(() => { global.fetch = originalFetch; });
const media = (token, props = {}) => <AuthContext.Provider value={{ token }}><PrivateMedia src="/uploads/images/demo.png" alt="Match image" {...props} /></AuthContext.Provider>;

test("guests never request private uploads", () => {
    render(media(null));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("private images use authenticated requests and revoke their local URLs on logout", async () => {
    const { rerender } = render(media("verified-token"));
    expect((await screen.findByRole("img")).src).toBe("blob:private-media");
    expect(global.fetch.mock.calls[0][0]).toBe(API_ORIGIN + "/uploads/images/demo.png");
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer verified-token");
    rerender(media(null));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:private-media");
});

test("private videos download only after an explicit request", async () => {
    const { container } = render(media("verified-token", { as: "video", src: "/uploads/videos/demo.mp4", controls: true }));
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load video" }));
    await waitFor(() => expect(container.querySelector("video")?.src).toBe("blob:private-media"));
});

test("failed media authentication never falls back to a public URL", async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401 });
    render(media("expired-token"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load media");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test("external images never receive the session token", async () => {
    await act(async () => render(media("verified-token", { src: "https://example.com/banner.png" })));
    expect(screen.getByRole("img").src).toBe("https://example.com/banner.png");
    expect(global.fetch).not.toHaveBeenCalled();
});
