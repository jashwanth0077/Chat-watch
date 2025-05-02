import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../../config/config";

const ProfileForNotFriends = () => {
  const navigate = useNavigate();
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [topData, setTopData] = useState({ topBookGenres: [], topAuthors: [] });
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState("");
  const [friendStatus, setFriendStatus] = useState("loading");

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/profiles/${username}`);
        if (res.status === 404) throw new Error("User not found.");
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setProfile({
          username: data.username,
          email: data.email,
          location: data.location,
          dob: data.dob,
          contact: data.contact,
        });
        setTopData({
          topBookGenres: data.topBookGenre && data.topBookGenre !== "N/A" ? [data.topBookGenre] : [],
          topAuthors: data.topAuthor && data.topAuthor !== "N/A" ? [data.topAuthor] : [],
        });
      } catch (err) {
        setError(err.message || "Network or server error.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    const checkFriendRequestStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/friend_request_status?toUsername=${username}`, {
          credentials: "include",
        });
        const data = await res.json();
        setFriendStatus(data.status); // expected values: friends, requested, pending_you, none
      } catch (err) {
        console.error("Could not check friend request status", err);
        setFriendStatus("error");
      }
    };

    fetchPublicProfile();
    checkFriendRequestStatus();
  }, [username]);

  const handleSendFriendRequest = async () => {
    setSendingRequest(true);
    try {
      const res = await fetch(`${apiUrl}/api/send_friend_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUsername: username }),
      });
      if (!res.ok) throw new Error("Failed to send friend request");
      setFriendStatus("requested");
    } catch (err) {
      alert(err.message || "Failed to send friend request.");
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/respond_friend_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromUsername: username, action: "accept" }),
      });
      if (!res.ok) throw new Error("Failed to accept friend request");
      setFriendStatus("friends");
    } catch (err) {
      alert(err.message || "Failed to accept request");
    }
  };

  const handleRejectRequest = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/respond_friend_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromUsername: username, action: "reject" }),
      });
      if (!res.ok) throw new Error("Failed to reject friend request");
      setFriendStatus("none");
    } catch (err) {
      alert(err.message || "Failed to reject request");
    }
  };

  const handleBreakFriendship = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/break_friendship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromUsername: username }),
      });
      if (!res.ok) throw new Error("Failed to break friendship");
      setFriendStatus("none");
    } catch (err) {
      alert(err.message || "Failed to break friendship");
    }
  };

  if (loading) return <p>Loading profile…</p>;
  if (!profile)
    return (
      <div className="profile-container">
        <p>{error || "User not found or server error."}</p>
        <button onClick={() => navigate("/books/friends")}>Back to Search</button>
      </div>
    );

  return (
    <div className="profile-container" style={{ maxWidth: 500, margin: "auto", padding: "1rem" }}>
      <h2>{profile.username}'s Profile</h2>
      <div className="profile-details">
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>DOB:</strong> {profile.dob ? new Date(profile.dob).toLocaleDateString() : "—"}</p>
        <p><strong>Location:</strong> {profile.location || "—"}</p>
        <p><strong>Contact:</strong> {profile.contact || "—"}</p>
        <p><strong>Top Book Genres:</strong> {topData.topBookGenres.length > 0 ? topData.topBookGenres.join(", ") : "N/A"}</p>
        <p><strong>Top Authors:</strong> {topData.topAuthors.length > 0 ? topData.topAuthors.join(", ") : "N/A"}</p>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => navigate("/books/friends")} style={{ marginRight: "0.5rem" }}>
          Back to Search
        </button>

        {friendStatus === "friends" && (
          <>
            <span style={{ fontWeight: "bold", color: "green" }}>Friends</span>
            <button
              onClick={handleBreakFriendship}
              style={{ backgroundColor: "#f8d7da", color: "#721c24", marginLeft: "1rem" }}
            >
              Break Friendship
            </button>
          </>
        )}

        {friendStatus === "requested" && (
          <button disabled style={{ backgroundColor: "#ccc", cursor: "not-allowed" }}>
            Request Sent
          </button>
        )}

        {friendStatus === "pending_you" && (
          <>
            <button onClick={handleAcceptRequest} style={{ marginRight: "0.5rem" }}>
              Accept
            </button>
            <button onClick={handleRejectRequest} style={{ backgroundColor: "#f8d7da", color: "#721c24" }}>
              Reject
            </button>
          </>
        )}

        {friendStatus === "none" && (
          <button
            onClick={handleSendFriendRequest}
            disabled={sendingRequest}
            style={{
              backgroundColor: sendingRequest ? "#ccc" : "#007bff",
              color: "#fff",
              cursor: sendingRequest ? "not-allowed" : "pointer",
            }}
          >
            {sendingRequest ? "Sending..." : "Send Friend Request"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileForNotFriends;
