// frontend/src/pages/GenreSelection.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { apiUrl } from '../config/config';
import "../css/GenreSelection.css";

const GenreSelection = () => {
  const navigate = useNavigate();
  const [genres, setGenres] = useState([]);
  const [selected, setSelected] = useState({ books: [], movies: [] });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(`${apiUrl}/genres`, {
          credentials: 'include'
        });
        if (!resp.ok) throw new Error('Failed to load genres');
        setGenres(await resp.json());
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (type, id) => {
    setSelected(prev => {
      const list = prev[type].includes(id)
        ? prev[type].filter(x => x !== id)
        : [...prev[type], id];
      return { ...prev, [type]: list };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const responses = await Promise.all([
        fetch(`${apiUrl}/user/book-genres`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genres: selected.books })
        }),
        fetch(`${apiUrl}/user/movie-genres`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ genres: selected.movies })
        })
      ]);

      if (responses.every(r => r.ok)) {
        navigate("/home");
      } else {
        setError('Failed to save preferences');
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  if (loading) return <div className="genre-loading">Loading genres…</div>;

  return (
    <div className="genre-container">
      <div className="genre-box">
        <h2 className="genre-title">Select Your Favorite Genres</h2>
        {error && <div className="genre-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {['books', 'movies'].map(type => (
            <div key={type}>
              <h3 className="genre-section-title">{type} genres</h3>
              <div className="genre-checkbox-grid">
                {genres.map(({ genre_id, genre_name }) => (
                  <label key={`${type}-${genre_id}`} className="genre-checkbox">
                    <input
                      type="checkbox"
                      onChange={() => toggle(type, genre_id)}
                      checked={selected[type].includes(genre_id)}
                    />
                    {genre_name}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button type="submit" className="genre-submit-btn">
            Save Preferences
          </button>
        </form>
      </div>
    </div>
  );
};

export default GenreSelection;
