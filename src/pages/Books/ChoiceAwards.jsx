import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from '../../config/config';

import "../../css/choiceawardsbooks.css"; // Import the CSS file

const ChoiceAwards = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);

  useEffect(() => {
    const fetchChoiceAwards = async () => {
      try {
        const res = await fetch(`${apiUrl}/choice-awards`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setBooks(data.books);
        }
      } catch (error) {
        console.error("Error fetching choice awards:", error);
      }
    };

    fetchChoiceAwards();
  }, []);

  return (
    <div className="choice-awards-container">
      <h1>Choice Awards</h1>
      {books.length === 0 ? (
        <p>No award-winning books available yet.</p>
      ) : (
        <ul className="choice-awards-list">
          {books.map((book) => (
            <li key={book.book_id}>
              <span
                className="book-title"
                onClick={() => navigate(`/book/${book.book_id}`)}
              >
                {book.title}
              </span>{" "}
              ({book.publication_year})
              <div className="rating-info">
                Rating: {book.avg_rating.toFixed(2)} ({book.review_count} reviews)
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ChoiceAwards;
