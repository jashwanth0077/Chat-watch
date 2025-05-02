import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/config";
import "../css/moviesnavbar.css";

const MoviesNavbar = () => {
  const navigate = useNavigate();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("movie");
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const searchRef = useRef();

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/search-movies?query=${encodeURIComponent(searchTerm)}&type=${searchType}`,
          { method: "GET", credentials: "include" }
        );
        if (res.ok) {
          const { movies } = await res.json();
          setSearchResults(movies.slice(0, 5));
        }
      } catch (err) {
        console.error("Movie suggestion fetch error:", err);
      }
    }, 300);

    setDebounceTimer(timer);
  }, [searchTerm, searchType]);

  useEffect(() => {
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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

  return (
    <nav className="movies-navbar">
      <h1>VibeSync Movies</h1>
      <button onClick={() => navigate("/home")}>Common Home</button>
      <button onClick={() => navigate("/movies/home")}>Home</button>
      <button onClick={() => navigate("/movies/collections")}>My Movies</button>

      <div
        className="dropdown-container"
        onMouseEnter={() => setBrowseOpen(true)}
        onMouseLeave={() => setBrowseOpen(false)}
      >
        <button>Browse ▾</button>
        {browseOpen && (
          <div className="dropdown-menu">
            <button onClick={() => navigate("/movies/genres")}>Genres</button>
            <button onClick={() => navigate("/movies/new-releases")}>New Releases</button>
            <button onClick={() => navigate("/movies/top-rated")}>Top Rated</button>
          </div>
        )}
      </div>

      <div className="search-container" ref={searchRef}>
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            value={searchTerm}
            placeholder={`Search by ${searchType}`}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
          />
          <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
            <option value="movie">Title</option>
            <option value="director">Director</option>
          </select>
        </form>

        {showSuggestions && searchResults.length > 0 && (
          <ul className="suggestions-list">
            {searchResults.map((movie) => (
              <li
                key={movie.movie_id}
                onClick={() => {
                  navigate(`/movies/movie/${movie.movie_id}`);
                  setSearchTerm("");
                  setShowSuggestions(false);
                }}
              >
                {movie.title} ({movie.release_year})
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default MoviesNavbar;
