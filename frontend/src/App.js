import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { RequireAdmin } from "./components/ProtectedRoute";
import AdminMatchMediaPage from "./pages/AdminMatchMediaPage";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ToastHost from "./components/ToastHost";
import AdminMatchStatsPage from "./pages/AdminMatchStatsPage";
import AdminUserModerationPage from "./pages/AdminUserModerationPage";
import MediaGalleryPage from "./pages/MediaGalleryPage";
import AdminMediaPage from "./pages/AdminMediaPage";
import MyAdsPage from "./pages/MyAdsPage";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TournamentsPage from "./pages/TournamentsPage";
import BracketPage from "./pages/BracketPage";
import ProfilePage from "./pages/ProfilePage";
import TournamentsBrowsePage from "./pages/TournamentsBrowsePage";

import CreateTeamPage from "./pages/CreateTeamPage";
import MyTeamPage from "./pages/MyTeamPage";
import LeaderboardPage from "./pages/LeaderboardPage";

import CreateTournamentPage from "./pages/CreateTournamentPage";

function AppFrame() {
  const { pathname } = useLocation();

  const hideOn = new Set(["/login", "/register", "/dashboard", "/"]);
  const showNavbar = !hideOn.has(pathname);

  return (
    <div style={{ background: "#0b0d12", color: "#E6F0FF", minHeight: "100vh" }}>
      {showNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/browse" element={<TournamentsBrowsePage />} />
        <Route path="/tournaments/:id/bracket" element={<BracketPage />} />

        <Route path="/leaderboard" element={<LeaderboardPage />} />

        <Route path="/create-team" element={<CreateTeamPage />} />
        <Route path="/my-team" element={<MyTeamPage />} />
        <Route path="/teams/create" element={<CreateTeamPage />} />
        <Route path="/teams/my" element={<MyTeamPage />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />

        <Route path="/gallery" element={<MediaGalleryPage />} />
        <Route path="/media" element={<MediaGalleryPage />} />
        <Route path="/admin/media" element={<AdminMediaPage />} />
        <Route path="/ads/mine" element={<MyAdsPage />} />

        <Route path="/admin/create-tournament" element={<CreateTournamentPage />} />
        <Route path="/admin/user-moderation" element={<AdminUserModerationPage />} />
        <Route
          path="/admin/match-stats/:tournamentId"
          element={
            <RequireAdmin>
              <AdminMatchStatsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/match-media/:id"
          element={
            <RequireAdmin>
              <AdminMatchMediaPage />
            </RequireAdmin>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ToastHost>
      <Router>
        <AppFrame />
      </Router>
    </ToastHost>
  );
}
