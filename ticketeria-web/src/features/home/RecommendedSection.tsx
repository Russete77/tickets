import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import EventCard, { EventData } from './EventCard';
import styles from './RecommendedSection.module.css';

const RecommendedSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { data: recommendedEvents = [], isLoading } = useQuery({
    queryKey: ['recommended-events'],
    queryFn: async () => {
      const response = await api.get('/v1/events/recommendations');
      return response.data as EventData[];
    },
    staleTime: 1000 * 60 * 30,
  });

  const checkScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: direction === 'left' ? -300 : 300,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 300);
    }
  };

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) {
      checkScroll();
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [recommendedEvents]);

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.label}>Personalizado</span>
            <h2 className={styles.title}>Recomendados para você</h2>
          </div>
          <Link to="/search?recommended=true" className={styles.viewAll}>
            Ver mais →
          </Link>
        </div>

        {/* Carousel */}
        <div className={styles.carouselWrapper}>
          {canScrollLeft && (
            <button
              className={`${styles.scrollButton} ${styles.left}`}
              onClick={() => scroll('left')}
              aria-label="Anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <div className={styles.carousel} ref={containerRef}>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.skeletonWrapper}>
                    <Skeleton width="100%" height="100%" borderRadius="12px" />
                  </div>
                ))
              : recommendedEvents.length > 0
              ? recommendedEvents.map((event) => (
                  <div key={event.id} className={styles.cardWrapper}>
                    <EventCard event={event} size="lg" />
                  </div>
                ))
              : (
                <div className={styles.empty}>
                  Compre ingressos e receba recomendações personalizadas
                </div>
              )}
          </div>

          {canScrollRight && (
            <button
              className={`${styles.scrollButton} ${styles.right}`}
              onClick={() => scroll('right')}
              aria-label="Próximo"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default RecommendedSection;
