import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockService } from '../stock.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'event-1' }]]);
const products = new Map<string, any>([
  ['prod-1', {
    id: 'prod-1', posId: 'pos-1', name: 'X', stockQty: 50,
    lowStockThreshold: 10, isAvailable: true, isArchived: false,
  }],
]);
const movements: any[] = [];

vi.mock('../../../../config/database', () => ({
  prisma: {
    pOSProduct: {
      findUnique: vi.fn(({ where, include }) => {
        const p = products.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.pos) {
          const posObj = pos.get(p.posId);
          return Promise.resolve({
            ...p,
            pos: { ...posObj, event: events.get(posObj!.eventId) },
          });
        }
        return Promise.resolve(p);
      }),
      update: vi.fn(({ where, data }) => {
        const p = products.get(where.id);
        if (data.stockQty?.increment !== undefined) p.stockQty += data.stockQty.increment;
        else if (data.stockQty?.decrement !== undefined) p.stockQty -= data.stockQty.decrement;
        else Object.assign(p, data);
        return Promise.resolve(p);
      }),
      findMany: vi.fn(() => Promise.resolve(Array.from(products.values()))),
    },
    stockMovement: {
      create: vi.fn(({ data }) => {
        const m = { id: `m-${movements.length + 1}`, createdAt: new Date(), ...data };
        movements.push(m);
        return Promise.resolve(m);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(movements.filter((m) => m.productId === where.productId)),
      ),
    },
    $transaction: vi.fn(async (cb) =>
      cb({
        pOSProduct: {
          update: vi.fn(({ where, data }) => {
            const p = products.get(where.id);
            if (data.stockQty?.increment !== undefined) p.stockQty += data.stockQty.increment;
            else Object.assign(p, data);
            return Promise.resolve(p);
          }),
        },
        stockMovement: {
          create: vi.fn(({ data }) => {
            const m = { id: `m-${movements.length + 1}`, createdAt: new Date(), ...data };
            movements.push(m);
            return Promise.resolve(m);
          }),
        },
      }),
    ),
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: { CASHLESS_STOCK_MOVEMENT: 'cashless.stock_movement' },
}));

vi.mock('../../shared/catalogEvents', () => ({
  emitCatalogUpdated: vi.fn(() => Promise.resolve()),
  emitStockLow: vi.fn(() => Promise.resolve()),
  emitStockOut: vi.fn(() => Promise.resolve()),
}));

import { emitStockLow, emitStockOut } from '../../shared/catalogEvents';

describe('StockService', () => {
  beforeEach(() => {
    products.set('prod-1', {
      id: 'prod-1', posId: 'pos-1', name: 'X', stockQty: 50,
      lowStockThreshold: 10, isAvailable: true, isArchived: false,
    });
    movements.length = 0;
    vi.clearAllMocks();
  });

  it('entry incrementa stockQty', async () => {
    const m = await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'stock_entry', quantity: 20 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(70);
    expect(m.quantity).toBe(20);
  });

  it('loss decrementa stockQty', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'loss', quantity: 5 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(45);
  });

  it('emit stock:low quando passa threshold', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'adjustment', quantity: -45 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(5);
    expect(emitStockLow).toHaveBeenCalled();
  });

  it('emit stock:out + auto-disable quando chega a 0', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'adjustment', quantity: -50 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(0);
    expect(emitStockOut).toHaveBeenCalled();
  });
});
