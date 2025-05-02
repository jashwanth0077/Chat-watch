import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import './../../css/moviegenre.css'; // ✅ Import movies-specific CSS

const Genres = () => {
  const navigate = useNavigate();
  const [genreQuery, setGenreQuery] = useState("");
  const [genres, setGenres] = useState([]);
  const [moviesByGenre, setMoviesByGenre] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const suggestionsRef = useRef();

  useEffect(() => {
    const fetchDefaultGenres = async () => {
      try {
        const res = await fetch(`${apiUrl}/movies/default-genres`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setGenres(data.genres);
          setMoviesByGenre(data.movies_by_genre);
        }
      } catch (error) {
        console.error("Error fetching default movie genres:", error);
      }
    };
    fetchDefaultGenres();
  }, []);

  useEffect(() => {
    if (!genreQuery.trim()) {
      setSuggestions([]);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/movies/genre-suggestions?query=${encodeURIComponent(genreQuery)}`,
          { method: "GET", credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error("Error fetching genre suggestions:", err);
      }
    }, 300);

    setDebounceTimer(timer);
  }, [genreQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGenreMovies = async (genreName) => {
    try {
      const res = await fetch(
        `${apiUrl}/movies/search-genre?query=${encodeURIComponent(genreName)}`,
        { method: "GET", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setGenres([data.genre]);
        setMoviesByGenre({ [data.genre.genre_name]: data.movies });
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error searching movie genre:", error);
    }
  };

  const handleGenreSearch = (e) => {
    e.preventDefault();
    if (genreQuery) {
      fetchGenreMovies(genreQuery);
    }
  };

  return (
    <div className="movies-container">
      <h1>Browse Movies by Genre</h1>

      <form onSubmit={handleGenreSearch} className="movie-form" ref={suggestionsRef}>
        <input
          type="text"
          placeholder="Search movie genres"
          value={genreQuery}
          onChange={(e) => setGenreQuery(e.target.value)}
          className="movie-input"
        />
        <button type="submit" className="movie-search-button">
          Search
        </button>

        {suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((suggestion, idx) => (
              <li
                key={idx}
                className="suggestion-item"
                onClick={() => {
                  setGenreQuery(suggestion);
                  fetchGenreMovies(suggestion);
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </form>

      {Object.keys(moviesByGenre).length === 0 ? (
        <p>No genres/movies found.</p>
      ) : (
        Object.entries(moviesByGenre).map(([genreName, movies]) => (
          <div key={genreName} className="movie-section">
            <h2>{genreName}</h2>
            <ul>
              {movies.map((movie) => (
                <li key={movie.movie_id}>
                  <strong
                    className="clickable-title"
                    onClick={() => navigate(`/movies/movie/${movie.movie_id}`)}
                  >
                    {movie.title}
                  </strong>{" "}
                  ({movie.release_year})
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default Genres;
