import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  eventsByQuery: {} as Record<string, any[]>,
  ticketsByEvent: {} as Record<string, Array<{ holderId: string }>>,
  favoritesByEvent: {} as Record<string, Array<{ userId: string }>>,
  batchesData: [] as any[],
  pushAdd: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../config/database', () => ({
  prisma: {
    event: {
      findMany: vi.fn(({ where }: any) => {
        if (where?.startsAt) return Promise.resolve(state.eventsByQuery.startsAt ?? []);
        if (where?.endsAt) return Promise.resolve(state.eventsByQuery.endsAt ?? []);
        return Promise.resolve([]);
      }),
      findFirst: vi.fn(({ where }: any) => {
        if (where?.startsAt?.gt) {
          return Promise.resolve(state.eventsByQuery.upcoming?.[0] ?? null);
        }
        return Promise.resolve(null);
      }),
    },
    ticket: {
      findMany: vi.fn(({ where }: any) => Promise.resolve(state.ticketsByEvent[where.eventId] ?? [])),
    },
    ticketBatch: {
      findMany: vi.fn(() => Promise.resolve(state.batchesData)),
    },
    favorite: {
      findMany: vi.fn(({ where }: any) => Promise.resolve(state.favoritesByEvent[where.eventId] ?? [])),
    },
  },
}));
vi.mock('../../../jobs/queue', () => ({ pushQueue: { add: state.pushAdd } }));

import { NotificationTriggersService } from '../notification-triggers.service';

describe('NotificationTriggersService', () => {
  beforeEach(() => {
    for (const k of Object.keys(state.eventsByQuery)) delete state.eventsByQuery[k];
    for (const k of Object.keys(state.ticketsByEvent)) delete state.ticketsByEvent[k];
    for (const k of Object.keys(state.favoritesByEvent)) delete state.favoritesByEvent[k];
    state.batchesData.length = 0;
    state.pushAdd.mockClear();
    NotificationTriggersService.__resetDedupeForTests();
  });

  it('eventStartsIn30min enfileira push por holder distinto', async () => {
    state.eventsByQuery.startsAt = [{ id: 'ev-1', title: 'Show', startsAt: new Date() }];
    state.ticketsByEvent['ev-1'] = [{ holderId: 'u-1' }, { holderId: 'u-2' }];

    await NotificationTriggersService.eventStartsIn30min();

    expect(state.pushAdd).toHaveBeenCalledTimes(2);
    expect(state.pushAdd.mock.calls[0][1].data.type).toBe('event_starts_in_30min');
  });

  it('dedupe — não enfileira a mesma combinação 2x dentro do TTL', async () => {
    state.eventsByQuery.startsAt = [{ id: 'ev-1', title: 'Show', startsAt: new Date() }];
    state.ticketsByEvent['ev-1'] = [{ holderId: 'u-1' }];

    await NotificationTriggersService.eventStartsIn30min();
    await NotificationTriggersService.eventStartsIn30min();

    expect(state.pushAdd).toHaveBeenCalledTimes(1);
  });

  it('batchOpens dispara push pra cada user que favoritou o evento', async () => {
    state.batchesData.push({
      id: 'b-1',
      eventId: 'ev-1',
      name: '2º lote',
      event: { id: 'ev-1', title: 'Show' },
    });
    state.favoritesByEvent['ev-1'] = [{ userId: 'u-1' }, { userId: 'u-2' }, { userId: 'u-3' }];

    await NotificationTriggersService.batchOpens();

    expect(state.pushAdd).toHaveBeenCalledTimes(3);
    expect(state.pushAdd.mock.calls[0][1].data.batchId).toBe('b-1');
  });

  it('upsellRemarketing só dispara se houver próximo evento da mesma org', async () => {
    state.eventsByQuery.endsAt = [{ id: 'ev-past', title: 'Festa', organizationId: 'org-1' }];
    state.eventsByQuery.upcoming = [{ id: 'ev-next', title: 'Festa 2', organizationId: 'org-1' }];
    state.ticketsByEvent['ev-past'] = [{ holderId: 'u-1' }];

    await NotificationTriggersService.upsellRemarketing();

    expect(state.pushAdd).toHaveBeenCalledTimes(1);
    expect(state.pushAdd.mock.calls[0][1].data.to).toBe('ev-next');
  });

  it('upsellRemarketing NÃO dispara se não há próximo evento', async () => {
    state.eventsByQuery.endsAt = [{ id: 'ev-past', title: 'Festa', organizationId: 'org-1' }];
    state.ticketsByEvent['ev-past'] = [{ holderId: 'u-1' }];

    await NotificationTriggersService.upsellRemarketing();

    expect(state.pushAdd).not.toHaveBeenCalled();
  });
});
