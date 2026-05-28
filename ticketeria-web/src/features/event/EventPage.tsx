import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { useAuth } from '@shared/hooks/useAuth';
import {
  PpLayout,
  PButton,
  PBadge,
  GlassPanel,
  flyerPalette,
} from '@/design-system';
import styles from './EventPage.module.css';

// Re-exports legacy — sub-componentes EventHero/EventInfo/etc ficam órfãos mas compilam.
// Esses tipos eram usados antes da migração pro DS v3. Mantidos como aliases.
export type Event = EventData;
export type Batch = BatchData;
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  date: string;
  rating: number;
  comment: string;
}

export interface BatchData {
  id: string;
  name: string;
  description?: string;
  priceCents?: number;
  price?: number;
  quantity: number;
  soldCount?: number;
  sold?: number;
  type?: string;
  isVisible?: boolean;
}

export interface EventData {
  id: string;
  slug: string;
  title: string;
  description?: string;
  shortDescription?: string;
  category: string;
  coverImageUrl?: string;
  coverImage?: string;
  gallery?: Array<{ url: string; alt?: string } | string>;
  startsAt?: string;
  startDate?: string;
  endsAt?: string;
  endDate?: string;
  doorsOpenAt?: string;
  venueName?: string;
  venueAddress?: string;
  venue?: { name: string; address?: string; city?: string; state?: string };
  city?: string;
  ageRating?: string;
  dressCode?: string;
  isOpenBar?: boolean;
  openBar?: boolean;
  lineup?: Array<{ name: string; role?: string; image?: string } | string>;
  batches?: BatchData[];
  ticketBatches?: BatchData[];
  rating?: number;
  reviewCount?: number;
  tags?: string[];
}

const cents = (b: BatchData) =>
  b.priceCents ?? (b.price != null ? Math.round(b.price * 100) : 0);
