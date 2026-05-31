import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { getUserById, getMyTournaments, getMeProfile } from "../services/userService";
import ProfileCard from "../components/ProfileCard";

const ProfilePage = () => {
  const { id } = useParams();
  const { token } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [myTournaments, setMyTournaments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("You must be logged in to view profiles");
      return;
    }

    if (id) {
      getUserById(id)
        .then((u) => {
          setProfile(u);
          setMyTournaments(u.joinedTournaments || []);
        })
        .catch((err) => {
          console.error("Profile by id error:", err);
          setError(err?.response?.data?.message || err.message || "Failed to load profile");
        });
    } else {
      getMeProfile()
        .then(({ user, tournaments }) => {
          setProfile(user);
          setMyTournaments(tournaments || []);
        })
        .catch((err) => {
          console.error("My profile error:", err);
          setError(err?.response?.data?.message || err.message || "Failed to load profile");
        });
    }
  }, [id, token]);

  if (error) return <div className="text-center mt-10 text-red-400">{error}</div>;
  if (!profile) return <div className="text-center mt-10">Loading profile…</div>;

  return (
    <div className="container mt-6">
      <ProfileCard user={profile} myTournaments={myTournaments} />
    </div>
  );
};

export default ProfilePage;
