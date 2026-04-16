import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import EventCard, { EventData } from './EventCard';
import styles from './TrendingSection.module.css';

interface TrendingEvent extends EventData {
  ranking: number;
  sold: number;
}

const TrendingSection: React.FC = () => {
  const { data: trendingEvents = [], isLoading } = useQuery({
    queryKey: ['trending-events'],
    queryFn: async () => {
      const response = await api.get('/v1/events/trending');
      return response.data as TrendingEvent[];
    },
    staleTime: 1000 * 60 * 15,
  });

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.label}>Mais vendidos</span>
            <h2 className={styles.title}>
              Mais hypados da semana
            </h2>
          </div>
          <Link to="/search?sort=trending" className={styles.viewAll}>
            Ver ranking →
          </Link>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 9 }).map((_, i) => (
                <div key={i}>
                  <Skeleton width="100%" height="340px" borderRadius="12px" />
                </div>
              ))
            : trendingEvents.length > 0
            ? trendingEvents.map((event, index) => (
                <div key={event.id} className={styles.cardContainer}>
                  <EventCard
                    event={event}
                    size="md"
                    showRanking={true}
                    rankingPosition={index + 1}
                  />
                </div>
              ))
            : (
              <div className={styles.empty}>Nenhum evento em alta no momento</div>
            )}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;