const sold = (b: BatchData) => b.soldCount ?? b.sold ?? 0;
const remaining = (b: BatchData) => Math.max(0, b.quantity - sold(b));
const formatBRL = (c: number) =>
  (c / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const EventPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      if (!slug) throw new Error('slug obrigatório');
      const r = await api.get<EventData>(`/v1/events/slug/${slug}`).catch(() =>
        api.get<EventData>(`/v1/events/${slug}`),
      );
      return r.data;
    },
    enabled: !!slug,
  });

  const { data: favorited } = useQuery({
    queryKey: ['favorite-check', event?.id],
    queryFn: async () => {
      if (!event?.id || !isAuthenticated) return false;
      try {
        const r = await api.get<{ favorited: boolean }>(
          `/v1/favorites/${event.id}/check`,
        );
        return r.data?.favorited ?? false;
      } catch {
        return false;
      }
    },
    enabled: !!event?.id && isAuthenticated,
  });

  const favoriteToggle = useMutation({
    mutationFn: async () => {
      if (!event?.id) return;
      await api.post(`/v1/favorites/${event.id}/toggle`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorite-check', event?.id] }),
  });

  useDocumentHead(
    event
      ? {
          title: `${event.title} — PulsePass`,
          description: event.shortDescription ?? event.description ?? '',
          ogTitle: event.title,
          ogDescription: event.shortDescription ?? event.description ?? '',
          ogImage: event.coverImageUrl ?? event.coverImage,
          ogUrl: `${window.location.origin}/event/${event.slug}`,
          ogType: 'event',
          ogSiteName: 'PulsePass',
          twitterCard: 'summary_large_image',
          twitterTitle: event.title,
          twitterDescription: event.shortDescription ?? '',
          twitterImage: event.coverImageUrl ?? event.coverImage,
        }
      : { title: 'Carregando — PulsePass' },
  );

  if (error) {
    return (
      <PpLayout>
        <div className={styles.error}>
          <h1 className={styles.errorTitle}>Evento não encontrado</h1>
          <p className={styles.errorBody}>
            Pode estar offline ou foi removido. Volta pra home e tenta outro.
          </p>
          <Link to="/" className={styles.errorLink}>
            ← Voltar pra home
          </Link>
        </div>
      </PpLayout>
    );
  }

  if (isLoading || !event) {
    return (
      <PpLayout>
        <div className={styles.loading}>
          <div className={styles.loadingHero} />
          <div className={styles.loadingBlock} />
          <div className={styles.loadingBlock} />
        </div>
      </PpLayout>
    );
  }

  const cover = event.coverImageUrl ?? event.coverImage;
  const venueName = event.venueName ?? event.venue?.name ?? '';
  const venueCity = event.city ?? event.venue?.city ?? '';
  const venueAddress = event.venueAddress ?? event.venue?.address ?? '';
  const startDate = event.startsAt ?? event.startDate;
  const date = startDate ? new Date(startDate) : null;
  const isOpenBar = event.isOpenBar ?? event.openBar ?? false;

  const dateLong = date
    ? date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : 'Data a confirmar';
  const timeLong = date
    ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) +
      'h'
    : '';
  const dateLabel = date
    ? date
        .toLocaleDateString('pt-BR', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
        .toUpperCase()
    : 'EM BREVE';

  const batches = (event.batches ?? event.ticketBatches ?? []).filter(
    (b) => b.isVisible !== false,
  );
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const subtotalCents = selectedBatch ? cents(selectedBatch) * quantity : 0;

  const lineupItems = (event.lineup ?? []).map((l, i) =>
    typeof l === 'string' ? { name: l, key: `${i}` } : { ...l, key: l.name },
  );

  return (
    <PpLayout hideHeader intensity={0.5}>
      <article className={styles.page}>
        {/* HERO */}
        <header
          className={styles.hero}
          style={{
            background: cover
              ? `linear-gradient(180deg, transparent 0%, transparent 50%, var(--pp-ink-950) 95%), url(${cover}) center/cover`
              : `radial-gradient(80% 80% at 30% 20%, ${flyerPalette.green}, transparent 60%), radial-gradient(80% 80% at 80% 90%, ${flyerPalette.violet}, transparent 60%), #0a0a0c`,
          }}
        >
          {!cover && (
            <div className={styles.heroGradient} />
          )}

          {/* Nav buttons */}
          <div className={styles.navRow}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={styles.navButton}
              aria-label="Voltar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <div className={styles.navRight}>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => favoriteToggle.mutate()}
                  className={styles.navButton}
                  aria-label={favorited ? 'Desfavoritar' : 'Favoritar'}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={favorited ? '#FF3D88' : 'none'}
                    stroke={favorited ? '#FF3D88' : '#fff'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              )}
              <button type="button" className={styles.navButton} aria-label="Compartilhar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" x2="12" y1="2" y2="15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Hero title */}
          <div className={styles.heroTitleBlock}>
            <div className={styles.tagRow}>
              {event.category && <PBadge tone="pulse">{event.category}</PBadge>}
              {event.ageRating && <PBadge tone="violet">{event.ageRating}</PBadge>}
              {isOpenBar && <PBadge tone="cyan">Open Bar</PBadge>}
            </div>
            <h1 className={styles.heroTitle}>{event.title}</h1>
            {event.shortDescription && (
              <p className={styles.heroSubtitle}>{event.shortDescription}</p>
            )}
          </div>
        </header>

        {/* BODY */}
        <div className={styles.body}>
          {/* META GRID */}
          <GlassPanel variant="medium" radius={20} padding={18} className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <div className={styles.metaIcon} style={{ background: 'rgba(0,255,133,0.12)', borderColor: 'rgba(0,255,133,0.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={flyerPalette.green} strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <div className={styles.metaLabel}>Quando</div>
                <div className={styles.metaValue}>
                  {dateLong}
                  {timeLong ? ` · ${timeLong}` : ''}
                </div>
              </div>
            </div>
            <div className={styles.metaItem}>
              <div className={styles.metaIcon} style={{ background: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.2)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={flyerPalette.violet} strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <div className={styles.metaLabel}>Onde</div>
                <div className={styles.metaValue}>
                  {venueName}
                  {venueCity ? ` · ${venueCity}` : ''}
                </div>
                {venueAddress && (
                  <div className={styles.metaSub}>{venueAddress}</div>
                )}
              </div>
            </div>
          </GlassPanel>

          {/* LINEUP */}
          {lineupItems.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Line-up</div>
              <div className={styles.lineupChips}>
                {lineupItems.map((l) => (
                  <span key={l.key} className={styles.lineupChip}>
                    {l.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* DESCRIPTION */}
          {event.description && (
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Sobre o evento</div>
              <div
                className={styles.description}
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </section>
          )}

          {/* BATCHES */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Selecione o lote</div>
            <div className={styles.batchList}>
              {batches.length === 0 ? (
                <div className={styles.empty}>
                  Nenhum lote disponível no momento.
                </div>
              ) : (
                batches.map((b) => {
                  const left = remaining(b);
                  const isSelected = b.id === selectedBatchId;
                  const isOut = left === 0;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => !isOut && setSelectedBatchId(b.id)}
                      disabled={isOut}
                      className={`${styles.batchCard} ${isSelected ? styles.batchCardSelected : ''} ${isOut ? styles.batchCardOut : ''}`}
                    >
                      <div className={styles.batchLeft}>
                        <div className={styles.batchName}>{b.name}</div>
                        {b.description && (
                          <div className={styles.batchDescription}>
                            {b.description}
                          </div>
                        )}
                        <div className={styles.batchTagRow}>
                          {isOut ? (
                            <PBadge tone="red">Esgotado</PBadge>
                          ) : left < 30 ? (
                            <PBadge tone="amber">
                              Restam {left}
                            </PBadge>
                          ) : b.type === 'vip' ? (
                            <PBadge tone="violet">Premium</PBadge>
                          ) : (
                            <PBadge tone="pulse">Disponível</PBadge>
                          )}
                        </div>
                      </div>
                      <div className={styles.batchRight}>
                        <div className={styles.batchPrice}>
                          {formatBRL(cents(b))}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <div style={{ height: 160 }} />
        </div>

        {/* BOTTOM CTA */}
        <div className={styles.bottomBar}>
          <div className={styles.bottomBarInner}>
            <div>
              <div className={styles.bottomLabel}>
                {selectedBatch
                  ? `${quantity} ${quantity === 1 ? 'ingresso' : 'ingressos'} · subtotal`
                  : `${dateLabel} · ${venueCity}`}
              </div>
              <div className={styles.bottomPrice}>
                {selectedBatch ? (
                  <>
                    R${' '}
                    <span className={styles.bottomPriceValue}>
                      {(subtotalCents / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </>
                ) : batches.length ? (
                  <>
                    desde{' '}
                    <span className={styles.bottomPriceValue}>
                      {formatBRL(Math.min(...batches.map(cents)))}
                    </span>
                  </>
                ) : (
                  'Em breve'
                )}
              </div>
            </div>
            {selectedBatch && (
              <div className={styles.quantity}>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(remaining(selectedBatch), quantity + 1))}
                  disabled={selectedBatch && quantity >= remaining(selectedBatch)}
                >
                  +
                </button>
              </div>
            )}
            <PButton
              variant="primary"
              size="lg"
              disabled={!selectedBatch}
              onClick={() => {
                if (!selectedBatch) return;
                if (!isAuthenticated) {
                  navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
                  return;
                }
                navigate(
                  `/checkout?eventId=${event.id}&batchId=${selectedBatch.id}&qty=${quantity}`,
                );
              }}
              iconRight={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              }
            >
              {selectedBatch ? 'Continuar' : 'Selecione um lote'}
            </PButton>
          </div>
        </div>
      </article>
    </PpLayout>
  );
};

export default EventPage;
