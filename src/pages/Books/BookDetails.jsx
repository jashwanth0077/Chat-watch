import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUrl } from '../../config/config';
import "./../../css/bookdetail.css";

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

const InteractiveStarRating = ({ value, onChange, size = "1.5rem" }) => {
  const [hovered, setHovered] = useState(null);
  return (
    <div className="interactive-stars">
      {[1, 2, 3, 4, 5].map((star) => (
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
        >
          ★
        </span>
      ))}
    </div>
  );
};

const BookDetail = () => {
  const navigate = useNavigate();
  const { bookId } = useParams();

  const [book, setBook] = useState(null);
  const [author, setAuthor] = useState(null);
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [reviewMessage, setReviewMessage] = useState("");
  const [averageRating, setAverageRating] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBookDetail = async () => {
      try {
        const res = await fetch(`${apiUrl}/book/${bookId}`, {
          method: "GET",
          credentials: "include"
        });
        if (!res.ok) {
          const txt = await res.text();
          setError(`Failed to fetch: ${res.status} ${txt}`);
          return;
        }
        const data = await res.json();
        setBook(data.book);
        setAuthor(data.author);
        setHasRated(data.hasRated);
        setUserRating(data.userRating ?? 5);
        setReviewMessage(data.reviewMessage);
        setAverageRating(typeof data.averageRating === "number" ? data.averageRating : null);
        setReviewCount(data.reviewCount);
        setReviews(data.reviews);

        const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(data.book.title)}&maxResults=1`);
        const gData = await gRes.json();
        const imageUrl = gData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
        if (imageUrl) {
          setThumbnailUrl(imageUrl);
        }

      } catch (err) {
        console.error("Fetch error:", err);
        setError("Network or server error");
      }
    };

    if (bookId) {
      fetchBookDetail();
    } else {
      setError("Invalid book ID");
    }
  }, [bookId]);

  const handleSubmitRating = async () => {
    try {
      const res = await fetch(`${apiUrl}/book/${bookId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: userRating, message: reviewMessage })
      });
      const result = await res.json();

      if (res.ok) {
        setHasRated(true);
        setUserRating(result.userRating);
        setReviewMessage(result.reviewMessage);
        setAverageRating(typeof result.averageRating === "number" ? result.averageRating : null);
        setReviewCount(result.reviewCount);
        setReviews(result.reviews);
      } else {
        alert(result.message || "Error submitting rating");
      }
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

  if (error) return <div>Error: {error}</div>;
  if (!book || !author) return <div>Loading...</div>;

  return (
    <div className="book-detail-overlay">
      <div className="book-detail-container">
        {thumbnailUrl && (
          <img src={thumbnailUrl} alt="Book Cover" className="book-detail-thumbnail" />
        )}
        <div className="book-detail-content">
          <h1>{book.title}</h1>
          <p>
            <a
              href={`https://www.google.com/search?tbm=bks&q=${encodeURIComponent(book.title)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="google-books-link"
            >
              View on Google Books
            </a>
          </p>
          <p><strong>Author:</strong> {author.name}</p>
          <p><strong>Published Year:</strong> {book.publication_year}</p>
          <p><strong>ISBN:</strong> {book.isbn}</p>
          <p>
            <strong>Average Rating:</strong>{" "}
            {typeof averageRating === "number" ? (
              <>
                {averageRating.toFixed(2)} <StarRating rating={averageRating} size="1.2rem" />
              </>
            ) : "Unrated"}
            {" "}({reviewCount} ratings)
          </p>

          {hasRated ? (
            <p>
              You have already rated this book: <StarRating rating={userRating} /> ({userRating})
              {reviewMessage && <><br />Review: {reviewMessage}</>}
            </p>
          ) : (
            <div>
              <div className="book-detail-rating">
                <label>Rate this book:</label>
                <InteractiveStarRating value={userRating} onChange={setUserRating} />
                <span>{userRating} / 5</span>
              </div>
              <div>
                <label>Your Review:</label><br />
                <textarea
                  className="review-textarea"
                  value={reviewMessage}
                  onChange={e => setReviewMessage(e.target.value)}
                  placeholder="Enter your review here..."
                />
              </div>
              <button className="book-detail-button" onClick={handleSubmitRating}>
                Submit Rating
              </button>
            </div>
          )}

          <hr />
          <h3>Community Reviews</h3>
          {reviews.length > 0 ? (
            <ul className="review-list">
              {reviews.map(rev => (
                <li key={rev.review_id}>
                  <StarRating rating={rev.rating} /> ({rev.rating}) by {rev.username}
                  {rev.message && <> — {rev.message}</>}
                </li>
              ))}
            </ul>
          ) : (
            <p>No reviews available.</p>
          )}

          <button className="book-detail-close" onClick={() => navigate(-1)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookDetail;
