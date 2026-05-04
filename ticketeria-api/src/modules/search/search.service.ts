/**
 * SearchService — fachada com fallback para Postgres.
 *
 * Estratégia:
 *   - Tenta Meilisearch primeiro (latência ~10ms).
 *   - Em falha, cai no `events.service.ts` clássico (Postgres ILIKE).
 *
 * Auditoria CTO 2026-05 — gap 4.3
 */
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { searchClient } from './search.client';

export class SearchService {
  static async searchEvents(args: {
    q: string;
    category?: string;
    tags?: string[];
    organizationId?: string;
    limit?: number;
    offset?: number;
    sort?: 'starts_asc' | 'starts_desc' | 'price_asc';
  }) {
    const filters: string[] = ["status = 'published'"];
    if (args.category) filters.push(`category = "${args.category}"`);
    if (args.organizationId) filters.push(`organizationId = "${args.organizationId}"`);
    if (args.tags?.length) {
      filters.push(`tags IN [${args.tags.map((t) => `"${t}"`).join(', ')}]`);
    }

    const sort: string[] = (() => {
      switch (args.sort) {
        case 'starts_desc':
          return ['startsAtTs:desc'];
        case 'price_asc':
          return ['minPriceCents:asc'];
        case 'starts_asc':
        default:
          return ['startsAtTs:asc'];
      }
    })();

    try {
      const result = await searchClient.search({
        q: args.q,
        filters: filters.join(' AND '),
        sort,
        limit: args.limit,
        offset: args.offset,
      });
      return {
        hits: result.hits,
        total: result.estimatedTotalHits,
        source: 'meili' as const,
      };
    } catch (err) {
      logger.warn({ err }, 'Meilisearch indisponível — fallback para Postgres');
      return this.fallbackPostgres(args);
    }
  }

  private static async fallbackPostgres(args: {
    q: string;
    category?: string;
    limit?: number;
    offset?: number;
  }) {
    const events = await prisma.event.findMany({
      where: {
        status: 'published',
        ...(args.category ? { category: args.category as never } : {}),
        OR: args.q
          ? [
              { title: { contains: args.q, mode: 'insensitive' } },
              { shortDescription: { contains: args.q, mode: 'insensitive' } },
              { venueName: { contains: args.q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      take: args.limit ?? 20,
      skip: args.offset ?? 0,
      orderBy: { startsAt: 'asc' },
    });
    return { hits: events, total: events.length, source: 'postgres' as const };
  }
}
