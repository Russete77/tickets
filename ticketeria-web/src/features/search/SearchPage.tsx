import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInfiniteScroll } from '@shared/hooks/useInfiniteScroll';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { api } from '@shared/lib/api';
import { useTranslation } from '@shared/i18n';
import {
  PpLayout,
  PBadge,
  flyerPalette,
} from '@/design-system';
import styles from './SearchPage.module.css';

interface EventResult {
  id: string;
  slug: string;
  title: string;
  coverImageUrl?: string;
  coverImage?: string;
  shortDescription?: string;
  category?: string;
  startsAt?: string;
  startDate?: string;
  venueName?: string;
  venueCity?: string;
  venue?: { name?: string; city?: string };
  city?: string;
  priceFromCents?: number;
  currentBatchPrice?: number;
  isOpenBar?: boolean;
}

interface SearchResponse {
  data: EventResult[];
  pagination: {
    nextCursor: string | null;
    total?: number;
  };
}

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Shows', value: 'show' },
  { label: 'Festas', value: 'festival' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Esporte', value: 'esporte' },
  { label: 'Open Bar', value: 'openbar' },
];

const CITY_PRESETS = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre', 'Recife'];

const SearchPage: React.FC = () => {
  useTranslation();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const city = params.get('city') ?? '';

  useDocumentHead({
    title: q ? `"${q}" — PulsePass` : 'Buscar eventos — PulsePass',
    description: q
      ? `Resultados para "${q}" — descubra rolês na PulsePass.`
      : 'Busque ingressos para shows, festas e eventos.',
  });

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['search', q, category, city],
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (category) qs.set('category', category);
      if (city) qs.set('city', city);
      qs.set('limit', '12');
      if (pageParam) qs.set('cursor', pageParam as string);
      const r = await api.get<SearchResponse>(`/v1/events/search?${qs.toString()}`);
      return (r.data ?? { data: [], pagination: { nextCursor: null } }) as SearchResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last?.pagination?.nextCursor ?? undefined,
    staleTime: 5 * 60_000,
  });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (input.trim()) next.set('q', input.trim());
    else next.delete('q');
    setParams(next);
  };

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };

  const clearFilter = (key: string) => {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next);
  };

  const items: EventResult[] = (data?.pages ?? []).flatMap((p) => p?.data ?? []);
  const total = data?.pages?.[0]?.pagination?.total ?? items.length;

  return (
    <PpLayout intensity={0.4}>
      <main className={styles.main}>
        {/* Search bar */}
        <form onSubmit={submit} className={styles.searchForm}>
          <Link to="/" className={styles.backBtn} aria-label="Voltar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <div className={styles.searchInputWrap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pp-pulse)" strokeWidth="2" className={styles.searchIcon}>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Buscar evento, artista, casa…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={styles.searchInput}
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput('')}
                className={styles.searchClear}
                aria-label="Limpar"
              >
                ×
              </button>
            )}
          </div>
        </form>

        {/* Filter chips */}
        <div className={styles.chipsRow}>
          {CATEGORIES.map((c) => (
            <button
              key={c.value || 'all'}
              type="button"
              onClick={() => setFilter('category', c.value)}
              className={`${styles.chip} ${category === c.value ? styles.chipActive : ''}`}
            >
              {c.label}
              {category === c.value && <span className={styles.chipX}>×</span>}
            </button>
          ))}
        </div>

        {/* City chips (secondary) */}
        <div className={styles.chipsRow}>
          {CITY_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter('city', city === c ? '' : c)}
              className={`${styles.chipCity} ${city === c ? styles.chipCityActive : ''}`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Active filters */}
        {(category || city || q) && (
          <div className={styles.activeFilters}>
            <span className={styles.eyebrow}>Filtros ativos</span>
            {q && (
              <PBadge tone="pulse" dot>
                {q}
              </PBadge>
            )}
            {category && (
              <button type="button" onClick={() => clearFilter('category')} className={styles.activeFilter}>
                {CATEGORIES.find((c) => c.value === category)?.label ?? category} ×
              </button>
            )}
            {city && (
              <button type="button" onClick={() => clearFilter('city')} className={styles.activeFilter}>
                {city} ×
              </button>
            )}
          </div>
        )}

        {/* Result count */}
        <div className={styles.countRow}>
          <span className={styles.countText}>
            {isLoading ? (
              'Buscando…'
            ) : items.length === 0 ? (
              'Nenhum resultado'
            ) : (
              <>
                <span className={styles.countNumber}>{total}</span>{' '}
                {total === 1 ? 'evento encontrado' : 'eventos encontrados'}
              </>
            )}
          </span>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className={styles.list}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            <div
              className={styles.emptyGlow}
              style={{
                background: `radial-gradient(60% 60% at 50% 50%, ${flyerPalette.violet}, transparent 70%)`,
              }}
            />
            <h3 className={styles.emptyTitle}>Nada por aqui</h3>
            <p className={styles.emptyBody}>
              Tenta um termo diferente, outra cidade ou remove os filtros.
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {items.map((event, i) => (
              <ResultRow key={event.id} event={event} index={i} />
            ))}
          </div>
        )}

        {/* Sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {isFetchingNextPage && (
          <div className={styles.loadingMore}>Carregando mais eventos…</div>
        )}
      </main>
    </PpLayout>
  );
};

const ResultRow: React.FC<{ event: EventResult; index: number }> = ({ event, index }) => {
  const palette: Array<[string, string]> = [
    [flyerPalette.green, flyerPalette.violet],
    [flyerPalette.pink, flyerPalette.amber],
    [flyerPalette.cyan, flyerPalette.violet],
    [flyerPalette.amber, flyerPalette.pink],
    [flyerPalette.violet, flyerPalette.cyan],
  ];
  const [hue, hue2] = palette[index % palette.length];
  const cover = event.coverImageUrl ?? event.coverImage;
  const venue = event.venueName ?? event.venue?.name ?? '';
  const city = event.venueCity ?? event.venue?.city ?? event.city ?? '';
  const dateRaw = event.startsAt ?? event.startDate;
  const dateLabel = dateRaw
    ? new Date(dateRaw)
        .toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
        .toUpperCase()
    : 'EM BREVE';
  const price = event.currentBatchPrice ?? (event.priceFromCents != null ? event.priceFromCents / 100 : null);
  const isFree = price === 0;

  return (
    <Link to={`/event/${event.slug}`} className={styles.resultLink}>
      <div className={styles.result}>
        <div
          className={styles.resultImage}
          style={{
            background: cover
              ? `linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7)), url(${cover}) center/cover`
              : `radial-gradient(80% 80% at 20% 20%, ${hue}, transparent 60%), radial-gradient(80% 80% at 80% 80%, ${hue2}, transparent 60%), #0a0a0c`,
          }}
        >
          <div className={styles.resultDate}>{dateLabel}</div>
        </div>
        <div className={styles.resultInfo}>
          <div className={styles.resultTitle}>{event.title}</div>
          <div className={styles.resultSub}>
            {venue}
            {city ? ` · ${city}` : ''}
          </div>
          <div className={styles.resultBadges}>
            {event.isOpenBar && <PBadge tone="violet">Open Bar</PBadge>}
            {event.category && <PBadge tone="cyan">{event.category}</PBadge>}
          </div>
        </div>
        <div className={styles.resultPrice}>
          {isFree ? (
            <>
              <div className={styles.priceFree}>LIVRE</div>
            </>
          ) : price != null ? (
            <>
              <div className={styles.priceFrom}>desde</div>
              <div className={styles.priceValue}>R$ {price.toFixed(0)}</div>
            </>
          ) : (
            <div className={styles.priceFrom}>—</div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default SearchPage;
