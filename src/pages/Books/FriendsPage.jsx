import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";

const FriendsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchTerm.length === 0) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        // Send the search term to the backend API
        const res = await fetch(`${apiUrl}/search_users?username=${searchTerm}`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchTerm]);

  return (
    <div className="friends-container">
      <h2>Search for Users</h2>

      <input
        type="text"
        placeholder="Search for usernames..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          users.map((user) => (
            <div key={user.username} className="user-card">
              <h3>{user.username}</h3>
              <button onClick={() => navigate(`/books/profile_page_not_for_friends/${user.username}`)}>
  View Profile
</button>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
