import { z } from 'zod';

export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export type CursorPagination = z.infer<typeof cursorPaginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    prevCursor: string | null;
    total?: number;
  };
}

export function buildCursorPagination(params: CursorPagination) {
  const { cursor, limit, direction } = params;

  return {
    take: limit + 1, // +1 para saber se tem mais
    ...(cursor
      ? {
          skip: 1, // Pula o cursor atual
          cursor: { id: cursor },
        }
      : {}),
    orderBy: { createdAt: direction === 'forward' ? ('desc' as const) : ('asc' as const) },
  };
}

export function formatPaginatedResponse<T extends { id: string }>(
  items: T[],
  limit: number,
  total?: number,
): PaginatedResponse<T> {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;

  return {
    data,
    pagination: {
      hasMore,
      nextCursor: hasMore && data.length > 0 ? data[data.length - 1].id : null,
      prevCursor: data.length > 0 ? data[0].id : null,
      total,
    },
  };
}
