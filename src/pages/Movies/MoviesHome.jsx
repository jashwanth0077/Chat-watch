/* frontend/src/pages/Movies/MoviesHome.jsx */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/movieshome.css";

const MoviesHome = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [recommendations, setRecommendations] = useState([]);

  // Check login status
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

  // Fetch movie recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`${apiUrl}/movies/recommendations`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        } else {
          console.error("Failed to fetch movie recommendations.");
        }
      } catch (error) {
        console.error("Error fetching movie recommendations:", error);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div className="movies-home-container">
      <div className="movies-home-box">
        <h1>Welcome, {username}!</h1>
        <h2>Discover movies you'll love based on your preferences.</h2>

        <h3>Recommended Movies</h3>
        {recommendations.length === 0 ? (
          <p>No recommendations available at the moment.</p>
        ) : (
          recommendations.map((movie) => (
            <div
              key={movie.movie_id}
              className="movie-recommendation"
              onClick={() => navigate(`/movies/movie/${movie.movie_id}`)}
            >
              {movie.title}
              {movie.release_year && ` (${movie.release_year})`}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MoviesHome;