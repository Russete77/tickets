import React from 'react';
import { Icon } from '@shared/ui/Icon/Icon';
import styles from './EventMap.module.css';

interface EventMapProps {
  venueName: string;
  address: string;
  coordinates: { lat: number; lng: number };
}

const EventMap: React.FC<EventMapProps> = ({ venueName, address, coordinates }) => {
  const mapsUrl = `https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}`;
  const embedUrl = `https://maps.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed`;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Local</h3>

      <div className={styles.mapWrapper}>
        <iframe
          title={`Mapa: ${venueName}`}
          src={embedUrl}
          className={styles.iframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      <div className={styles.venueInfo}>
        <span className={styles.venueName}><Icon name="map-pin" size={14} /> {venueName}</span>
        <span className={styles.venueAddress}>{address}</span>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.mapsLink}
        >
          Abrir no Google Maps →
        </a>
      </div>
    </div>
  );
};

export default EventMap;
