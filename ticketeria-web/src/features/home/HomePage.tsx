import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useAuth } from '@shared/hooks/useAuth';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { useTranslation } from '@shared/i18n';
import {
  Aurora,
  PpHeader,
  PButton,
  PBadge,
  Flyer,
  flyerPalette,
} from '@/design-system';

interface EventSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string;
  coverImageUrl?: string;
  startsAt?: string;
  venueName?: string;
  city?: string;
  priceFromCents?: number;
  category?: string;
  isOpenBar?: boolean;
}

const HomePage: React.FC = () => {
  useTranslation();
  const { user } = useAuth();

  useDocumentHead({
    title: 'PulsePass — sinta o pulso do evento',
    description:
      'Sistema operacional de eventos do Brasil. Ticketeria, guest list e cashless num único produto. Descubra rolês, compre ingressos e gerencie tudo pelo app.',
    ogTitle: 'PulsePass',
    ogDescription: 'Sistema operacional de eventos',
    ogUrl: window.location.href,
    ogType: 'website',
    ogSiteName: 'PulsePass',
    twitterCard: 'summary_large_image',
    twitterTitle: 'PulsePass',
    twitterDescription: 'Sistema operacional de eventos',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PulsePass',
      url: window.location.origin,
    },
  });

  const trending = useQuery({
    queryKey: ['events-trending'],
    queryFn: async () =>
      (await api.get<EventSummary[]>('/v1/events/trending')).data,
    staleTime: 5 * 60_000,
  });
  const weekend = useQuery({
    queryKey: ['events-weekend'],
    queryFn: async () =>
      (await api.get<EventSummary[]>('/v1/events/weekend')).data,
    staleTime: 5 * 60_000,
  });
  const trendingList = trending.data ?? [];
  const weekendList = weekend.data ?? [];
  const featured = trendingList[0];

  return (
    <Aurora style={{ minHeight: '100vh' }} intensity={1}>
      <PpHeader user={user ? { name: user.name } : null} />

      <main
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '32px 24px 96px',
        }}
      >
        {/* GREETING + HEADLINE */}
        <section style={{ marginBottom: 40 }}>
          <div className="pp-eyebrow">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </div>
          <h1
            className="pp-h1"
            style={{
              marginTop: 14,
              maxWidth: 820,
              fontSize: 'clamp(48px, 6vw, 72px)',
              lineHeight: 0.98,
            }}
          >
            Sinta o pulso{' '}
            <span
              style={{
                fontFamily: 'var(--pp-font-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--pp-pulse)',
              }}
            >
              do evento.
            </span>
          </h1>
          <p className="pp-body" style={{ marginTop: 14, maxWidth: 560, fontSize: 16 }}>
            Descubra rolês, garanta ingresso, recarregue cashless, pede no bar
            pelo app e veja onde seus amigos estão. Tudo num lugar só.
          </p>

          <div
            style={{
              marginTop: 24,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {[
              'Tudo',
              'Hoje',
              'Fim de semana',
              'Eletrônica',
              'Sertanejo',
              'Funk',
              'Indie',
              'Stand-up',
            ].map((c, i) => (
              <Link
                key={c}
                to={c === 'Tudo' ? '/search' : `/search?q=${encodeURIComponent(c)}`}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                  fontWeight: 600,
                  background: i === 0 ? 'var(--pp-pulse)' : 'var(--pp-glass-2)',
                  color: i === 0 ? '#003C1F' : 'var(--pp-fg)',
                  border: i === 0 ? 'none' : '1px solid var(--pp-edge-2)',
                  textDecoration: 'none',
                }}
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        {featured && <FeaturedCard event={featured} />}

        {weekendList.length > 0 && (
          <EventGrid
            title="Acontece agora"
            eyebrow="Hoje"
            events={weekendList.slice(0, 6)}
            seeAllHref="/search?dateFrom=today"
          />
        )}

        {trendingList.length > 1 && (
          <EventGrid
            title="Em alta"
            eyebrow="Trending"
            events={trendingList.slice(1, 7)}
            seeAllHref="/search?sort=trending"
          />
        )}

        {!featured && !trending.isLoading && !weekend.isLoading && (
          <EmptyState />
        )}
      </main>
    </Aurora>
  );
};

const FeaturedCard: React.FC<{ event: EventSummary }> = ({ event }) => {
  const date = event.startsAt ? new Date(event.startsAt) : null;
  const dateLabel = date
    ? date
        .toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        .toUpperCase()
    : 'EM BREVE';
  const price =
    event.priceFromCents != null
      ? (event.priceFromCents / 100).toFixed(0)
      : null;

  return (
    <section style={{ margin: '24px 0 48px' }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 28,
          overflow: 'hidden',
          border: '1px solid var(--pp-edge-2)',
          boxShadow: 'var(--pp-shadow-3)',
          isolation: 'isolate',
        }}
      >
        <div
          style={{
            height: 420,
            position: 'relative',
            background: event.coverImageUrl
              ? `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.85)), url(${event.coverImageUrl}) center/cover`
              : `radial-gradient(80% 80% at 30% 20%, ${flyerPalette.green}, transparent 60%), radial-gradient(80% 80% at 80% 90%, ${flyerPalette.violet}, transparent 60%), #0a0a0c`,
          }}
        >
          {!event.coverImageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, transparent 45%, rgba(0,0,0,0.85))',
              }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              display: 'flex',
              gap: 8,
            }}
          >
            <PBadge tone="pulse" dot>
              Vendas abertas
            </PBadge>
            {event.isOpenBar && <PBadge tone="violet">Open Bar</PBadge>}
          </div>
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              right: 24,
            }}
          >
            <div
              className="pp-eyebrow"
              style={{ color: 'var(--pp-pulse)' }}
            >
              {dateLabel}
            </div>
            <h2
              className="pp-h2"
              style={{
                marginTop: 8,
                fontSize: 'clamp(28px, 4vw, 44px)',
                lineHeight: 1.05,
              }}
            >
              {event.title}
            </h2>
            {event.shortDescription && (
              <p
                style={{
                  marginTop: 8,
                  color: 'var(--pp-fg-2)',
                  fontSize: 15,
                  maxWidth: 560,
                }}
              >
                {event.shortDescription}
              </p>
            )}
          </div>
        </div>
        <div
          style={{
            padding: 20,
            background: 'rgba(11,13,18,0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)' as never,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--pp-edge-1)',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: 'var(--pp-fg-2)' }}>
              {event.venueName ?? 'Local a confirmar'}
              {event.city ? ` · ${event.city}` : ''}
            </div>
            {price && (
              <div
                style={{
                  marginTop: 4,
                  fontFamily: 'var(--pp-font-mono)',
                  fontSize: 13,
                  color: 'var(--pp-fg-3)',
                }}
              >
                desde R$ {price} · 4× sem juros
              </div>
            )}
          </div>
          <Link to={`/event/${event.slug}`} style={{ textDecoration: 'none' }}>
            <PButton variant="primary" size="lg" iconRight={<ArrowIcon />}>
              Comprar ingresso
            </PButton>
          </Link>
        </div>
      </div>
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
    <section style={{ marginBottom: 56 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <div className="pp-eyebrow">{eyebrow}</div>
          <h3 className="pp-h3" style={{ marginTop: 6, fontSize: 26 }}>
            {title}
          </h3>
        </div>
        <Link
          to={seeAllHref}
          style={{
            fontSize: 13,
            color: 'var(--pp-fg-3)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Ver todos →
        </Link>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {events.map((event, i) => {
          const [hue, hue2] = palette[i % palette.length];
          const dateLabel = event.startsAt
            ? new Date(event.startsAt)
                .toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'short',
                })
                .toUpperCase()
            : 'EM BREVE';
          return (
            <Link
              key={event.id}
              to={`/event/${event.slug}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <Flyer
                imageUrl={event.coverImageUrl}
                hue={hue}
                hue2={hue2}
                title={event.title}
                tag={dateLabel}
                height={280}
              />
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--pp-fg-2)',
                    fontWeight: 500,
                  }}
                >
                  {event.venueName ?? 'Local a confirmar'}
                </div>
                {event.priceFromCents != null && (
                  <div
                    style={{
                      marginTop: 2,
                      fontFamily: 'var(--pp-font-mono)',
                      fontSize: 11,
                      color: 'var(--pp-pulse)',
                    }}
                  >
                    desde R$ {(event.priceFromCents / 100).toFixed(0)}
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

const EmptyState: React.FC = () => (
  <div
    style={{
      textAlign: 'center',
      padding: '96px 24px',
      color: 'var(--pp-fg-3)',
    }}
  >
    <div className="pp-eyebrow" style={{ color: 'var(--pp-fg-4)' }}>
      Sem eventos hoje
    </div>
    <h2 className="pp-h2" style={{ marginTop: 12 }}>
      Acabou de chegar.
    </h2>
    <p className="pp-body" style={{ marginTop: 8, fontSize: 16 }}>
      Os primeiros rolês aparecem aqui em breve. Volte depois.
    </p>
  </div>
);

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
