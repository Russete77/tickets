import React, { useState } from 'react';
import { Badge } from '@shared/ui/Badge/Badge';
import { formatDate, formatTime } from '@shared/lib/formatters';
import { Event } from './EventPage';
import styles from './EventInfo.module.css';

interface EventInfoProps {
  event: Event;
}

const EventInfo: React.FC<EventInfoProps> = ({ event }) => {
  const [expandedDescription, setExpandedDescription] = useState(false);

  const handleMapClick = () => {
    const { address, city, state } = event.venue;
    const query = `${address}, ${city}, ${state}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    window.open(mapsUrl, '_blank');
  };

  const descriptionLines = event.description.split('\n');
  const isDescriptionLong = descriptionLines.length > 3;
  const displayedDescription = expandedDescription
    ? event.description
    : descriptionLines.slice(0, 3).join('\n');

  return (
    <section className={styles.section}>
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>Sobre o evento</h2>
        <p className={styles.text}>{displayedDescription}</p>
        {isDescriptionLong && (
          <button
            className={styles.expandButton}
            onClick={() => setExpandedDescription(!expandedDescription)}
          >
            {expandedDescription ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </div>

      <div className={styles.infoGrid}>
        <h2 className={styles.sectionTitle}>Informações</h2>
        <div className={styles.grid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Data</span>
            <span className={styles.value}>{formatDate(event.startDate)}</span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>Horário</span>
            <span className={styles.value}>
              {formatTime(event.startDate)}
              {event.doorsOpenAt && (
                <div className={styles.subtext}>Portões: {formatTime(event.doorsOpenAt)}</div>
              )}
            </span>
          </div>

          <div className={styles.infoItem}>
            <span className={styles.label}>Local</span>
            <span
              className={styles.value}
              onClick={handleMapClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleMapClick();
              }}
            >
              <button className={styles.mapLink}>
                {event.venue.name}
              </button>
              <div className={styles.subtext}>
                {event.venue.address}, {event.venue.city}
              </div>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.tags}>
        <h2 className={styles.sectionTitle}>Características</h2>
        <div className={styles.tagList}>
          {event.ageRating && (
            <Badge variant="default" size="sm">
              {event.ageRating}+
            </Badge>
          )}
          {event.dressCode && (
            <Badge variant="default" size="sm">
              {event.dressCode}
            </Badge>
          )}
          {event.openBar && (
            <Badge variant="accent" size="sm">
              Open Bar
            </Badge>
          )}
        </div>
      </div>

      {event.lineup && event.lineup.length > 0 && (
        <div className={styles.lineup}>
          <h2 className={styles.sectionTitle}>Atrações</h2>
          <ul className={styles.lineupList}>
            {event.lineup.map((artist, index) => (
              <li key={index} className={styles.lineupItem}>
                <span className={styles.artistName}>{artist.name}</span>
                <span className={styles.artistRole}>{artist.role}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default EventInfo;
