// MovieCollections.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/movecollections.css";

const MovieCollections = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState([]);
  const [expandedCollection, setExpandedCollection] = useState(null);
  const [moviesInCollections, setMoviesInCollections] = useState({});
  const [newCollectionName, setNewCollectionName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCollectionForAdd, setSelectedCollectionForAdd] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [pastSearches, setPastSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/movie-collections`, {
          credentials: "include",
        });
        if (res.ok) {
          const { collections } = await res.json();
          setCollections(collections || []);
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${apiUrl}/search-movies?query=${encodeURIComponent(searchTerm)}&type=movie`,
          { credentials: "include" }
        );
        if (res.ok) {
          const { movies } = await res.json();
          setSearchResults(movies || []);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    setDebounceTimer(timer);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const onClickOutside = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleCreateCollection = async e => {
    e.preventDefault();
    const name = newCollectionName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${apiUrl}/movie-collections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const { collection } = await res.json();
        setCollections(prev => [collection, ...prev]);
        setNewCollectionName("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const storeSearch = term => {
    setPastSearches(prev =>
      prev.includes(term) ? prev : [term, ...prev].slice(0, 5)
    );
  };

  const handleAddMovie = async movieId => {
    if (!selectedCollectionForAdd) return;
    try {
      const res = await fetch(
        `${apiUrl}/movie-collections/${selectedCollectionForAdd}/movies`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ movie_id: movieId }),
        }
      );
      if (res.ok) {
        await toggleCollection(selectedCollectionForAdd, true);
        setSearchTerm("");
        setSearchResults([]);
        storeSearch(searchTerm);
        alert("Movie added successfully");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCollection = async (id, forceReload = false) => {
    if (expandedCollection === id && !forceReload) {
      setExpandedCollection(null);
      return;
    }
    setExpandedCollection(id);
    if (forceReload || !moviesInCollections[id]) {
      try {
        const res = await fetch(
          `${apiUrl}/movie-collections/${id}/movies`,
          { credentials: "include" }
        );
        if (res.ok) {
          const { movies } = await res.json();
          setMoviesInCollections(prev => ({
            ...prev,
            [id]: movies || [],
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="movie-collections">
      <h1>My Movie Collections</h1>

      <form className="form-inline" onSubmit={handleCreateCollection}>
        <input
          type="text"
          placeholder="New collection name"
          value={newCollectionName}
          onChange={e => setNewCollectionName(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>

      <div className="search-section" ref={searchRef}>
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search movies..."
            value={searchTerm}
            onFocus={() => pastSearches.length && setShowSuggestions(true)}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select
            value={selectedCollectionForAdd || ""}
            onChange={e => setSelectedCollectionForAdd(e.target.value)}
          >
            <option value="">Select collection</option>
            {collections.map(col => (
              <option key={col.collection_id} value={col.collection_id}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        {showSuggestions && (
          <ul className="suggestions">
            {pastSearches.map((s, i) => (
              <li key={i} onClick={() => setSearchTerm(s)}>
                {s}
              </li>
            ))}
          </ul>
        )}

        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(m => (
              <li key={m.movie_id}>
                <Link
                  to={`/movies/movie/${m.movie_id}`}
                  onClick={() => storeSearch(searchTerm)}
                >
                  {m.title} ({m.release_year})
                </Link>
                <button onClick={() => handleAddMovie(m.movie_id)}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>Your Collections</h2>
      <div className="collections-list">
        {collections.map(col => (
          <div key={col.collection_id} className="collection-card">
            <button
              className="collection-header"
              onClick={() => toggleCollection(col.collection_id)}
              aria-expanded={expandedCollection === col.collection_id}
            >
              <span className="arrow">▶</span> {col.name}
            </button>
            {expandedCollection === col.collection_id && (
              <ul className="collection-list">
                {moviesInCollections[col.collection_id]?.map(m => (
                  <li key={m.movie_id}>
                    <Link to={`/movies/movie/${m.movie_id}`}>
                      {m.title} ({m.release_year})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovieCollections;
