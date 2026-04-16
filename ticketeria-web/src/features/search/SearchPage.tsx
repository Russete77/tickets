import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PublicLayout } from '@shared/layout/PublicLayout/PublicLayout';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import { useInfiniteScroll } from '@shared/hooks/useInfiniteScroll';
import { useDocumentHead } from '@shared/hooks/useDocumentHead';
import { api } from '@shared/lib/api';
import { Icon } from '@shared/ui/Icon/Icon';
import EventCard, { EventData } from '@features/home/EventCard';
import styles from './SearchPage.module.css';

interface SearchResponse {
  data: EventData[];
  pagination: {
    total: number;
    nextCursor: string | null;
  };
}

const CATEGORIES = [
  { label: 'Todos', value: '' },
  { label: 'Shows', value: 'shows' },
  { label: 'Festas', value: 'festas' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Esporte', value: 'esporte' },
  { label: 'Museu', value: 'museu' },
  { label: 'Cursos', value: 'cursos' },
  { label: 'Open Bar', value: 'openbar' },
];

const SORT_OPTIONS = [
  { label: 'Relevância', value: 'relevance' },
  { label: 'Mais próximos', value: 'date_asc' },
  { label: 'Menor preço', value: 'price_asc' },
  { label: 'Maior preço', value: 'price_desc' },
  { label: 'Mais populares', value: 'trending' },
];

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const sort = searchParams.get('sort') ?? 'relevance';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  // Set SEO meta tags
  useDocumentHead({
    title: q ? `Resultados para "${q}" — Ticketeria Digital` : 'Buscar eventos — Ticketeria Digital',
    description: q
      ? `Encontre ingressos para ${q} e outros eventos na Ticketeria Digital`
      : 'Busque ingressos para shows, festas, teatro, esportes e eventos culturais',
    keywords:
      'buscar eventos, ingressos, busca de eventos, eventos digitais',
    ogTitle: 'Buscar eventos — Ticketeria Digital',
    ogDescription: 'Descubra eventos e compre seus ingressos online',
    ogUrl: window.location.href,
    ogType: 'website',
    ogSiteName: 'Ticketeria Digital',
    twitterCard: 'summary',
    twitterTitle: 'Buscar eventos — Ticketeria Digital',
    twitterDescription: 'Descubra eventos e compre seus ingressos online',
  });

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: ['search', q, category, sort, dateFrom, dateTo],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('category', category);
      if (sort) params.set('sort', sort);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      params.set('limit', '12');
      if (pageParam) params.set('cursor', pageParam as string);
      const response = await api.get(`/v1/events/search?${params}`);
      return response.data as SearchResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.pagination?.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 5,
  });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  const events = data?.pages.flatMap((p) => p?.data ?? []) ?? [];
  const total = data?.pages[0]?.pagination?.total ?? 0;

  const updateParam = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Reset cursor when filters change
    next.delete('cursor');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput);
  };

  // Sync input when q param changes from elsewhere
  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '');
  }, [searchParams]);

  return (
    <PublicLayout>
      <div className={styles.page}>
        {/* ── Search bar ── */}
        <div className={styles.searchBar}>
          <div className={styles.searchBarInner}>
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <Icon name="search" size={18} className={styles.searchIcon} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Shows, festas, teatro, artistas..."
                className={styles.searchInput}
              />
              <button type="submit" className={styles.searchBtn}>Buscar</button>
            </form>
          </div>
        </div>

        <div className={styles.layout}>
          {/* ── Sidebar filters ── */}
          <aside className={styles.sidebar}>
            <div className={styles.filterGroup}>
              <h3 className={styles.filterTitle}>Categoria</h3>
              <div className={styles.filterList}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    className={`${styles.filterBtn} ${category === cat.value ? styles.filterBtnActive : ''}`}
                    onClick={() => updateParam('category', cat.value)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <h3 className={styles.filterTitle}>Período</h3>
              <div className={styles.dateRange}>
                <label className={styles.dateLabel}>De</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateParam('dateFrom', e.target.value)}
                  className={styles.dateInput}
                />
                <label className={styles.dateLabel}>Até</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateParam('dateTo', e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>
          </aside>

          {/* ── Results ── */}
          <main className={styles.results}>
            {/* Results header */}
            <div className={styles.resultsHeader}>
              {!isLoading && (
                <p className={styles.resultCount}>
                  {total > 0 ? (
                    <><strong>{total.toLocaleString('pt-BR')}</strong> eventos encontrados</>
                  ) : events.length > 0 ? (
                    <><strong>{events.length}</strong> eventos</>
                  ) : null}
                </p>
              )}
              <div className={styles.sortWrapper}>
                <label className={styles.sortLabel}>Ordenar:</label>
                <select
                  value={sort}
                  onChange={(e) => updateParam('sort', e.target.value)}
                  className={styles.sortSelect}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filters */}
            {(q || category || dateFrom) && (
              <div className={styles.activeFilters}>
                {q && (
                  <span className={styles.filterChip}>
                    "{q}"
                    <button onClick={() => updateParam('q', '')}>×</button>
                  </span>
                )}
                {category && (
                  <span className={styles.filterChip}>
                    {CATEGORIES.find(c => c.value === category)?.label ?? category}
                    <button onClick={() => updateParam('category', '')}>×</button>
                  </span>
                )}
                {dateFrom && (
                  <span className={styles.filterChip}>
                    {dateFrom}
                    <button onClick={() => updateParam('dateFrom', '')}>×</button>
                  </span>
                )}
              </div>
            )}

            {/* Grid */}
            {isError ? (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}><Icon name="warning" size={48} /></div>
                <h3 className={styles.emptyTitle}>Erro ao carregar</h3>
                <p className={styles.emptyDesc}>Não foi possível carregar os resultados. Tente novamente.</p>
              </div>
            ) : isLoading ? (
              <div className={styles.grid}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} width="100%" height="340px" borderRadius="12px" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}><Icon name="search" size={48} /></div>
                <h3 className={styles.emptyTitle}>Nenhum evento encontrado</h3>
                <p className={styles.emptyDesc}>Tente ajustar seus filtros ou buscar por outros termos.</p>
                <button className={styles.emptyLink} onClick={() => navigate('/')}>
                  Ver todos os eventos
                </button>
              </div>
            ) : (
              <div className={styles.grid}>
                {events.map((event) => (
                  <EventCard key={event.id} event={event} size="md" />
                ))}
              </div>
            )}

            {/* Load more sentinel */}
            <div ref={sentinelRef} style={{ height: '1px' }} />

            {isFetchingNextPage && (
              <div className={styles.loadingMore}>
                <div className={styles.loadingDot} />
                <div className={styles.loadingDot} />
                <div className={styles.loadingDot} />
              </div>
            )}
          </main>
        </div>
      </div>
    </PublicLayout>
  );
};

export default SearchPage;
