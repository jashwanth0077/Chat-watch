import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/config";
import "../css/moviesnavbar.css";

const MoviesNavbar = () => {
  const navigate = useNavigate();

  // ─── STATE ───────────────────────────────────────────────
  const [browseOpen, setBrowseOpen]       = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);

  const [searchTerm, setSearchTerm]       = useState("");
  const [searchType, setSearchType]       = useState("movie");
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer]     = useState(null);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications]         = useState([]);
  const [friendRequests, setFriendRequests]       = useState([]);

  const searchRef = useRef();
  const notifRef  = useRef();

  // ─── CONSTANTS ───────────────────────────────────────────
  const RESOURCE      = "movies";
  const GROUPS_BASE   = `${apiUrl}/${RESOURCE}/groups`;
  const PENDING_URL   = `${GROUPS_BASE}/pending-requests`;
  const FRIENDS_URL   = `${apiUrl}/api/friend_requests`;
  const SEARCH_SUGG   = `${apiUrl}/search-suggestions`;

  // ─── SEARCH SUGGESTIONS ──────────────────────────────────
// inside MoviesNavbar.jsx

useEffect(() => {
  if (!searchTerm.trim()) {
    setSearchResults([]);
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);

  const timer = setTimeout(async () => {
    try {
      const res = await fetch(
        `${apiUrl}/search-movies?query=${encodeURIComponent(
          searchTerm
        )}&type=${searchType}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const { movies } = await res.json();
      setSearchResults((movies || []).slice(0, 5));
    } catch (err) {
      console.error("Movie suggestion fetch error:", err);
    }
  }, 300);

  setDebounceTimer(timer);
}, [searchTerm, searchType]);



  // ─── OUTSIDE-CLICK HANDLERS ─────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ─── LOGOUT ──────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const res = await fetch(`${apiUrl}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // ─── NOTIFICATIONS FETCH ─────────────────────────────────
  const fetchNotifications = async () => {
    try {
      // 1) community join requests
      const grpRes = await fetch(PENDING_URL, { credentials: "include" });
      if (grpRes.ok) {
        const data = await grpRes.json();
        setNotifications(data.requests || []);
      }

      // 2) friend requests
      const friendRes = await fetch(FRIENDS_URL, { credentials: "include" });
      if (friendRes.ok) {
        const data = await friendRes.json();
        setFriendRequests(data.friendRequests || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const toggleNotifications = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications((p) => !p);
  };

  // ─── HANDLE COMMUNITY REQUEST ────────────────────────────
  const handleRequest = async (userId, communityId, action) => {
    try {
      const res = await fetch(
        `${GROUPS_BASE}/${communityId}/handle-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, action }),
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.filter(
            (n) => !(n.user_id === userId && n.community_id === communityId)
          )
        );
      }
    } catch (err) {
      console.error("Handle community request error:", err);
    }
  };

  // ─── HANDLE FRIEND REQUEST ───────────────────────────────
  const handleFriendRequest = async (fromUserId, action) => {
    try {
      const res = await fetch(`${apiUrl}/api/handle_friend_request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ fromUserId, action }),
      });
      if (res.ok) {
        setFriendRequests((prev) => prev.filter((r) => r.user_id !== fromUserId));
      }
    } catch (err) {
      console.error("Friend request error:", err);
    }
  };

  // ─── RENDER ──────────────────────────────────────────────
  return (
    <nav className="movies-navbar">
      <h1>VibeSync 
        <br></br> Movies</h1>

      <button onClick={() => navigate("/home")}>Common Home</button>
      <button onClick={() => navigate("/movies/home")}>Home</button>
      <button onClick={() => navigate("/movies/collections")}>My Movies</button>

      {/* Browse */}
      <div
        className="dropdown-container"
        onMouseEnter={() => setBrowseOpen(true)}
        onMouseLeave={() => setBrowseOpen(false)}
      >
        <button>Browse ▾</button>
        {browseOpen && (
          <div className="dropdown-menu">
            <button onClick={() => navigate("/movies/genres")}>Genres</button>
            <button onClick={() => navigate("/movies/new-releases")}>
              New Releases
            </button>
            <button onClick={() => navigate("/movies/top-rated")}>
              Top Rated
            </button>
          </div>
        )}
      </div>

      {/* Community */}
      <div
        className="dropdown-container"
        onMouseEnter={() => setCommunityOpen(true)}
        onMouseLeave={() => setCommunityOpen(false)}
      >
        <button>Community ▾</button>
        {communityOpen && (
          <div className="dropdown-menu">
            <button onClick={() => navigate("/movies/groups")}>Groups</button>
            <button onClick={() => navigate("/movies/friends")}>Friends</button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="search-container" ref={searchRef}>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            value={searchTerm}
            placeholder={`Search by ${searchType}`}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
          />
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
          >
            <option value="movie">Title</option>
            <option value="director">Director</option>
          </select>
        </form>
        {showSuggestions && searchResults.length > 0 && (
          <ul className="suggestions-list">
            {searchResults.map((item) => (
              <li
                key={
                  searchType === "movie" ? item.movie_id : item.director_id
                }
                onClick={() => {
                  const id =
                    searchType === "movie"
                      ? item.movie_id
                      : item.director_id;
                  const path =
                    searchType === "movie"
                      ? `/movies/movie/${id}`
                      : `/movies/director/${id}`;
                  navigate(path);
                  setSearchTerm("");
                  setShowSuggestions(false);
                }}
              >
                {searchType === "movie"
                  ? `${item.title} (${item.release_year})`
                  : item.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Notifications */}
      <div className="notification-container" ref={notifRef}>
        <button className="notification-icon" onClick={toggleNotifications}>
          🔔
        </button>
        {showNotifications && (
          <div className="notification-dropdown">
            {/* Community requests */}
            {notifications.length === 0 ? (
              <div className="notification-item">
                No community requests
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={`${n.community_id}-${n.user_id}`}
                  className="notification-item"
                >
                  <div>
                    <strong>{n.username}</strong> requested to join{" "}
                    <strong>{n.group_name}</strong>
                  </div>
                  <div className="notification-actions">
                    <button
                      onClick={() =>
                        handleRequest(n.user_id, n.community_id, "joined")
                      }
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleRequest(n.user_id, n.community_id, "rejected")
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Friend requests */}
            {friendRequests.length === 0 ? (
              <div className="notification-item">No friend requests</div>
            ) : (
              friendRequests.map((f) => (
                <div key={`friend-${f.user_id}`} className="notification-item">
                  <div>
                    <strong>{f.username}</strong> sent you a friend request
                  </div>
                  <div className="notification-actions">
                    <button
                      onClick={() =>
                        handleFriendRequest(f.user_id, "accepted")
                      }
                    >
                      Accept
                    </button>
                    <button
                      onClick={() =>
                        handleFriendRequest(f.user_id, "rejected")
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button onClick={() => navigate("/movies/profile")}>Profile</button>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default MoviesNavbar;
