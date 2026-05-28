import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useAuth } from '@shared/hooks/useAuth';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { useTranslation } from '@shared/i18n';
import {
  PpLayout,
  PButton,
  PBadge,
  Flyer,
  flyerPalette,
} from '@/design-system';
import styles from './HomePage.module.css';

interface EventSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  coverImage?: string;
  coverImageUrl?: string;
  startDate?: string;
  startsAt?: string;
  venue?: { name?: string; city?: string } | string;
  city?: string;
  currentBatchPrice?: number;
  priceFromCents?: number;
  category?: string;
  isOpenBar?: boolean;
}

const DEMO_EVENTS: EventSummary[] = [
  {
    id: 'demo-1',
    slug: 'lollapalooza-2026',
    title: 'Lollapalooza Brasil 2026',
    coverImage:
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1200&q=80',
    category: 'Festival',
    venue: { name: 'Autódromo de Interlagos', city: 'São Paulo' },
    startDate: '2026-03-28',
    currentBatchPrice: 395,
  },
  {
    id: 'demo-2',
    slug: 'rock-in-rio-2026',
    title: 'Rock in Rio 2026',
    coverImage:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80',
    category: 'Show',
    venue: { name: 'Parque Olímpico', city: 'Rio de Janeiro' },
    startDate: '2026-09-15',
    currentBatchPrice: 595,
  },
  {
    id: 'demo-3',
    slug: 'tomorrowland-brasil',
    title: 'Tomorrowland Brasil',
    coverImage:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&q=80',
    category: 'Festival',
    venue: { name: 'Itu', city: 'Itu' },
    startDate: '2026-10-10',
    currentBatchPrice: 790,
    isOpenBar: true,
  },
  {
    id: 'demo-4',
    slug: 'coldplay-sp',
    title: 'Coldplay — Music of the Spheres',
    coverImage:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&q=80',
    category: 'Show',
    venue: { name: 'Allianz Parque', city: 'São Paulo' },
    startDate: '2026-05-20',
    currentBatchPrice: 320,
  },
  {
    id: 'demo-5',
    slug: 'sonar-sp',
    title: 'Sónar São Paulo',
    coverImage:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
    category: 'Festival',
    venue: { name: 'Anhembi', city: 'São Paulo' },
    startDate: '2026-05-02',
    currentBatchPrice: 180,
  },
  {
    id: 'demo-6',
    slug: 'sounds-of-quartzo',
    title: 'Sounds of Quartzo',
    coverImage:
      'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=1200&q=80',
    category: 'Festa',
    venue: { name: 'Chapada dos Veadeiros', city: 'Alto Paraíso' },
    startDate: '2026-06-03',
    currentBatchPrice: 450,
  },
];

const getCover = (e: EventSummary) =>
  e.coverImage ?? e.coverImageUrl ?? undefined;
const getVenue = (e: EventSummary) =>
  typeof e.venue === 'string' ? e.venue : e.venue?.name ?? '';
const getCity = (e: EventSummary) =>
  typeof e.venue === 'string' ? '' : e.venue?.city ?? e.city ?? '';
const getDate = (e: EventSummary) => e.startDate ?? e.startsAt ?? '';
const getPrice = (e: EventSummary) =>
  e.currentBatchPrice ??
  (e.priceFromCents != null ? e.priceFromCents / 100 : null);

