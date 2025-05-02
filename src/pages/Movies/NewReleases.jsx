// frontend/src/pages/Movies/NewReleases.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./../../css/newreleases.css";
import { apiUrl } from "../../config/config";

const NewReleases = () => {
  const navigate = useNavigate();
  const [newMovies, setNewMovies] = useState([]);

  useEffect(() => {
    const fetchNewReleases = async () => {
      try {
        const response = await fetch(`${apiUrl}/movies/new-releases`, {
          method: "GET",
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setNewMovies(data.movies);
        }
      } catch (error) {
        console.error("Error fetching new movie releases:", error);
      }
    };

    fetchNewReleases();
  }, []);

  return (
    <div className="new-releases-container">
      <h1>New Movie Releases</h1>
      {newMovies.length === 0 ? (
        <p>No recent movies found.</p>
      ) : (
        <ul className="new-releases-list">
          {newMovies.map((movie) => (
            <li key={movie.movie_id}>
              <span
                className="book-link"
                onClick={() => navigate(`/movies/movie/${movie.movie_id}`)}
              >
                {movie.title}
              </span>{" "}
              ({movie.release_year})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NewReleases;
