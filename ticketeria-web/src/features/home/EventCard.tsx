import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@shared/lib/formatters';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './EventCard.module.css';

export interface EventData {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  venue: { name: string };
  startDate: string;
  currentBatchPrice: number;
  urgencyMessage?: string;
  sold?: number;
  totalCapacity?: number;
  rating?: number;
  recommendationReason?: string;
  isFavorite?: boolean;
}

interface EventCardProps {
  event: EventData;
  size?: 'sm' | 'md' | 'lg';
  showRanking?: boolean;
  rankingPosition?: number;
  showUrgency?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  size = 'md',
  showRanking = false,
  rankingPosition = 1,
  showUrgency = false,
}) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(event.isFavorite ?? false);

  const handleCardClick = () => navigate(`/event/${event.slug}`);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(prev => !prev);
  };

  const sizeClass = { sm: styles.sizeSm, md: styles.sizeMd, lg: styles.sizeLg }[size];

  const rankingClass =
    rankingPosition === 1 ? styles.ranking1 :
    rankingPosition === 2 ? styles.ranking2 :
    rankingPosition === 3 ? styles.ranking3 :
    styles.rankingN;

  return (
    <div
      className={`${styles.card} ${sizeClass}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(); }}
    >
      {/* ── Image ── */}
      <div className={styles.imageContainer}>
        <img
          src={event.coverImage}
          alt={event.title}
          className={styles.image}
          loading="lazy"
        />

        {showRanking && (
          <div className={`${styles.ranking} ${rankingClass}`}>
            #{rankingPosition}
          </div>
        )}

        <button
          className={`${styles.favoriteButton} ${isFavorite ? styles.favorited : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          {isFavorite ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.593c-.525-.044-5.940-4.202-7.499-5.93C2.963 14.013 2 12.077 2 10c0-3.309 2.691-6 6-6 1.742 0 3.409.852 4.5 2.2C13.591 4.852 15.258 4 17 4c3.309 0 6 2.691 6 6 0 2.077-.963 4.013-2.501 5.663C18.94 17.39 12.525 21.549 12 21.593z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          )}
        </button>

        {showUrgency && event.urgencyMessage && (
          <div className={styles.urgencyBadge}>
            <Icon name="bolt" size={12} /> {event.urgencyMessage}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className={styles.content}>
        <h3 className={styles.title}>{event.title}</h3>
        <div className={styles.meta}>
          <span className={styles.venue}>{event.venue.name}</span>
          <span className={styles.date}>{formatDate(event.startDate)}</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <div className={styles.price}>
          <span className={styles.priceLabel}>a partir de</span>
          <span className={styles.priceValue}>
            {formatCurrency(event.currentBatchPrice)}
          </span>
        </div>

        {event.sold !== undefined && event.totalCapacity !== undefined && (
          <span className={styles.sold}>
            {event.sold.toLocaleString('pt-BR')} vendidos
          </span>
        )}

        {event.rating !== undefined && (
          <div className={styles.rating}>
            <Icon name="star-filled" size={12} className={styles.star} />
            <span>{event.rating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {event.recommendationReason && (
        <div className={styles.recommendation}>
          <span className={styles.recommendationLabel}>
            Porque você {event.recommendationReason}
          </span>
        </div>
      )}

      <div className={styles.hoverOverlay} />
    </div>
  );
};

export default EventCard;
