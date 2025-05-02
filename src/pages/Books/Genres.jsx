import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from '../../config/config';
import './../../css/genre.css'; // ✅ Import the CSS

const Genres = () => {
  const navigate = useNavigate();
  const [genreQuery, setGenreQuery] = useState("");
  const [genres, setGenres] = useState([]);
  const [booksByGenre, setBooksByGenre] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const suggestionsRef = useRef();

  useEffect(() => {
    const fetchDefaultGenres = async () => {
      try {
        const res = await fetch(`${apiUrl}/default-genres`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setGenres(data.genres);
          setBooksByGenre(data.books_by_genre);
        }
      } catch (error) {
        console.error("Error fetching default genres:", error);
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
          `${apiUrl}/genre-suggestions?query=${encodeURIComponent(genreQuery)}`,
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

  const fetchGenreBooks = async (genreName) => {
    try {
      const res = await fetch(
        `${apiUrl}/search-genre?query=${encodeURIComponent(genreName)}`,
        { method: "GET", credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setGenres([data.genre]);
        setBooksByGenre({ [data.genre.genre_name]: data.books });
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error searching genre:", error);
    }
  };

  const handleGenreSearch = (e) => {
    e.preventDefault();
    if (genreQuery) {
      fetchGenreBooks(genreQuery);
    }
  };

  return (
    <div className="genres-container">
      <h1>Browse by Genre</h1>

      <form onSubmit={handleGenreSearch} className="genre-form" ref={suggestionsRef}>
        <input
          type="text"
          placeholder="Search genres by name"
          value={genreQuery}
          onChange={(e) => setGenreQuery(e.target.value)}
          className="genre-input"
        />
        <button type="submit" className="genre-search-button">
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
                  fetchGenreBooks(suggestion);
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </form>

      {Object.keys(booksByGenre).length === 0 ? (
        <p>No genres/books found.</p>
      ) : (
        Object.entries(booksByGenre).map(([genreName, books]) => (
          <div key={genreName} className="genre-section">
            <h2>{genreName}</h2>
            <ul>
              {books.map((book) => (
                <li key={book.book_id}>
                  <strong
                    className="clickable-title"
                    onClick={() => navigate(`/books/book/${book.book_id}`)}
                  >
                    {book.title}
                  </strong>{" "}
                  ({book.publication_year})
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
