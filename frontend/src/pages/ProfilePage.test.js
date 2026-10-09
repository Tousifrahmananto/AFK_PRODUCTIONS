import React from "react";
import { render, screen } from "@testing-library/react";
import { AuthContext } from "../context/AuthContext";
import { getUserById } from "../services/userService";
import ProfilePage from "./ProfilePage";

jest.mock("react-router-dom", () => ({ useParams: () => ({ id: "test-user" }) }), { virtual: true });
jest.mock("../services/userService", () => ({ getUserById: jest.fn(), getMeProfile: jest.fn() }));
jest.mock("../components/ProfileCard", () => ({ user }) => <div>{user.username}</div>);

test("profile clears the logged-out error when a saved session loads", async () => {
    getUserById.mockResolvedValue({ username: "Restored player" });
    const { rerender } = render(
        <AuthContext.Provider value={{ token: null }}><ProfilePage /></AuthContext.Provider>
    );
    expect(screen.getByText("You must be logged in to view profiles")).toBeInTheDocument();
    rerender(<AuthContext.Provider value={{ token: "saved-token" }}><ProfilePage /></AuthContext.Provider>);
    expect(await screen.findByText("Restored player")).toBeInTheDocument();
    expect(screen.queryByText("You must be logged in to view profiles")).not.toBeInTheDocument();
});
