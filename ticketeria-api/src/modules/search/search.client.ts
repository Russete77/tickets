/**
 * Cliente leve para Meilisearch.
 * Sem dependência externa — usa fetch nativo Node 20.
 *
 * Auditoria CTO 2026-05 — gap 4.3
 */
import { logger } from '../../shared/logger';

const HOST = process.env.MEILI_HOST ?? 'http://localhost:7700';
const API_KEY = process.env.MEILI_MASTER_KEY ?? '';
export const EVENTS_INDEX = 'events';

async function meili<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(`${HOST}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meilisearch ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface IndexedEvent {
  id: string;
  organizationId?: string | null;
  title: string;
  slug: string;
  shortDescription: string;
  category: string;
  status: string;
  venueName: string;
  venueLat?: number | null;
  venueLng?: number | null;
  startsAtTs: number; // unix ms
  endsAtTs: number;
  tags: string[];
  ageRating: string;
  coverImageUrl: string;
  minPriceCents?: number;
}

export const searchClient = {
  async ensureIndex(): Promise<void> {
    try {
      await meili(`/indexes/${EVENTS_INDEX}`);
    } catch {
      await meili('/indexes', {
        method: 'POST',
        body: { uid: EVENTS_INDEX, primaryKey: 'id' },
      });
      await meili(`/indexes/${EVENTS_INDEX}/settings/searchable-attributes`, {
        method: 'PUT',
        body: ['title', 'shortDescription', 'venueName', 'tags', 'category'],
      });
      await meili(`/indexes/${EVENTS_INDEX}/settings/filterable-attributes`, {
        method: 'PUT',
        body: [
          'status',
          'category',
          'tags',
          'ageRating',
          'organizationId',
          'startsAtTs',
          'minPriceCents',
        ],
      });
      await meili(`/indexes/${EVENTS_INDEX}/settings/sortable-attributes`, {
        method: 'PUT',
        body: ['startsAtTs', 'minPriceCents'],
      });
    }
  },

  async upsert(events: IndexedEvent[]): Promise<void> {
    if (events.length === 0) return;
    await meili(`/indexes/${EVENTS_INDEX}/documents`, {
      method: 'POST',
      body: events,
    });
    logger.debug({ count: events.length }, 'Meilisearch upsert');
  },

  async remove(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await meili(`/indexes/${EVENTS_INDEX}/documents/delete-batch`, {
      method: 'POST',
      body: ids,
    });
  },

  async search(args: {
    q: string;
    filters?: string;
    sort?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ hits: IndexedEvent[]; estimatedTotalHits: number }> {
    return meili(`/indexes/${EVENTS_INDEX}/search`, {
      method: 'POST',
      body: {
        q: args.q,
        filter: args.filters,
        sort: args.sort,
        limit: args.limit ?? 20,
        offset: args.offset ?? 0,
      },
    });
  },

  async health(): Promise<boolean> {
    try {
      await meili('/health');
      return true;
    } catch {
      return false;
    }
  },
};
