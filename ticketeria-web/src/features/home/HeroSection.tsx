import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { formatCurrency } from '@shared/lib/formatters';
import styles from './HeroSection.module.css';

interface FeaturedEvent {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  category?: string;
  venue: { name: string; city?: string };
  startDate: string;
  currentBatchPrice: number;
  sold?: number;
  totalCapacity?: number;
  isPartner?: boolean;
}

// Fallback events for demo/dev
const DEMO_EVENTS: FeaturedEvent[] = [
  {
    id: '1', slug: 'lollapalooza-2026', title: 'Lollapalooza Brasil 2026',
    coverImage: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
    category: 'Festival', venue: { name: 'Autódromo de Interlagos', city: 'São Paulo/SP' },
    startDate: '2026-03-28', currentBatchPrice: 395, sold: 89000, totalCapacity: 100000,
  },
  {
    id: '2', slug: 'rock-in-rio-2026', title: 'Rock in Rio 2026',
    coverImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
    category: 'Show', venue: { name: 'Parque Olímpico', city: 'Rio de Janeiro/RJ' },
    startDate: '2026-09-15', currentBatchPrice: 595, sold: 120000, totalCapacity: 150000,
  },
  {
    id: '3', slug: 'tomorrowland-brasil', title: 'Tomorrowland Brasil',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
    category: 'Festival', venue: { name: 'Itu', city: 'Itu/SP' },
    startDate: '2026-10-10', currentBatchPrice: 790, sold: 45000, totalCapacity: 60000,
  },
  {
    id: '4', slug: 'carnaval-olinda-2026', title: 'Carnaval de Olinda 2026',
    coverImage: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
    category: 'Festa', venue: { name: 'Centro Histórico', city: 'Olinda/PE' },
    startDate: '2026-02-14', currentBatchPrice: 0, sold: 120000,
  },
  {
    id: '5', slug: 'coldplay-sao-paulo', title: 'Coldplay — Music of the Spheres',
    coverImage: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80',
    category: 'Show', venue: { name: 'Allianz Parque', city: 'São Paulo/SP' },
    startDate: '2026-05-20', currentBatchPrice: 320, sold: 40000, totalCapacity: 45000,
  },
  {
    id: '6', slug: 'villa-mix-goiania', title: 'Villa Mix Festival 2026',
    coverImage: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
    category: 'Festival', venue: { name: 'Parque Agropecuário', city: 'Goiânia/GO' },
    startDate: '2026-06-25', currentBatchPrice: 280, sold: 35000, totalCapacity: 50000,
  },
  {
    id: '7', slug: 'sonar-sp', title: 'Sónar São Paulo',
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
    category: 'Festival', venue: { name: 'Anhembi', city: 'São Paulo/SP' },
    startDate: '2026-05-02', currentBatchPrice: 180, sold: 12000, totalCapacity: 20000,
  },
  {
    id: '8', slug: 'sounds-of-quartzo', title: 'Sounds of Quartzo',
    coverImage: 'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=1200&q=80',
    category: 'Festa', venue: { name: 'Chapada dos Veadeiros', city: 'Alto Paraíso/GO' },
    startDate: '2026-06-03', currentBatchPrice: 450, sold: 3000, totalCapacity: 5000,
  },
];

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const touchStartX = useRef(0);

  // Fetch featured events — fallback to demo
  const { data: featuredEvents = DEMO_EVENTS } = useQuery({
    queryKey: ['featured-events-carousel'],
    queryFn: async () => {
      const response = await api.get('/v1/events/trending');
      const events = response.data as FeaturedEvent[];
      return events.length >= 3 ? events.slice(0, 10) : DEMO_EVENTS;
    },
    staleTime: 1000 * 60 * 30,
  });

  const events = featuredEvents.length > 0 ? featuredEvents : DEMO_EVENTS;
  const total = events.length;

  const goTo = useCallback((index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((index + total) % total);
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating, total]);

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  // Autoplay
  useEffect(() => {
    autoPlayRef.current = setInterval(goNext, 5000);
    return () => clearInterval(autoPlayRef.current);
  }, [goNext]);

  // Pause on hover
  const pauseAutoPlay = () => clearInterval(autoPlayRef.current);
  const resumeAutoPlay = () => {
    clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(goNext, 5000);
  };

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      diff > 0 ? goNext() : goPrev();
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  const current = events[currentIndex];
  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;

  const formatEventDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} — ${year}`;
  };

  return (
    <section
      className={styles.hero}
      onMouseEnter={pauseAutoPlay}
      onMouseLeave={resumeAutoPlay}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background gradient */}
      <div className={styles.heroBg} />

      <div className={styles.heroInner}>
        {/* ── Carousel ── */}
        <div className={styles.carousel}>
          {/* Previous card (peek) */}
          <div className={styles.cardPrev} onClick={goPrev}>
            <img
              src={events[prevIndex].coverImage}
              alt={events[prevIndex].title}
              className={styles.cardImage}
              loading="lazy"
            />
          </div>

          {/* Current (main) card */}
          <div
            className={styles.cardMain}
            onClick={() => navigate(`/event/${current.slug}`)}
          >
            <img
              src={current.coverImage}
              alt={current.title}
              className={styles.cardImage}
              loading="eager"
            />
            <div className={styles.cardOverlay}>
              {current.category && (
                <span className={styles.cardCategory}>{current.category.toUpperCase()}</span>
              )}
              <h2 className={styles.cardTitle}>{current.title.toUpperCase()}</h2>
              <button
                className={styles.cardCta}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/event/${current.slug}`);
                }}
              >
                SAIBA MAIS
              </button>
            </div>
          </div>

          {/* Next card (peek) */}
          <div className={styles.cardNext} onClick={goNext}>
            <img
              src={events[nextIndex].coverImage}
              alt={events[nextIndex].title}
              className={styles.cardImage}
              loading="lazy"
            />
          </div>
        </div>

        {/* Navigation arrows */}
        <button className={styles.arrowLeft} onClick={goPrev} aria-label="Anterior">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button className={styles.arrowRight} onClick={goNext} aria-label="Próximo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>

        {/* Dots */}
        <div className={styles.dots}>
          {events.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === currentIndex ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Event info below carousel */}
        <div className={styles.eventInfo}>
          <h3 className={styles.eventTitle}>{current.title.toUpperCase()}</h3>
          <div className={styles.eventMeta}>
            <span className={styles.eventDate}>{formatEventDate(current.startDate)}</span>
            <span className={styles.eventDivider}>|</span>
            <span className={styles.eventVenue}>
              {current.venue.city || current.venue.name}
            </span>
          </div>
          {current.currentBatchPrice > 0 && (
            <span className={styles.eventPrice}>
              A partir de {formatCurrency(current.currentBatchPrice)}
            </span>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
