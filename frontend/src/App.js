import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { RequireAdmin, RequireAuth, RequireRole, GuestOnly } from "./components/ProtectedRoute";
import NotificationsPage from "./pages/NotificationsPage";
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

function MemberLayout() {
  return <RequireAuth><Navbar /><Outlet /></RequireAuth>;
}

function AppFrame() {
  return (
    <div style={{ background: "#0b0d12", color: "#E6F0FF", minHeight: "100vh" }}>

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

        <Route element={<MemberLayout />}>
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/browse" element={<TournamentsBrowsePage />} />
          <Route path="/tournaments/:id/bracket" element={<BracketPage />} />

          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          <Route path="/create-team" element={<RequireRole roles={["Admin", "TeamManager"]}><CreateTeamPage /></RequireRole>} />
          <Route path="/my-team" element={<MyTeamPage />} />
          <Route path="/teams/create" element={<RequireRole roles={["Admin", "TeamManager"]}><CreateTeamPage /></RequireRole>} />
          <Route path="/teams/my" element={<MyTeamPage />} />

          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />

          <Route path="/gallery" element={<MediaGalleryPage />} />
          <Route path="/media" element={<MediaGalleryPage />} />
          <Route path="/admin/media" element={<RequireAdmin><AdminMediaPage /></RequireAdmin>} />
          <Route path="/ads/mine" element={<RequireRole roles={["Admin", "Sponsor", "Partner"]}><MyAdsPage /></RequireRole>} />

          <Route path="/admin/create-tournament" element={<RequireAdmin><CreateTournamentPage /></RequireAdmin>} />
          <Route path="/admin/user-moderation" element={<RequireAdmin><AdminUserModerationPage /></RequireAdmin>} />
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

        </Route>
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
