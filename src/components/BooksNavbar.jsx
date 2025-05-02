import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/config";
import "../css/booksnavbar.css";

const BooksNavbar = () => {
  const navigate = useNavigate();

  // dropdowns & search
  const [browseOpen, setBrowseOpen]       = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [searchTerm, setSearchTerm]       = useState("");
  const [searchType, setSearchType]       = useState("book");
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer]     = useState(null);

  // notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [pendingRequests, setPendingRequests]     = useState([]);
  const [notifications, setNotifications]         = useState([]);
  const [friendRequests, setFriendRequests]       = useState([]);

  // refs for outside-click
  const searchRef = useRef();
  const notifRef  = useRef();

  // ——————————————————————————————————————————  
  //  Search suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/search-suggestions?query=${encodeURIComponent(
            searchTerm
          )}&type=${searchType}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.books.slice(0, 5));
        }
      } catch (err) {
        console.error("Suggestion fetch error:", err);
      }
    }, 300);

    setDebounceTimer(timer);
  }, [searchTerm, searchType]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ——————————————————————————————————————————  
  //  Logout
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // ——————————————————————————————————————————  
  //  Fetch both community & friend requests
  const fetchNotifications = async () => {
    console.log("→ fetchNotifications() start");

    try {
      // 1) community join requests
      console.log("→ GET pending group requests:", `${apiUrl}/books/groups/pending-requests`);
      const grpRes = await fetch(`${apiUrl}/books/groups/pending-requests`, {
        credentials: "include",
      });
      console.log("→ group pending status:", grpRes.status);
      if (grpRes.ok) {
        const data = await grpRes.json();
        setPendingRequests(data.requests || []);
        setNotifications(data.requests || []);
      }

      // 2) friend requests
      console.log("→ GET friend requests:", `${apiUrl}/api/friend_requests`);
      const friendRes = await fetch(`${apiUrl}/api/friend_requests`, {
        credentials: "include",
      });
      console.log("→ friend_requests status:", friendRes.status);
      if (friendRes.ok) {
        const data = await friendRes.json();
        console.log("→ friend_requests JSON:", data);
        setFriendRequests(data.friendRequests || []);
      } else {
        console.warn("→ friend_requests fetch failed:", await friendRes.text());
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // Toggle dropdown, fetch on open
  const toggleNotifications = () => {
    console.log("🔔 Bell clicked, currently showNotifications =", showNotifications);
    if (!showNotifications) {
      fetchNotifications();
    }
    setShowNotifications((prev) => !prev);
  };

  // ——————————————————————————————————————————  
  //  Handle community accept/reject
  const handleRequest = async (userId, communityId, action) => {
    try {
      const res = await fetch(
        `${apiUrl}/books/groups/${communityId}/handle-request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, action }),
        }
      );
      if (res.ok) {
        setNotifications((prev) =>
          prev.filter((n) => !(n.user_id === userId && n.community_id === communityId))
        );
      } else {
        console.error("Request handling failed:", await res.text());
      }
    } catch (err) {
      console.error("Handle request error:", err);
    }
  };

  // ——————————————————————————————————————————  
  //  Handle friend accept/reject
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
      } else {
        console.error("Friend request handling failed.");
      }
    } catch (err) {
      console.error("Friend request error:", err);
    }
  };

  // ——————————————————————————————————————————  
  return (
    <nav className="books-navbar">
      <h1>VibeSync</h1>
      <button onClick={() => navigate("/home")}>Common Home</button>
      <button onClick={() => navigate("/books/home")}>Home</button>
      <button onClick={() => navigate("/books/bookshelf")}>My Books</button>

      {/* Browse Dropdown */}
      <div
        className="dropdown-container"
        onMouseEnter={() => setBrowseOpen(true)}
        onMouseLeave={() => setBrowseOpen(false)}
      >
        <button>Browse ▾</button>
        {browseOpen && (
          <div className="dropdown-menu">
            <button onClick={() => navigate("/books/genres")}>Genres</button>
            <button onClick={() => navigate("/books/new-releases")}>
              New Releases
            </button>
            <button onClick={() => navigate("/books/choice-awards")}>
              Choice Awards
            </button>
          </div>
        )}
      </div>

      {/* Community Dropdown */}
      <div
        className="dropdown-container"
        onMouseEnter={() => setCommunityOpen(true)}
        onMouseLeave={() => setCommunityOpen(false)}
      >
        <button>Community ▾</button>
        {communityOpen && (
          <div className="dropdown-menu">
            <button onClick={() => navigate("/books/groups")}>Groups</button>
            <button onClick={() => navigate("/books/friends")}>Friends</button>
            <button onClick={() => navigate("/books/people")}>People</button>
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
            <option value="book">Book</option>
            <option value="author">Author</option>
          </select>
        </form>
        {showSuggestions && searchResults.length > 0 && (
          <ul className="suggestions-list">
            {searchResults.map((b) => (
              <li
                key={b.book_id}
                onClick={() => {
                  navigate(`/books/book/${b.book_id}`);
                  setSearchTerm("");
                  setShowSuggestions(false);
                }}
              >
                {b.title} by {b.author_name}
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
              <div className="notification-item">No community requests</div>
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
                <div
                  key={`friend-${f.user_id}`}
                  className="notification-item"
                >
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

      <button onClick={() => navigate("/books/profile")}>Profile</button>
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default BooksNavbar;
