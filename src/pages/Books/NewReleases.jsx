// frontend/src/pages/Books/NewReleases.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";  // ← use react-router-dom
import "./../../css/newreleases.css";
import { apiUrl } from '../../config/config';

const NewReleases = () => {
  const navigate = useNavigate();
  const [newBooks, setNewBooks] = useState([]);

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        const response = await fetch(`${apiUrl}/new-releases`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setNewBooks(data.books);
        }
      } catch (error) {
        console.error("Error fetching new releases:", error);
      }
    };

    fetchNewReleases();
  }, []);

  return (
    <div className="new-releases-container">
    <h1>New Releases</h1>
    {newBooks.length === 0 ? (
      <p>No recent books found.</p>
    ) : (
      <ul className="new-releases-list">
        {newBooks.map((book) => (
          <li key={book.book_id}>
            <span
              className="book-link"
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
  
  );
};

export default NewReleases;