const HomePage: React.FC = () => {
  useTranslation();
  const { isAuthenticated, user } = useAuth();

  useDocumentHead({
    title: 'PulsePass — sinta o pulso do evento',
    description:
      'Sistema operacional de eventos. Descubra rolês, compre ingressos, recarregue cashless e pede no bar pelo app.',
    ogTitle: 'PulsePass — sinta o pulso do evento',
    ogDescription:
      'Sistema operacional de eventos. Ticketeria, guest list e cashless num único produto.',
    ogUrl: window.location.href,
    ogType: 'website',
    ogSiteName: 'PulsePass',
    twitterCard: 'summary_large_image',
    twitterTitle: 'PulsePass',
    twitterDescription: 'Sistema operacional de eventos.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PulsePass',
      url: window.location.origin,
    },
  });

  const { data: trendingBackend = [] } = useQuery({
    queryKey: ['events-trending'],
    queryFn: async () => {
      try {
        const r = await api.get<EventSummary[]>('/v1/events/trending');
        return r.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });

  const { data: weekendBackend = [] } = useQuery({
    queryKey: ['events-weekend'],
    queryFn: async () => {
      try {
        const r = await api.get<EventSummary[]>('/v1/events/weekend');
        return r.data ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60_000,
  });

  const trending: EventSummary[] = trendingBackend.length
    ? trendingBackend
    : DEMO_EVENTS;
  const weekend: EventSummary[] = weekendBackend.length
    ? weekendBackend
    : DEMO_EVENTS.slice().reverse();
  const featured = trending[0];

  return (
    <PpLayout intensity={0.9}>
      <main className={styles.main}>
        <section className={styles.greeting}>
          <div className={styles.greetingMeta}>
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </div>
          <h1 className={styles.greetingTitle}>
            {user ? (
              <>
                Boa noite,{' '}
                <span className={styles.greetingName}>
                  {user.name.split(' ')[0]}
                </span>
              </>
            ) : (
              <>
                Sinta o pulso{' '}
                <span className={styles.greetingName}>do evento.</span>
              </>
            )}
          </h1>
          <p className={styles.greetingBody}>
            {isAuthenticated
              ? 'Descubra rolês, garanta ingresso, recarregue cashless e veja onde seus amigos estão.'
              : 'Descubra rolês, garanta ingresso, recarregue cashless, pede no bar pelo app e veja onde seus amigos estão. Tudo num lugar só.'}
          </p>

          <div className={styles.chips}>
            {[
              { label: 'Tudo', q: '' },
              { label: 'Hoje', q: '?dateFrom=today' },
              { label: 'Fim de semana', q: '?dateRange=weekend' },
              { label: 'Eletrônica', q: '?category=festival&q=eletrônica' },
              { label: 'Sertanejo', q: '?q=sertanejo' },
              { label: 'Funk', q: '?q=funk' },
              { label: 'Indie', q: '?q=indie' },
              { label: 'Stand-up', q: '?category=teatro&q=stand-up' },
            ].map((c, i) => (
              <Link
                key={c.label}
                to={`/search${c.q}`}
                className={`${styles.chip} ${i === 0 ? styles.chipActive : ''}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        {featured && <FeaturedCard event={featured} />}

        {weekend.length > 0 && (
          <EventGrid
            title="Acontece agora"
            eyebrow="Hoje"
            events={weekend.slice(0, 6)}
            seeAllHref="/search?dateRange=weekend"
          />
        )}

        {trending.length > 1 && (
          <EventGrid
            title="Em alta"
            eyebrow="Trending"
            events={trending.slice(1, 7)}
            seeAllHref="/search?sort=trending"
          />
        )}

        <div style={{ height: 80 }} />
      </main>
    </PpLayout>
  );
};

const FeaturedCard: React.FC<{ event: EventSummary }> = ({ event }) => {
  const dateRaw = getDate(event);
  const date = dateRaw ? new Date(dateRaw) : null;
  const dateLabel = date
    ? date
        .toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        .toUpperCase()
    : 'EM BREVE';
  const price = getPrice(event);
  const cover = getCover(event);
  const venue = getVenue(event);
  const city = getCity(event);

  return (
    <section className={styles.featuredSection}>
      <Link to={`/event/${event.slug}`} className={styles.featuredLink}>
        <div className={styles.featuredCard}>
          <div
            className={styles.featuredImage}
            style={{
              background: cover
                ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85)), url(${cover}) center/cover`
                : `radial-gradient(80% 80% at 30% 20%, ${flyerPalette.green}, transparent 60%), radial-gradient(80% 80% at 80% 90%, ${flyerPalette.violet}, transparent 60%), #0a0a0c`,
            }}
          >
            {!cover && <div className={styles.featuredGradient} />}
            <div className={styles.featuredBadges}>
              <PBadge tone="pulse" dot>
                Vendas abertas
              </PBadge>
              {event.isOpenBar && <PBadge tone="violet">Open Bar</PBadge>}
            </div>
            <div className={styles.featuredInfo}>
              <div className={styles.featuredDate}>{dateLabel}</div>
              <h2 className={styles.featuredTitle}>{event.title}</h2>
              {event.shortDescription && (
                <p className={styles.featuredDescription}>
                  {event.shortDescription}
                </p>
              )}
            </div>
          </div>
          <div className={styles.featuredFooter}>
            <div>
              <div className={styles.featuredVenue}>
                {venue}
                {city ? ` · ${city}` : ''}
              </div>
              {price != null && price > 0 && (
                <div className={styles.featuredPrice}>
                  desde R$ {price.toFixed(0)} · 4× sem juros
                </div>
              )}
            </div>
            <PButton variant="primary" size="lg" iconRight={<ArrowIcon />}>
              Comprar ingresso
            </PButton>
          </div>
        </div>
      </Link>
    </section>
  );
};

const EventGrid: React.FC<{
  title: string;
  eyebrow: string;
  events: EventSummary[];
  seeAllHref: string;
}> = ({ title, eyebrow, events, seeAllHref }) => {
  const palette = [
    [flyerPalette.green, flyerPalette.violet],
    [flyerPalette.pink, flyerPalette.amber],
    [flyerPalette.cyan, flyerPalette.violet],
    [flyerPalette.amber, flyerPalette.pink],
    [flyerPalette.violet, flyerPalette.cyan],
    [flyerPalette.green, flyerPalette.cyan],
  ];

  return (
    <section className={styles.gridSection}>
      <div className={styles.gridHeader}>
        <div>
          <div className={styles.gridEyebrow}>{eyebrow}</div>
          <h3 className={styles.gridTitle}>{title}</h3>
        </div>
        <Link to={seeAllHref} className={styles.gridSeeAll}>
          Ver todos →
        </Link>
      </div>
      <div className={styles.grid}>
        {events.map((event, i) => {
          const [hue, hue2] = palette[i % palette.length];
          const dateRaw = getDate(event);
          const dateLabel = dateRaw
            ? new Date(dateRaw)
                .toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })
                .toUpperCase()
            : 'EM BREVE';
          const cover = getCover(event);
          const venue = getVenue(event);
          const price = getPrice(event);
          return (
            <Link
              key={event.id}
              to={`/event/${event.slug}`}
              className={styles.cardLink}
            >
              <Flyer
                imageUrl={cover}
                hue={hue}
                hue2={hue2}
                title={event.title}
                tag={dateLabel}
                height={280}
              />
              <div className={styles.cardMeta}>
                <div className={styles.cardVenue}>{venue}</div>
                {price != null && price > 0 && (
                  <div className={styles.cardPrice}>
                    desde R$ {price.toFixed(0)}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const ArrowIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default HomePage;
