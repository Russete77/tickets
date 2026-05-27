import { prisma } from '../../config/database';
import { pushQueue } from '../../jobs/queue';
import { logger } from '../../shared/logger';

type TriggerKind =
  | 'event_starts_in_2h'
  | 'event_starts_in_30min'
  | 'event_batch_opens'
  | 'event_upsell_remarketing';

interface EnqueueArgs {
  userId: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  dedupeKey: string;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export class NotificationTriggersService {
  private static seen = new Map<string, number>();
  private static TTL_MS = 24 * 60 * 60 * 1000;

  private static prune() {
    const now = Date.now();
    for (const [k, ts] of this.seen) {
      if (now - ts > this.TTL_MS) this.seen.delete(k);
    }
  }

  private static async enqueue({ userId, title, body, data, dedupeKey }: EnqueueArgs) {
    if (this.seen.has(dedupeKey)) return;
    this.seen.set(dedupeKey, Date.now());
    await pushQueue.add('notification-trigger', { userId, title, body, data });
  }

  static async eventStartsIn2h() {
    const now = new Date();
    const min = new Date(now.getTime() + 110 * 60 * 1000);
    const max = new Date(now.getTime() + 130 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: { startsAt: { gte: min, lte: max }, status: 'published' },
      select: { id: true, title: true, startsAt: true },
    });
    for (const e of events) {
      const tickets = await prisma.ticket.findMany({
        where: { eventId: e.id, status: { in: ['active', 'transferred'] } },
        select: { holderId: true },
        distinct: ['holderId'],
      });
      const userIds = uniq(tickets.map((t) => t.holderId).filter((id): id is string => !!id));
      await Promise.all(userIds.map((userId) =>
        this.enqueue({
          userId,
          title: 'Falta 2h pro seu evento! 🎉',
          body: `Prepare-se: ${e.title} começa em breve.`,
          data: { type: 'event_starts_in_2h', eventId: e.id },
          dedupeKey: `e2h:${e.id}:${userId}`,
        }),
      ));
    }
  }

  static async eventStartsIn30min() {
    const now = new Date();
    const min = new Date(now.getTime() + 25 * 60 * 1000);
    const max = new Date(now.getTime() + 35 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: { startsAt: { gte: min, lte: max }, status: 'published' },
      select: { id: true, title: true },
    });
    for (const e of events) {
      const tickets = await prisma.ticket.findMany({
        where: { eventId: e.id, status: { in: ['active', 'transferred'] } },
        select: { holderId: true },
        distinct: ['holderId'],
      });
      const userIds = uniq(tickets.map((t) => t.holderId).filter((id): id is string => !!id));
      await Promise.all(userIds.map((userId) =>
        this.enqueue({
          userId,
          title: `${e.title} começa em 30min! 🚀`,
          body: 'Não esquece de levar seu ingresso. Tá tudo dentro do app.',
          data: { type: 'event_starts_in_30min', eventId: e.id },
          dedupeKey: `e30:${e.id}:${userId}`,
        }),
      ));
    }
  }

  static async batchOpens() {
    const now = new Date();
    const lookback = new Date(now.getTime() - 10 * 60 * 1000);
    const batches = await prisma.ticketBatch.findMany({
      where: {
        startsAt: { gte: lookback, lte: now },
        OR: [{ endsAt: { gte: now } }, { endsAt: null }],
        isVisible: true,
      },
      include: { event: { select: { id: true, title: true } } },
    });
    for (const b of batches) {
      const favs = await prisma.favorite.findMany({
        where: { eventId: b.eventId },
        select: { userId: true },
      });
      const userIds = uniq(favs.map((f) => f.userId));
      await Promise.all(userIds.map((userId) =>
        this.enqueue({
          userId,
          title: `Lote "${b.name}" liberado 🎫`,
          body: `${b.event?.title ?? 'Evento favorito'}: novo lote disponível!`,
          data: { type: 'event_batch_opens', eventId: b.eventId, batchId: b.id },
          dedupeKey: `batch:${b.id}:${userId}`,
        }),
      ));
    }
  }

  static async upsellRemarketing() {
    const now = new Date();
    const min = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    const max = new Date(now.getTime() - 23 * 60 * 60 * 1000);
    const events = await prisma.event.findMany({
      where: { endsAt: { gte: min, lte: max }, status: 'published' },
      select: { id: true, title: true, organizationId: true },
    });
    for (const e of events) {
      const upcoming = await prisma.event.findFirst({
        where: {
          organizationId: e.organizationId,
          startsAt: { gt: now },
          status: 'published',
          id: { not: e.id },
        },
        orderBy: { startsAt: 'asc' },
        select: { id: true, title: true },
      });
      if (!upcoming) continue;
      const tickets = await prisma.ticket.findMany({
        where: { eventId: e.id, status: { in: ['active', 'used', 'transferred'] } },
        select: { holderId: true },
        distinct: ['holderId'],
      });
      const userIds = uniq(tickets.map((t) => t.holderId).filter((id): id is string => !!id));
      await Promise.all(userIds.map((userId) =>
        this.enqueue({
          userId,
          title: `Curtiu ${e.title}? Olha o próximo 👀`,
          body: `${upcoming.title} já tem ingressos disponíveis.`,
          data: { type: 'event_upsell_remarketing', from: e.id, to: upcoming.id },
          dedupeKey: `upsell:${e.id}:${upcoming.id}:${userId}`,
        }),
      ));
    }
  }

  static async runAll() {
    this.prune();
    const started = Date.now();
    try {
      await this.eventStartsIn2h();
      await this.eventStartsIn30min();
      await this.batchOpens();
      await this.upsellRemarketing();
      logger.info({ ms: Date.now() - started }, 'notification-triggers cycle complete');
    } catch (err) {
      logger.error({ err }, 'notification-triggers cycle failed');
      throw err;
    }
  }

  static __resetDedupeForTests() {
    this.seen.clear();
  }
}

export type { TriggerKind };
