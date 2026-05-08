import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosService } from '../pos.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pointsOfSale = new Map<string, any>();
const transactions = new Map<string, any>();

vi.mock('../../../../config/database', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(({ where }) => Promise.resolve(events.get(where.id) ?? null)),
    },
    pointOfSale: {
      create: vi.fn(({ data }) => {
        const id = `pos-${pointsOfSale.size + 1}`;
        const p = { id, isArchived: false, createdAt: new Date(), ...data };
        pointsOfSale.set(id, p);
        return Promise.resolve(p);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const p = pointsOfSale.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.event) {
          return Promise.resolve({ ...p, event: events.get(p.eventId) });
        }
        return Promise.resolve(p);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(pointsOfSale.values()).filter(
            (p) => p.eventId === where.eventId && !p.isArchived,
          ),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const p = pointsOfSale.get(where.id);
        Object.assign(p, data);
        return Promise.resolve(p);
      }),
    },
    cashlessTransaction: {
      count: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(transactions.values()).filter(
            (t) => t.posId === where.posId && t.createdAt > where.createdAt.gte,
          ).length,
        ),
      ),
    },
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_POS_CREATED: 'cashless.pos_created',
    CASHLESS_POS_UPDATED: 'cashless.pos_updated',
    CASHLESS_POS_ARCHIVED: 'cashless.pos_archived',
  },
}));

describe('PosService', () => {
  beforeEach(() => {
    pointsOfSale.clear();
    transactions.clear();
    vi.clearAllMocks();
  });

  it('cria POS no evento da org', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar Central', type: 'bar', isActive: true },
    });
    expect(pos.name).toBe('Bar Central');
  });

  it('archive bloqueia se há transação <24h', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar X', type: 'bar', isActive: true },
    });
    transactions.set('t1', { posId: pos.id, createdAt: new Date() });

    await expect(
      PosService.archive({ organizationId: 'org-1', posId: pos.id, actorId: 'u1' }),
    ).rejects.toThrow(/transações recentes/i);
  });

  it('archive permite quando não há transação recente', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar Y', type: 'bar', isActive: true },
    });
    const result = await PosService.archive({
      organizationId: 'org-1',
      posId: pos.id,
      actorId: 'u1',
    });
    expect(result.isArchived).toBe(true);
  });
});
