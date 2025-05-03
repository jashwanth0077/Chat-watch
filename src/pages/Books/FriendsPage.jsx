import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/friendspage.css";

const FriendsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [myFriends, setMyFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const navigate = useNavigate();

  // Fetch my friends on mount
  useEffect(() => {
    const fetchFriends = async () => {
      setFriendsLoading(true);
      try {
        const res = await fetch(`${apiUrl}/books/friends`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMyFriends(data.friends || []);
        }
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      } finally {
        setFriendsLoading(false);
      }
    };
    fetchFriends();
  }, []);

  // Search users by username
  useEffect(() => {
    if (!searchTerm.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `${apiUrl}/search_users?username=${encodeURIComponent(searchTerm)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [searchTerm]);

  return (
    <div className="groups-container">
      <div className="groups-layout">

        {/* Search Panel */}
        <div className="groups-left">
          <div className="group-card">
            <h2>Search Users</h2>
            <input
              type="text"
              placeholder="Search usernames..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div>
              {loading
                ? <p>Loading...</p>
                : users.map(u => (
                    <div key={u.user_id} className="user-card">
                      <span>{u.username}</span>
                      <button
                        onClick={() => navigate(
                          `/books/profile_page_not_for_friends/${u.username}`
                        )}
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Friends Panel */}
        <div className="groups-right">
          <div className="group-card">
            <h2>My Friends</h2>
            {friendsLoading
              ? <p>Loading...</p>
              : myFriends.length === 0
                ? <p>No friends added.</p>
                : myFriends.map(f => (
                    <div key={f.user_id} className="friend-card">
                      <span>{f.username}</span>
                      <button
                        onClick={() => navigate(
                          `/books/profile_page_not_for_friends/${f.username}`
                        )}
                      >
                        View Profile
                      </button>
                    </div>
                  ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FriendsPage;
