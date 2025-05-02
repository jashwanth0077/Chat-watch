import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from '../../config/config';
import './../../css/bookshelf.css';

const Bookshelves = () => {
  const navigate = useNavigate();
  const [shelves, setShelves] = useState([]);
  const [expandedShelf, setExpandedShelf] = useState(null);
  const [booksInShelves, setBooksInShelves] = useState({});
  const [newShelfName, setNewShelfName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedShelfForAdd, setSelectedShelfForAdd] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [pastSearches, setPastSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef();

  useEffect(() => {
    const fetchBookshelves = async () => {
      try {
        const response = await fetch(`${apiUrl}/bookshelves`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setShelves(data.bookshelves);
        }
      } catch (error) {
        console.error("Error fetching bookshelves:", error);
      }
    };
    fetchBookshelves();
  }, []);

  useEffect(() => {
    const handleClickOutside = e => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleShelf = async shelfId => {
    if (expandedShelf === shelfId) {
      setExpandedShelf(null);
    } else {
      setExpandedShelf(shelfId);
      if (!booksInShelves[shelfId]) {
        try {
          const res = await fetch(`${apiUrl}/bookshelves/${shelfId}/books`, {
            method: "GET",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            setBooksInShelves(prev => ({ ...prev, [shelfId]: data.books }));
          }
        } catch (err) {
          console.error("Error fetching books in shelf:", err);
        }
      }
    }
  };

  const handleCreateShelf = async e => {
    e.preventDefault();
    if (!newShelfName) return;
    try {
      const response = await fetch(`${apiUrl}/bookshelves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newShelfName }),
      });
      if (response.ok) {
        const data = await response.json();
        setShelves([...shelves, data.bookshelf]);
        setNewShelfName("");
      }
    } catch (error) {
      console.error("Error creating bookshelf:", error);
    }
  };

  const handleAddBook = async bookId => {
    if (!selectedShelfForAdd) return;
    try {
      const response = await fetch(`${apiUrl}/bookshelves/${selectedShelfForAdd}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ book_id: bookId }),
      });
      if (response.ok) {
        alert("Book added successfully");
        const res = await fetch(`${apiUrl}/bookshelves/${selectedShelfForAdd}/books`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBooksInShelves(prev => ({
            ...prev,
            [selectedShelfForAdd]: data.books,
          }));
        }
        setSearchResults([]);
        setSearchTerm("");
      }
    } catch (error) {
      console.error("Error adding book to bookshelf:", error);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceTimer) clearTimeout(debounceTimer);

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`${apiUrl}/search-books?query=${encodeURIComponent(searchTerm)}`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.books);
        }
      } catch (error) {
        console.error("Error searching books:", error);
      }
    }, 300);

    setDebounceTimer(timer);
  }, [searchTerm]);

  const handleSearchFocus = () => {
    if (pastSearches.length) setShowSuggestions(true);
  };

  const handleSearchSelect = term => {
    setSearchTerm(term);
    setShowSuggestions(false);
  };

  const storeSearch = term => {
    if (!pastSearches.includes(term)) {
      setPastSearches(prev => [term, ...prev.slice(0, 4)]);
    }
  };

  return (
    <div className="bookshelves-container">
      <h1>My Bookshelves</h1>

      <section>
        <h2>Create a New Bookshelf</h2>
        <form onSubmit={handleCreateShelf} style={{ gap: "1rem", display: "flex", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Shelf Name"
            value={newShelfName}
            onChange={e => setNewShelfName(e.target.value)}
          />
          <button type="submit">Create Shelf</button>
        </form>
      </section>

      <section className="search-section">
        <h2>Search Books</h2>
        <div ref={searchRef} className="search-box-wrapper">
          <div className="search-controls">
            <input
              type="text"
              placeholder="Search by title or author"
              value={searchTerm}
              onFocus={handleSearchFocus}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <select
              value={selectedShelfForAdd || ""}
              onChange={e => setSelectedShelfForAdd(e.target.value)}
            >
              <option value="">Select Shelf</option>
              {shelves.map(shelf => (
                <option key={shelf.bookshelf_id} value={shelf.bookshelf_id}>
                  {shelf.name}
                </option>
              ))}
            </select>
          </div>

          {showSuggestions && pastSearches.length > 0 && (
            <ul className="suggestions">
              {pastSearches.map((s, i) => (
                <li key={i} onClick={() => handleSearchSelect(s)}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>

        {searchResults.length > 0 && (
          <ul className="search-results">
            {searchResults.map(book => (
              <li key={book.book_id}>
                <span
                  className="book-link"
                  onClick={() => {
                    storeSearch(searchTerm);
                    navigate(`/books/book/${book.book_id}`);
                  }}
                >
                  {book.title}
                </span>{" "}
                ({book.publication_year})
                <button onClick={() => handleAddBook(book.book_id)} style={{ marginLeft: "10px" }}>
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bookshelves-list">
        <h2>Your Bookshelves</h2>
        {shelves.map(shelf => (
          <div key={shelf.bookshelf_id}>
            <button onClick={() => toggleShelf(shelf.bookshelf_id)}>
              {expandedShelf === shelf.bookshelf_id ? "▼" : "▶"} {shelf.name}
            </button>
            {expandedShelf === shelf.bookshelf_id && (
              <ul>
                {(booksInShelves[shelf.bookshelf_id] || []).map(book => (
                  <li key={book.book_id}>
                    <span
                      className="book-title"
                      onClick={() => navigate(`/books/book/${book.book_id}`)}
                    >
                      {book.title}
                    </span>{" "}
                    ({book.publication_year})
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default Bookshelves;
