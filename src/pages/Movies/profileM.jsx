import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";

const Profile = () => {
  const navigate = useNavigate();

  // State
  const [profile, setProfile] = useState(null);
  const [topData, setTopData] = useState({ topBookGenres: [], topAuthors: [] });
  const [counts, setCounts] = useState({ bookReviews: 0, movieReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ username: "", location: "", dob: "", contact: "" });

  useEffect(() => {
    async function fetchAll() {
      try {
        // Fetch profile
        const [profRes, topRes, bookCountRes, movieCountRes] = await Promise.all([
          fetch(`${apiUrl}/profile`, { credentials: 'include' }),
          fetch(`${apiUrl}/profile_top`, { credentials: 'include' }),
          fetch(`${apiUrl}/profile/counts/books`, { credentials: 'include' }),
          fetch(`${apiUrl}/profile/counts/movies`, { credentials: 'include' }),
        ]);

        if (!profRes.ok) return navigate('/login');
        const prof = await profRes.json();
        const top = topRes.ok ? await topRes.json() : {};
        const bookCnt = bookCountRes.ok ? (await bookCountRes.json()).count : 0;
        const movieCnt = movieCountRes.ok ? (await movieCountRes.json()).count : 0;

        setProfile(prof);
        setFormData({
          username: prof.username || "",
          location: prof.location || "",
          dob: prof.dob ? prof.dob.substring(0,10) : "",
          contact: prof.contact || "",
        });
        // parse top data keys
        const genreKey  = Object.keys(top).find(k=>k.toLowerCase().includes('bookgenre'));
        const authorKey = Object.keys(top).find(k=>k.toLowerCase().includes('author'));

        setTopData({
          topBookGenres: genreKey ? [top[genreKey]] : [],
          topAuthors:    authorKey ? [top[authorKey]] : []
        });

        setCounts({ bookReviews: bookCnt, movieReviews: movieCnt });
      } catch (err) {
        console.error(err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/save_edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setProfile(data);
      setEditing(false);
      alert('Profile updated successfully!');
      navigate('/movies/profile');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      username: profile.username || "",
      location: profile.location || "",
      dob: profile.dob ? profile.dob.substring(0,10) : "",
      contact: profile.contact || ""
    });
  };

  if (loading) return <p>Loading profile…</p>;
  if (!profile) return (
    <div className="profile-container">
      <p>Unable to load profile.</p>
      <button onClick={()=>navigate('/movies/home')}>Back to Home</button>
    </div>
  );

  return (
    <div className="profile-container" style={{maxWidth:'500px',margin:'auto',padding:'1rem'}}>
      <h2>{profile.username}</h2>
      <div style={{marginBottom:'1rem'}}>
        <strong>Book Reviews:</strong> {counts.bookReviews} &nbsp;|&nbsp;
        <strong>Movie Reviews:</strong> {counts.movieReviews}
      </div>

      <div className="profile-details">
        {/* Username */}
        <label>
          <strong>Username:</strong><br/>
          {editing
            ? <input type="text" name="username" value={formData.username} onChange={handleChange} style={{width:'100%'}}/>
            : <span>{profile.username}</span>
          }
        </label>
        <br/><br/>

        {/* Email */}
        <label>
          <strong>Email (login):</strong><br/>
          <span>{profile.email}</span>
        </label>
        <br/><br/>

        {/* DOB */}
        <label>
          <strong>Date of Birth:</strong><br/>
          {editing
            ? <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={{width:'100%'}}/>
            : profile.dob ? new Date(profile.dob).toLocaleDateString() : '—'
          }
        </label>
        <br/><br/>

        {/* Location */}
        <label>
          <strong>Location:</strong><br/>
          {editing
            ? <input type="text" name="location" value={formData.location} onChange={handleChange} style={{width:'100%'}}/>
            : profile.location || '—'
          }
        </label>
        <br/><br/>

        {/* Contact */}
        <label>
          <strong>Contact:</strong><br/>
          {editing
            ? <input type="text" name="contact" value={formData.contact} onChange={handleChange} style={{width:'100%'}}/>
            : profile.contact || '—'
          }
        </label>
        <br/><br/>

        {/* Top Genres & Authors */}
        <label>
          <strong>Top Book Genres:</strong><br/>
          <span>{counts && topData.topBookGenres.length>0 ? topData.topBookGenres.join(', ') : 'N/A'}</span>
        </label>
        <br/><br/>

        <label>
          <strong>Top Authors:</strong><br/>
          <span>{topData.topAuthors.length>0 ? topData.topAuthors.join(', ') : 'N/A'}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="profile-actions" style={{marginTop:'1rem'}}>
        <button onClick={()=>navigate('/movies/home')} style={{marginRight:'0.5rem'}}>Back to Home</button>
        {editing
          ? <>
              <button onClick={handleSave} disabled={saving} style={{marginRight:'0.5rem'}}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={handleCancel}>Cancel</button>
            </>
          : <button onClick={()=>setEditing(true)}>Edit Profile</button>
        }
      </div>
    </div>
  );
};

export default Profile;