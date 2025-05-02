import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";

import { apiUrl } from '../../config/config';

const Dashboard = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("User");
  const [recommendations, setRecommendations] = useState([]);

  // Check login status and get the username.
  useEffect(() => {
    const checkStatus = async () => {
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
    checkStatus();
  }, [navigate]);

  // Fetch recommendations based on the user's bookshelves.
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`${apiUrl}/recommendations`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations);
        } else {
          console.error("Error fetching recommendations");
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div>
      <h1>Hi {username}!</h1>
      <div>Welcome to the Ecommerce App</div>

      <h2>Recommended Books</h2>
      {recommendations.length === 0 ? (
        <p>No recommendations available at the moment.</p>
      ) : (
        <ul>
          {recommendations.map((book) => (
            <li key={book.book_id}>
              <strong
              style={{ cursor: "pointer", color: "blue" }}
  onClick={() => navigate(`/book/${book.book_id}`)}>{book.title}</strong> ({book.publication_year})<br />
              ISBN: {book.isbn}
              <br />
              Authors: {book.authors.map((author) => author.name).join(", ")}
              <br />
              Genres: {book.genres.map((genre) => genre.genre_name).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Dashboard;
