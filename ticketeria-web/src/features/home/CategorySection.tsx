import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@shared/lib/api';
import { useInfiniteScroll } from '@shared/hooks/useInfiniteScroll';
import { Skeleton } from '@shared/ui/Skeleton/Skeleton';
import EventCard, { EventData } from './EventCard';
import styles from './CategorySection.module.css';

const CATEGORIES = [
  { label: 'Shows', value: 'shows' },
  { label: 'Festas', value: 'festas' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Esporte', value: 'esporte' },
  { label: 'Museu', value: 'museu' },
  { label: 'Cursos', value: 'cursos' },
  { label: 'Open Bar', value: 'openbar' },
];

interface CategoryResponse {
  data: EventData[];
  pagination: {
    nextCursor: string | null;
  };
}

const CategorySection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['category-events', activeCategory.value],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        category: activeCategory.value,
        limit: '6',
        ...(pageParam ? { cursor: pageParam as string } : {}),
      });
      const response = await api.get(`/v1/events/search?${params}`);
      return response.data as CategoryResponse;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: CategoryResponse) => lastPage?.pagination?.nextCursor ?? undefined,
    staleTime: 1000 * 60 * 15,
  });

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: fetchNextPage,
    hasMore: !!hasNextPage,
    isLoading: isFetchingNextPage,
  });

  const handleLoadMore = useCallback(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  const items = data?.pages.flatMap((page: CategoryResponse | undefined) => page?.data ?? []) ?? [];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.label}>Explorar</span>
            <h2 className={styles.title}>Eventos por categoria</h2>
          </div>
          <Link to={`/search?category=${activeCategory.value}`} className={styles.viewAll}>
            Ver todos →
          </Link>
        </div>

        {/* Category tabs */}
        <div className={styles.tabsContainer}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`${styles.tab} ${activeCategory.value === cat.value ? styles.active : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Events grid */}
        <div className={styles.grid}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton width="100%" height="320px" borderRadius="12px" />
                </div>
              ))
            : items.length > 0
            ? items.map((event) => (
                <div key={event.id} className={styles.cardContainer}>
                  <EventCard event={event} size="md" />
                </div>
              ))
            : (
              <div className={styles.empty}>
                Nenhum evento em <strong>{activeCategory.label}</strong> no momento
              </div>
            )}
        </div>

        {hasNextPage && !isLoading && items.length > 0 && (
          <div className={styles.loadMoreContainer}>
            <button
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? 'Carregando...' : 'Carregar mais eventos'}
            </button>
          </div>
        )}

        <div ref={sentinelRef} style={{ height: '1px' }} />
      </div>
    </section>
  );
};

export default CategorySection;
