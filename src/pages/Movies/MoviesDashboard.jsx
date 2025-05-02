import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { apiUrl } from '../../config/config';
import Navbar from '../../components/Navbar';

const DashboardMovies = () => {
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
          navigate("/loginMovies");
        }
      } catch (error) {
        console.error("Error checking login status:", error);
        navigate("/loginMovies");
      }
    };
    checkStatus();
  }, [navigate]);

  // Fetch movie recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`${apiUrl}/recommendationsMovies`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations);
        } else {
          console.error("Error fetching movie recommendations");
        }
      } catch (error) {
        console.error("Error fetching movie recommendations:", error);
      }
    };

    fetchRecommendations();
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>
        <h1>Hi {username}!</h1>
        <div>Welcome to the Movies Dashboard</div>

        <h2>Recommended Movies</h2>
        {recommendations.length === 0 ? (
          <p>No recommendations available at the moment.</p>
        ) : (
          <ul>
            {recommendations.map((movie) => (
              <li key={movie.movie_id} style={{ marginBottom: "15px" }}>
                <strong
                  style={{ cursor: "pointer", color: "blue" }}
                  onClick={() => navigate(`/movie/${movie.movie_id}`)}
                >
                  {movie.title}
                </strong>{" "}
                ({movie.release_year})<br />
                Directors: {movie.directors.map((d) => d.name).join(", ")}<br />
                Genres: {movie.genres.map((g) => g.genre_name).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DashboardMovies;
