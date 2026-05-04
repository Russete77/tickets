/**
 * Worker: sincroniza eventos com Meilisearch.
 *
 * Triggers:
 *   - Quando Event muda status para 'published' / 'cancelled' (chamada explícita).
 *   - CRON nightly: ressincroniza tudo (rebuild integral).
 *
 * Auditoria CTO 2026-05 — gap 4.3
 */
import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { searchClient, IndexedEvent } from '../../modules/search/search.client';

interface SyncJob {
  type: 'upsert' | 'remove' | 'rebuild';
  eventIds?: string[];
}

async function buildIndexedEvent(eventId: string): Promise<IndexedEvent | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      batches: {
        where: { isVisible: true },
        orderBy: { priceCents: 'asc' },
        take: 1,
      },
    },
  });
  if (!event) return null;
  return {
    id: event.id,
    organizationId: null, // backfill quando Event.organizationId estiver populado
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    category: event.category,
    status: event.status,
    venueName: event.venueName,
    venueLat: event.venueLat ? Number(event.venueLat) : null,
    venueLng: event.venueLng ? Number(event.venueLng) : null,
    startsAtTs: event.startsAt.getTime(),
    endsAtTs: event.endsAt.getTime(),
    tags: event.tags,
    ageRating: event.ageRating,
    coverImageUrl: event.coverImageUrl,
    minPriceCents: event.batches[0]?.priceCents,
  };
}

export const searchSyncWorker = new Worker<SyncJob>(
  'search-sync',
  async (job: Job<SyncJob>) => {
    await searchClient.ensureIndex();

    if (job.data.type === 'rebuild') {
      const events = await prisma.event.findMany({ where: { status: 'published' } });
      const indexed: IndexedEvent[] = [];
      for (const e of events) {
        const doc = await buildIndexedEvent(e.id);
        if (doc) indexed.push(doc);
      }
      // Upsert em chunks de 500.
      for (let i = 0; i < indexed.length; i += 500) {
        await searchClient.upsert(indexed.slice(i, i + 500));
      }
      logger.info({ count: indexed.length }, 'search rebuild complete');
      return;
    }

    if (job.data.type === 'remove' && job.data.eventIds?.length) {
      await searchClient.remove(job.data.eventIds);
      return;
    }

    if (job.data.type === 'upsert' && job.data.eventIds?.length) {
      const docs: IndexedEvent[] = [];
      for (const id of job.data.eventIds) {
        const doc = await buildIndexedEvent(id);
        if (doc) docs.push(doc);
      }
      await searchClient.upsert(docs);
    }
  },
  { connection: redis, concurrency: 4 },
);
