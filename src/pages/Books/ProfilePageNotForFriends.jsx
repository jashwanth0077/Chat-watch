import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../../config/config";

const ProfileForNotFriends = () => {
  const navigate = useNavigate();
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [topData, setTopData] = useState({ topBookGenres: [], topAuthors: [] });
  const [counts, setCounts] = useState({ bookReviews: 0, movieReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [error, setError] = useState("");
  const [friendStatus, setFriendStatus] = useState("loading");

  useEffect(() => {
    async function loadAll() {
      try {
        // 1 API call returns everything
        const res = await fetch(`${apiUrl}/api/profiles/${username}`, {
          credentials: "include",
        });
        if (res.status === 404) {
          throw new Error("User not found.");
        }
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();

        // Profile fields
        setProfile({
          username: data.username,
          email:    data.email,
          dob:      data.dob,
          location: data.location,
          contact:  data.contact,
        });

        // Top picks
        setTopData({
          topBookGenres:
            data.topBookGenre && data.topBookGenre !== ""
              ? [data.topBookGenre]
              : [],
          topAuthors:
            data.topAuthor && data.topAuthor !== ""
              ? [data.topAuthor]
              : [],
        });

        // Counts
        setCounts({
          bookReviews:  data.bookReviews  || 0,
          movieReviews: data.movieReviews || 0,
        });

        // Friend status (separate endpoint remains)
        const statusRes = await fetch(
          `${apiUrl}/api/friend_request_status?toUsername=${username}`,
          { credentials: "include" }
        );
        const statusJson = await statusRes.json();
        setFriendStatus(statusJson.status);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [username, navigate]);

  // Friend-request handlers unchanged...
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
      alert(err.message);
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
      if (!res.ok) throw new Error("Failed to accept");
      setFriendStatus("friends");
    } catch (err) {
      alert(err.message);
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
      if (!res.ok) throw new Error("Failed to reject");
      setFriendStatus("none");
    } catch (err) {
      alert(err.message);
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
      if (!res.ok) throw new Error("Failed to break");
      setFriendStatus("none");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading profile…</p>;
  if (!profile)
    return (
      <div className="profile-container">
        <p>{error}</p>
        <button onClick={() => navigate("/books/friends")}>Back to Search</button>
      </div>
    );

  return (
    <div className="profile-container" style={{ maxWidth: 500, margin: "auto", padding: "1rem" }}>
      <h2>{profile.username}'s Profile</h2>

      {/* REVIEW COUNTS */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>Book Reviews:</strong> {counts.bookReviews} &nbsp;|&nbsp;
        <strong>Movie Reviews:</strong> {counts.movieReviews}
      </div>

      <div className="profile-details">
        <p>
          <strong>Email:</strong> {profile.email}
        </p>
        <p>
          <strong>DOB:</strong>{" "}
          {profile.dob ? new Date(profile.dob).toLocaleDateString() : "—"}
        </p>
        <p>
          <strong>Location:</strong> {profile.location || "—"}
        </p>
        <p>
          <strong>Contact:</strong> {profile.contact || "—"}
        </p>
        <p>
          <strong>Top Book Genres:</strong>{" "}
          {topData.topBookGenres.length
            ? topData.topBookGenres.join(", ")
            : "N/A"}
        </p>
        <p>
          <strong>Top Authors:</strong>{" "}
          {topData.topAuthors.length
            ? topData.topAuthors.join(", ")
            : "N/A"}
        </p>
      </div>

      {/* FRIEND-REQUEST UI */}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => navigate("/books/friends")} style={{ marginRight: "0.5rem" }}>
          Back to Search
        </button>

        {friendStatus === "friends" && (
          <>
            <span style={{ color: "green", fontWeight: "bold" }}>Friends</span>
            <button
              onClick={handleBreakFriendship}
              style={{ marginLeft: "1rem", backgroundColor: "#f8d7da", color: "#721c24" }}
            >
              Break Friendship
            </button>
          </>
        )}

        {friendStatus === "requested" && (
          <button disabled style={{ backgroundColor: "#ccc" }}>
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
