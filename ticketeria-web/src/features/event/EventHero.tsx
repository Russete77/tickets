import React, { useState } from 'react';
import { Badge } from '@shared/ui/Badge/Badge';
import { Button } from '@shared/ui/Button/Button';
import { Icon } from '@shared/ui/Icon/Icon';
import { formatDate } from '@shared/lib/formatters';
import { Event } from './EventPage';
import styles from './EventHero.module.css';

interface EventHeroProps {
  event: Event;
}

const EventHero: React.FC<EventHeroProps> = ({ event }) => {
  const [isFavorite, setIsFavorite] = useState(event.isFavorite);

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: `Veja este evento: ${event.title}`,
        url: window.location.href,
      });
    }
  };

  const isEventLive = new Date(event.startDate) <= new Date();
  const isSoldOut = event.batches.every(b => b.sold >= b.quantity);
  const almostSoldOut = event.batches.some(b => (b.quantity - b.sold) <= 10);

  return (
    <div className={styles.hero}>
      <img
        src={event.coverImage}
        alt={event.title}
        className={styles.image}
      />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.badges}>
          <Badge variant="default" size="md">
            {event.category}
          </Badge>
          {isEventLive && <Badge variant="warning" size="md">Ao vivo</Badge>}
          {isSoldOut && <Badge variant="danger" size="md">Esgotado</Badge>}
          {almostSoldOut && !isSoldOut && (
            <Badge variant="warning" size="md">Últimos ingressos</Badge>
          )}
        </div>

        <h1 className={styles.title}>{event.title}</h1>

        <div className={styles.meta}>
          <div className={styles.metaItem}>
            <Icon name="calendar" size={16} className={styles.icon} />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className={styles.metaItem}>
            <Icon name="map-pin" size={16} className={styles.icon} />
            <span>{event.venue.name}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant={isFavorite ? 'secondary' : 'ghost'}
            size="md"
            onClick={handleFavorite}
            className={styles.favoriteButton}
          >
            <Icon name={isFavorite ? 'heart-filled' : 'heart'} size={16} />
            {isFavorite ? ' Adicionado' : ' Favoritar'}
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={handleShare}
          >
            <Icon name="share" size={16} /> Compartilhar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventHero;
