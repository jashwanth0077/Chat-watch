import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [topData, setTopData] = useState({ topBookGenres: [], topAuthors: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    location: "",
    dob: "",
    contact: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${apiUrl}/profile`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          navigate("/login");
          return;
        }
        const data = await res.json();
        setProfile(data);
        setFormData({
          username: data.username || "",
          location: data.location || "",
          dob: data.dob ? data.dob.substring(0, 10) : "",
          contact: data.contact || ""
        });
      } catch (err) {
        console.error("Failed to load profile:", err);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    const fetchTopData = async () => {
      try {
        const res = await fetch(`${apiUrl}/profile_top`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          console.log("profile_top raw JSON string:", JSON.stringify(data, null, 2));

          // Dynamically check the keys and log them for debugging
          const genreKey = Object.keys(data).find(key => key.toLowerCase().includes("bookgenre"));
          const authorKey = Object.keys(data).find(key => key.toLowerCase().includes("author"));
          
          console.log("Detected keys:", Object.keys(data));
          console.log(`→ using genreKey: ${genreKey}`);
          console.log(`→ using authorKey: ${authorKey}`);
          
          // Ensure you correctly assign the values from the fetched data
          setTopData({
            topBookGenres: data[genreKey] ? [data[genreKey]] : [], // make sure to handle cases where the genre is "N/A"
            topAuthors: data[authorKey] ? [data[authorKey]] : [],  // same for authors
          });
        }
      } catch (err) {
        console.error("Failed to load top data:", err);
      }
    };

    fetchProfile();
    fetchTopData();
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/save_edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Failed to update profile");
      }

      setProfile(result);
      setEditing(false);

      alert("Profile updated successfully!");
      navigate("/books/profile");

    } catch (err) {
      console.error("Error saving profile:", err);
      alert(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      username: profile.username || "",
      location: profile.location || "",
      dob: profile.dob ? profile.dob.substring(0, 10) : "",
      contact: profile.contact || ""
    });
  };

  if (loading) {
    return <p>Loading profile…</p>;
  }

  if (!profile) {
    return (
      <div className="profile-container">
        <p>Unable to load profile.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  return (
    <div className="profile-container" style={{ maxWidth: "500px", margin: "auto", padding: "1rem" }}>
      <h2>Your Profile</h2>

      <div className="profile-details">
        <label>
          <strong>Username:</strong><br />
          {editing ? (
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          ) : (
            <span>{profile.username}</span>
          )}
        </label>
        <br /><br />

        <label>
          <strong>Email (login):</strong><br />
          <span>{profile.email}</span>
        </label>
        <br /><br />

        <label>
          <strong>Date of Birth:</strong><br />
          {editing ? (
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          ) : profile.dob ? new Date(profile.dob).toLocaleDateString() : "—"}
        </label>
        <br /><br />

        <label>
          <strong>Location:</strong><br />
          {editing ? (
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          ) : (
            profile.location || "—"
          )}
        </label>
        <br /><br />

        <label>
          <strong>Contact:</strong><br />
          {editing ? (
            <input
              type="text"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              style={{ width: "100%" }}
            />
          ) : (
            profile.contact || "—"
          )}
        </label>
        <br /><br />

        {/* New section for top genres and authors */}
        <label>
          <strong>Top Book Genres:</strong><br />
          <span>{topData.topBookGenres && topData.topBookGenres.length > 0
            ? topData.topBookGenres.join(", ")
            : "N/A"}</span>
        </label>
        <br /><br />

        <label>
          <strong>Top Authors:</strong><br />
          <span>{topData.topAuthors && topData.topAuthors.length > 0
            ? topData.topAuthors.join(", ")
            : "N/A"}</span>
        </label>
      </div>

      <div className="profile-actions" style={{ marginTop: "1rem" }}>
        <button onClick={() => navigate("/home")} style={{ marginRight: "0.5rem" }}>
          Back to Home
        </button>
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ marginRight: "0.5rem" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleCancel}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
