import React, { useState } from 'react';
import { Review } from './EventPage';
import { Icon } from '@shared/ui/Icon/Icon';
import { formatRelativeTime } from '@shared/lib/formatters';
import styles from './EventReviews.module.css';

interface EventReviewsProps {
  rating: number;
  reviewCount: number;
  reviews: Review[];
}

const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({
  rating,
  size = 'md',
}) => {
  return (
    <div className={`${styles.stars} ${styles[`stars_${size}`]}`} aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name={star <= Math.round(rating) ? 'star-filled' : 'star'}
          size={size === 'lg' ? 20 : size === 'sm' ? 12 : 16}
          className={star <= Math.round(rating) ? styles.starFilled : styles.starEmpty}
        />
      ))}
    </div>
  );
};

const EventReviews: React.FC<EventReviewsProps> = ({ rating, reviewCount, reviews }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }));

  return (
    <section className={styles.container}>
      <h2 className={styles.title}>Avaliações</h2>

      <div className={styles.summary}>
        <div className={styles.overallRating}>
          <span className={styles.ratingNumber}>{rating.toFixed(1)}</span>
          <StarRating rating={rating} size="lg" />
          <span className={styles.reviewCount}>{reviewCount} avaliações</span>
        </div>

        <div className={styles.ratingBars}>
          {ratingCounts.map(({ star, count }) => {
            const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
            return (
              <div key={star} className={styles.ratingBarRow}>
                <span className={styles.ratingBarLabel}>{star}</span>
                <div className={styles.ratingBarTrack}>
                  <div
                    className={styles.ratingBarFill}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={styles.ratingBarCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.reviewList}>
        {displayedReviews.map((review) => (
          <div key={review.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <div className={styles.reviewAvatar}>
                {review.userAvatar ? (
                  <img src={review.userAvatar} alt={review.userName} />
                ) : (
                  <span>{review.userName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.reviewMeta}>
                <span className={styles.reviewName}>{review.userName}</span>
                <span className={styles.reviewDate}>{formatRelativeTime(review.date)}</span>
              </div>
              <StarRating rating={review.rating} size="sm" />
            </div>

            {review.ratings && (
              <div className={styles.subRatings}>
                {review.ratings.organization !== undefined && (
                  <span>Organização: {review.ratings.organization.toFixed(1)}</span>
                )}
                {review.ratings.sound !== undefined && (
                  <span>Som: {review.ratings.sound.toFixed(1)}</span>
                )}
                {review.ratings.bar !== undefined && (
                  <span>Bar: {review.ratings.bar.toFixed(1)}</span>
                )}
                {review.ratings.experience !== undefined && (
                  <span>Experiência: {review.ratings.experience.toFixed(1)}</span>
                )}
              </div>
            )}

            {review.comment && (
              <p className={styles.reviewComment}>{review.comment}</p>
            )}
          </div>
        ))}
      </div>

      {reviews.length > 3 && (
        <button
          className={styles.showMoreBtn}
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? 'Ver menos' : `Ver todas as ${reviews.length} avaliações`}
        </button>
      )}
    </section>
  );
};

export default EventReviews;
