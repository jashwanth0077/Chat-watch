// MovieDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from "../../config/config";
import "../../css/moviedetail.css";

// Static star display (used for average and other users' ratings)
const StarRating = ({ rating, size = "1rem" }) => {
  const pct = Math.max(0, Math.min(rating, 5)) / 5 * 100;
  return (
    <span style={{ position: "relative", display: "inline-block", fontSize: size, lineHeight: 1 }}>
      <span style={{ color: "#ddd", display: "inline-block", whiteSpace: "nowrap" }}>★★★★★</span>
      <span style={{
        position: "absolute", top: 0, left: 0,
        overflow: "hidden", whiteSpace: "nowrap",
        width: `${pct}%`, color: "gold"
      }}>★★★★★</span>
    </span>
  );
};

// Interactive star input
const InteractiveStarRating = ({ value, onChange, size = "1.5rem" }) => {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="interactive-stars">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(star)}
          style={{
            fontSize: size,
            color: (hovered || value) >= star ? "gold" : "#ddd",
            transition: "color 0.2s",
          }}
        >★</span>
      ))}
    </div>
  );
};

const MovieDetail = () => {
  const { movieId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [reviewMsg, setReviewMsg] = useState("");
  const [avgRating, setAvgRating] = useState(null);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [poster, setPoster] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${apiUrl}/movie/${movieId}`, { credentials: "include" });
        if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
        const data = await res.json();

        setMovie(data.movie);
        setHasRated(data.hasRated);
        setUserRating(data.userRating ?? 5);
        setReviewMsg(data.reviewMessage || "");
        setAvgRating(data.averageRating);
        setCount(data.totalReviews);
        setReviews(data.reviews);
      } catch (e) {
        console.error(e);
        setErr(e.message);
      }
    };
    load();
  }, [movieId]);

  useEffect(() => {
    if (!movie?.title) return;
    const fetchPoster = async () => {
      const apiKey = process.env.REACT_APP_TMDB_KEY;
      if (!apiKey) return console.error("TMDB API key missing");
      try {
        const searchRes = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(movie.title)}`
        );
        const searchData = await searchRes.json();
        const result = searchData.results?.[0];
        if (result?.poster_path) {
          setPoster(`https://image.tmdb.org/t/p/w500${result.poster_path}`);
        }
      } catch (e) {
        console.error("Error fetching poster:", e);
      }
    };
    fetchPoster();
  }, [movie?.title]);

  const submitReview = async e => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/movie/${movieId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: userRating, message: reviewMsg }),
      });
      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message);
      }
      const result = await res.json();
      setAvgRating(result.averageRating);
      setCount(result.totalReviews);
      setReviews(result.reviews);
      setHasRated(true);
    } catch (e) {
      console.error(e);
      setErr(e.message);
    }
  };

  if (err) return <div className="error-message">Error: {err}</div>;
  if (!movie) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div className="movie-detail-overlay">
      <div className="movie-detail-container">
        <div className="movie-detail-content-wrapper">
          {poster ? (
            <img src={poster} alt="Poster" className="movie-detail-poster" />
          ) : (
            <div className="movie-detail-poster--placeholder">No poster</div>
          )}

          <div className="movie-detail-info">
            <h1>{movie.title}</h1>
            <p><strong>Director:</strong> {movie.director_name}</p>
            <p><strong>Release Year:</strong> {movie.release_year}</p>
            <p><strong>Genres:</strong> {movie.genres.join(", ")}</p>
            <p><strong>Lead Actor:</strong> {movie.lead_actor_name || "N/A"}</p>
            <p><strong>Lead Actress:</strong> {movie.lead_actress_name || "N/A"}</p>
            <p><strong>Synopsis:</strong> {movie.synopsis}</p>

            <hr />

            <p>
              <strong>Average Rating:</strong>{" "}
              {avgRating != null
                ? <><StarRating rating={avgRating} size="1.2rem" /> {avgRating.toFixed(2)}</>
                : "Unrated"
              } ({count})
            </p>

            {!hasRated ? (
              <form className="movie-detail-form" onSubmit={submitReview}>
                <label>Rate this movie:</label>
                <InteractiveStarRating value={userRating} onChange={setUserRating} />
                <span>{userRating}/5</span>

                <label style={{ marginTop: 10 }}>Your Review:</label>
                <textarea
                  value={reviewMsg}
                  onChange={e => setReviewMsg(e.target.value)}
                />

                <button type="submit" className="movie-detail-button" style={{ marginTop: 10 }}>
                  Submit Review
                </button>
              </form>
            ) : (
              <p>You rated: <StarRating rating={userRating} /> ({userRating})</p>
            )}

            <hr />

            <h3>Community Reviews</h3>
            {reviews.length ? (
              <ul className="review-list">
                {reviews.map(r => (
                  <li key={r.review_id}>
                    <StarRating rating={r.rating} /> by <strong>{r.username}</strong>
                    {r.message && <> — {r.message}</>}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No reviews yet.</p>
            )}

            <button
              onClick={() => navigate(-1)}
              className="movie-detail-close"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetail;
