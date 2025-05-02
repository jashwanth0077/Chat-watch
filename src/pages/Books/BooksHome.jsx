import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "./../../css/bookhome.css"; // Import your dedicated CSS

const BooksHome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/isLoggedIn`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUsername(data.username);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        navigate("/login");
      }
    };

    checkLoginStatus();
  }, [navigate]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`${apiUrl}/recommendations`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        } else {
          console.error("Failed to fetch book recommendations.");
        }
      } catch (error) {
        console.error("Error fetching book recommendations:", error);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div className="books-home-container">
      <div className="books-home-box">
        <h1>Welcome, {username}!</h1>
        <h2>Discover books you'll love based on your preferences.</h2>

        <h3>Recommended Books</h3>
        {recommendations.length === 0 ? (
          <p>No recommendations available at the moment.</p>
        ) : (
          recommendations.map((book) => (
            <div
              key={book.book_id}
              className="book-recommendation"
              onClick={() => navigate(`/books/book/${book.book_id}`)}
            >
              {book.title}
              {book.publication_year && ` (${book.publication_year})`}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BooksHome;
