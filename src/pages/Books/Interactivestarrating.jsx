const InteractiveStarRating = ({ rating, onChange }) => {
    return (
      <div className="interactive-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? "filled" : ""}`}
            onClick={() => onChange(star)}
          >
            ★
          </span>
        ))}
      </div>
    );
  };
  export default InteractiveStarRating