// src/components/ProfileWithReviewCounts.jsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";

const ProfileWithReviewCounts = () => {
  const navigate = useNavigate();

  // Profile + top-genres/authors + review counts
  const [profile, setProfile] = useState(null);
  const [topData, setTopData] = useState({ topBookGenres: [], topAuthors: [] });
  const [counts, setCounts] = useState({ bookReviews: 0, movieReviews: 0 });

  // Form & UI state
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    location: "",
    dob: "",
    contact: "",
  });

  // Fetch profile, top picks, and review counts in parallel
  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`${apiUrl}/profile`, {
        credentials: "include",
      });
      if (!res.ok) {
        navigate("/login");
        return null;
      }
      return res.json();
    };

    const fetchTop = async () => {
      const res = await fetch(`${apiUrl}/profile_top`, {
        credentials: "include",
      });
      if (!res.ok) return {};
      return res.json();
    };

    const fetchCounts = async () => {
      const [bookRes, movieRes] = await Promise.all([
        fetch(`${apiUrl}/profile/counts/books`, { credentials: "include" }),
        fetch(`${apiUrl}/profile/counts/movies`, { credentials: "include" }),
      ]);
      const bookData = bookRes.ok ? await bookRes.json() : { count: 0 };
      const movieData = movieRes.ok ? await movieRes.json() : { count: 0 };
      return { bookReviews: bookData.count, movieReviews: movieData.count };
    };

    Promise.all([fetchProfile(), fetchTop(), fetchCounts()])
      .then(([prof, topInfo, cnts]) => {
        if (!prof) return;
        setProfile(prof);
        setFormData({
          username: prof.username || "",
          location: prof.location || "",
          dob: prof.dob ? prof.dob.substring(0, 10) : "",
          contact: prof.contact || "",
        });

        // detect keys for top genres/authors
        const genreKey = Object.keys(topInfo).find((k) =>
          k.toLowerCase().includes("bookgenre")
        );
        const authorKey = Object.keys(topInfo).find((k) =>
          k.toLowerCase().includes("author")
        );
        setTopData({
          topBookGenres: topInfo[genreKey] ? [topInfo[genreKey]] : [],
          topAuthors: topInfo[authorKey] ? [topInfo[authorKey]] : [],
        });

        setCounts(cnts);
      })
      .catch((err) => {
        console.error("Error loading profile data:", err);
        navigate("/login");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleChange = (e) =>
    setFormData((fd) => ({ ...fd, [e.target.name]: e.target.value }));

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
      if (!res.ok) throw new Error(result.message || "Failed to update profile");

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
      contact: profile.contact || "",
    });
  };

  if (loading) return <p>Loading profile…</p>;
  if (!profile)
    return (
      <div className="profile-container">
        <p>Unable to load profile.</p>
        <button onClick={() => navigate("/books/home")}>Back to Home</button>
      </div>
    );

  return (
    <div className="profile-container" style={{ maxWidth: "500px", margin: "auto", padding: "1rem" }}>
      <h2>{profile.username}</h2>
      <div style={{ marginBottom: "1rem" }}>
        <strong>Book Reviews:</strong> {counts.bookReviews} &nbsp;|&nbsp;
        <strong>Movie Reviews:</strong> {counts.movieReviews}
      </div>

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

        <label>
          <strong>Interested Book Genres:</strong><br />
          <span>
            {topData.topBookGenres.length > 0
              ? topData.topBookGenres.join(", ")
              : "N/A"}
          </span>
        </label>
        <br /><br />

        <label>
          <strong>Picked Authors:</strong><br />
          <span>
            {topData.topAuthors.length > 0
              ? topData.topAuthors.join(", ")
              : "N/A"}
          </span>
        </label>
      </div>

      <div className="profile-actions" style={{ marginTop: "1rem" }}>
        <button onClick={() => navigate("/books/home")} style={{ marginRight: "0.5rem" }}>
          Back to Home
        </button>
        {editing ? (
          <>
            <button onClick={handleSave} disabled={saving} style={{ marginRight: "0.5rem" }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={handleCancel}>Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)}>Edit Profile</button>
        )}
      </div>
    </div>
  );
};

export default ProfileWithReviewCounts;
