import React from "react";
import { useNavigate } from "react-router";
import "./../css/common_home.css"; // Import the CSS file

const CommonHome = () => {
  const navigate = useNavigate();

  const handleBooksClick = () => {
    // Redirect to BooksHome using the correct path
    navigate("/books/home");
  };

  const handleMoviesClick = () => {
    // Redirect to MoviesHome using the correct path
    navigate("/movies/home");
  };

  return (
    <div className="common-home-container">
      <div className="common-home-box">
        <h1>VibeSync</h1>
        <h2>Your Personal Books & Movies Collection</h2>
        <p>Please select your section:</p>
        <div className="button-container">
          <button onClick={handleBooksClick} className="section-button books-button">
            <span className="button-icon">📚</span>
            <span>Books</span>
          </button>
          <button onClick={handleMoviesClick} className="section-button movies-button">
            <span className="button-icon">🎬</span>
            <span>Movies</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommonHome;