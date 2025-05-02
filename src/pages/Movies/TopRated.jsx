/* frontend/src/pages/Movies/TopRated.jsx */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/topratedmovies.css";

const TopRated = () => {
  const [topMovies, setTopMovies] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopRatedMovies = async () => {
      try {
        const res = await fetch(`${apiUrl}/movies/top-rated`, {
          method: "GET",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setTopMovies(data.movies);
        }
      } catch (err) {
        console.error("Failed to fetch top-rated movies:", err);
      }
    };

    fetchTopRatedMovies();
  }, []);

  return (
    <div className="toprated-container">
      <h1>Top Rated Movies</h1>
      {topMovies.length === 0 ? (
        <p>No top-rated movies available.</p>
      ) : (
        <ul className="toprated-list">
          {topMovies.map((movie) => (
            <li key={movie.movie_id} className="toprated-item">
              <span
                className="movie-title"
                onClick={() => navigate(`/movies/movie/${movie.movie_id}`)}
              >
                {movie.title}
              </span>{" "}
              ({movie.release_year})
              <div className="rating-info">
                Rating: {movie.avg_rating.toFixed(2)} ({movie.review_count} reviews)
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TopRated;
