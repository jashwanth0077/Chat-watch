// frontend/src/components/CommonNavbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/config";

// Configuration for each section
const navConfig = {
  books: {
    title: "VibeSync",
    basePath: "/books",
    homeLabel: "Home",
    homePath: "/books/home",
    collectionsLabel: "My Books",
    collectionsPath: "/books/bookshelf",
    browseItems: [
      { label: "Genres",    path: "/books/genres" },
      { label: "New Releases", path: "/books/new-releases" },
      { label: "Choice Awards", path: "/books/choice-awards" }
    ],
    search: {
      endpoint: "/search-suggestions",
      typeOptions: [
        { value: "book", label: "Book" },
        { value: "author", label: "Author" }
      ],
      resultKey: "books",
      idKey: "book_id",
      displayFn: (item) => `${item.title} by ${item.author_name}`,
      detailPath: (id) => `/books/book/${id}`
    }
  },
  movies: {
    title: "VibeSync Movies",
    basePath: "/movies",
    homeLabel: "Home",
    homePath: "/movies/home",
    collectionsLabel: "My Movies",
    collectionsPath: "/movies/collections",
    browseItems: [
      { label: "Genres",      path: "/movies/genres" },
      { label: "New Releases", path: "/movies/new-releases" },
      { label: "Top Rated",    path: "/movies/top-rated" }
    ],
    search: {
      endpoint: "/search-movies",
      typeOptions: [
        { value: "movie",    label: "Title" },
        { value: "director", label: "Director" }
      ],
      resultKey: "movies",
      idKey: "movie_id",
      displayFn: (item) => `${item.title} (${item.release_year})`,
      detailPath: (id) => `/movies/movie/${id}`
    }
  }
};

const CommonNavbar = ({ section }) => {
  const cfg = navConfig[section];
  const navigate = useNavigate();
  const [browseOpen, setBrowseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState(cfg.search.typeOptions[0].value);
  const [results, setResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [timer, setTimer] = useState(null);
  const searchRef = useRef();

  // Fetch suggestions
  useEffect(() => {
    if (!searchTerm.trim()) return setResults([]);
    if (timer) clearTimeout(timer);
    setTimer(
      setTimeout(async () => {
        try {
          const res = await fetch(
            `${apiUrl}${cfg.search.endpoint}?query=${encodeURIComponent(searchTerm)}&type=${searchType}`,
            { method: "GET", credentials: "include" }
          );
          if (res.ok) {
            const data = await res.json();
            setResults(data[cfg.search.resultKey].slice(0, 5));
          }
        } catch (e) {
          console.error("Search error:", e);
        }
      }, 300)
    );
  }, [searchTerm, searchType]);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const logout = async () => {
    try {
      const res = await fetch(`${apiUrl}/logout`, { method: "POST", credentials: "include" });
      if (res.ok) navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  return (
    <nav className="navbar" style={{ display: "flex", gap: 10, alignItems: "center", padding: 10 }}>
      <h1>{cfg.title}</h1>
      <button onClick={() => navigate("/")}>Common Home</button>
      <button onClick={() => navigate(cfg.homePath)}>{cfg.homeLabel}</button>
      <button onClick={() => navigate(cfg.collectionsPath)}>{cfg.collectionsLabel}</button>

      <div style={{ position: "relative" }} onMouseEnter={() => setBrowseOpen(true)} onMouseLeave={() => setBrowseOpen(false)}>
        <button>Browse ▾</button>
        {browseOpen && (
          <div style={{ position: "absolute", top: "100%", left: 0, display: "flex", flexDirection: "column", backgroundColor: "white", border: "1px solid #ccc", zIndex: 1000, minWidth: 160 }}>
            {cfg.browseItems.map((item) => (
              <button key={item.path} onClick={() => navigate(item.path)}>{item.label}</button>
            ))}
          </div>
        )}
      </div>

      <div ref={searchRef} style={{ position: "relative" }}>
        <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", gap: 5 }}>
          <input
            type="text"
            value={searchTerm}
            placeholder={`Search by ${searchType}`}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            style={{ padding: 6 }}
          />
          <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
            {cfg.search.typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </form>

        {showSuggestions && results.length > 0 && (
          <ul style={{ position: "absolute", top: "100%", left: 0, width: "100%", backgroundColor: "white", border: "1px solid #ccc", listStyle: "none", margin: 0, padding: 0, zIndex: 1000 }}>
            {results.map((item) => (
              <li
                key={item[cfg.search.idKey]}
                onClick={() => { navigate(cfg.search.detailPath(item[cfg.search.idKey])); setSearchTerm(""); setShowSuggestions(false); }}
                style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                {cfg.search.displayFn(item)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button onClick={logout}>Logout</button>
    </nav>
  );
};

export default CommonNavbar;
