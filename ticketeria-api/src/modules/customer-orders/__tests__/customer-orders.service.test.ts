import { describe, it, expect, vi, beforeEach } from 'vitest';

const events = new Map([['ev-1', { id: 'ev-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'ev-1', type: 'bar', isArchived: false }]]);
const products = new Map<string, any>([
  ['p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 5, isArchived: false }],
  ['p-2', { id: 'p-2', posId: 'pos-1', name: 'Água', priceCents: 500, stockQty: null, isArchived: false }],
]);
// txProducts controls what tx.pOSProduct.findUnique returns — independently of the outer prisma mock.
// Tests that need different tx-vs-outer values override this map in their arrange step.
// beforeEach resets it to mirror `products`.
const txProducts = new Map<string, any>();
const wallets = new Map<string, any>([
  ['w-1', { id: 'w-1', eventId: 'ev-1', userId: 'u-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0 }],
]);
const orders = new Map<string, any>();
const txns = new Map<string, any>();

function txClient() {
  return {
    cashlessWallet: {
      findUnique: vi.fn(({ where }) => Promise.resolve(wallets.get(where.id) ?? null)),
      update: vi.fn(({ where, data }) => {
        const w = wallets.get(where.id);
        w.balanceCents -= data.balanceCents.decrement;
        w.totalSpentCents += data.totalSpentCents.increment;
        w.version += 1;
        return Promise.resolve({ id: w.id, balanceCents: w.balanceCents });
      }),
    },
    cashlessTransaction: {
      create: vi.fn(({ data }) => {
        const id = `tx-${txns.size + 1}`;
        txns.set(id, { id, ...data });
        return Promise.resolve({ id, createdAt: new Date() });
      }),
    },
    pOSProduct: {
      // Authoritative in-tx read — reads from txProducts so tests can diverge from outer prisma mock.
      findUnique: vi.fn(({ where }) => Promise.resolve(txProducts.get(where.id) ?? null)),
      update: vi.fn(({ where, data }) => {
        const p = products.get(where.id);
        if (data.stockQty?.decrement != null) p.stockQty -= data.stockQty.decrement;
        if (data.stockQty?.increment != null) p.stockQty += data.stockQty.increment;
        return Promise.resolve(p);
      }),
    },
    customerOrder: {
      create: vi.fn(({ data }) => {
        const id = `o-${orders.size + 1}`;
        const o = { id, status: 'pending', createdAt: new Date(), ...data };
        orders.set(id, o);
        return Promise.resolve(o);
      }),
      // Returns 0 by default (no collision) so existing tests are unaffected.
      count: vi.fn(() => Promise.resolve(0)),
    },
  };
}

vi.mock('../../../config/database', () => ({
  prisma: {
    pointOfSale: { findUnique: vi.fn(({ where }) => Promise.resolve(pos.get(where.id) ?? null)) },
    pOSProduct: { findUnique: vi.fn(({ where }) => Promise.resolve(products.get(where.id) ?? null)) },
    cashlessWallet: { findUnique: vi.fn(({ where }) => {
      if (where.eventId_userId) {
        const w = [...wallets.values()].find(
          (x) => x.eventId === where.eventId_userId.eventId && x.userId === where.eventId_userId.userId,
        );
        return Promise.resolve(w ?? null);
      }
      return Promise.resolve(wallets.get(where.id) ?? null);
    }) },
    event: { findUnique: vi.fn(({ where }) => Promise.resolve(events.get(where.id) ?? null)) },
    customerOrder: {
      findUnique: vi.fn(({ where }) => Promise.resolve(orders.get(where.id) ?? null)),
      findMany: vi.fn(() => Promise.resolve([...orders.values()])),
    },
    $transaction: vi.fn(async (fn: any) => fn(txClient())),
  },
}));
vi.mock('../../../shared/audit', () => ({ logAudit: vi.fn(() => Promise.resolve()), AuditActions: new Proxy({}, { get: (_, k) => k }) }));
vi.mock('../shared/customerOrderEvents', () => ({ emitCustomerOrderNew: vi.fn(() => Promise.resolve()), emitCustomerOrderStatus: vi.fn(() => Promise.resolve()) }));
vi.mock('../../cashless/transaction.service', () => ({
  debitWithinTx: vi.fn(async (tx, args) => {
    await tx.cashlessWallet.update({ where: { id: args.walletId }, data: { balanceCents: { decrement: args.amountCents }, totalSpentCents: { increment: args.amountCents }, version: { increment: 1 }, lastUsedAt: new Date() } });
    const t = await tx.cashlessTransaction.create({ data: { walletId: args.walletId, type: 'purchase', amountCents: args.amountCents } });
    return { transactionId: t.id, newBalance: 0, timestamp: new Date() };
  }),
  postCashlessPurchaseToLedger: vi.fn(() => Promise.resolve()),
  transactionService: { reverse: vi.fn(() => Promise.resolve({})) },
}));

import { CustomerOrdersService } from '../customer-orders.service';

describe('CustomerOrdersService.create', () => {
  beforeEach(() => { orders.clear(); txns.clear(); vi.clearAllMocks();
    wallets.set('w-1', { id: 'w-1', eventId: 'ev-1', userId: 'u-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0 });
    products.set('p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 5, isArchived: false });
    products.set('p-2', { id: 'p-2', posId: 'pos-1', name: 'Água', priceCents: 500, stockQty: null, isArchived: false });
    // Mirror outer products into txProducts so normal tests see consistent data.
    txProducts.clear();
    products.forEach((v, k) => txProducts.set(k, { ...v }));
  });

  it('cria pedido, debita wallet, baixa estoque controlado', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 2 }] });
    expect(o.totalCents).toBe(2000);
    expect(o.status).toBe('pending');
    expect(o.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(products.get('p-1').stockQty).toBe(3);
  });

  it('produto sem controle de estoque (stockQty null) não altera estoque', async () => {
    await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-2', qty: 3 }] });
    expect(products.get('p-2').stockQty).toBeNull();
  });

  it('re-precifica server-side (ignora preço do cliente)', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1, priceCents: 1 } as any] });
    expect(o.totalCents).toBe(1000);
  });

  it('rejeita saldo insuficiente', async () => {
    wallets.get('w-1').balanceCents = 100;
    await expect(CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 2 }] }))
      .rejects.toThrow(/[Ss]aldo insuficiente/);
  });

  it('rejeita estoque insuficiente', async () => {
    await expect(CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 99 }] }))
      .rejects.toThrow(/[Ee]stoque/);
  });

  it('rejeita quando usuário não tem carteira no evento', async () => {
    await expect(CustomerOrdersService.create({ userId: 'sem-wallet', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] }))
      .rejects.toThrow(/carteira/i);
  });

  it('idempotência: mesma key não cria 2º pedido', async () => {
    const a = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }], idempotencyKey: 'k1' });
    const b = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }], idempotencyKey: 'k1' });
    expect(b.id).toBe(a.id);
    expect(orders.size).toBe(1);
  });

  // Issue 2 regression: tx must use its own snapshot (tx.pOSProduct.findUnique), NOT bare prisma.
  // The outer prisma mock returns ample stock (99) so the optimistic pre-check passes.
  // The txProducts entry returns stockQty: 0 — simulating stock depleted between pre-check and tx.
  // With Issue 1 fixed (tx.pOSProduct.findUnique), the service reads txProducts and rejects.
  // If Issue 1 regresses (bare prisma.pOSProduct.findUnique), the outer mock returns 99 → no rejection → test fails.
  it('rejeita estoque esgotado lido dentro da tx (detecta regressão prisma→tx)', async () => {
    // Outer prisma sees ample stock — optimistic pre-check passes.
    products.set('p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 99, isArchived: false });
    // In-tx authoritative read sees depleted stock.
    txProducts.set('p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 0, isArchived: false });
    // Wallet must have enough balance for qty:1 at 1000 cents.
    wallets.set('w-1', { id: 'w-1', eventId: 'ev-1', userId: 'u-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0 });

    await expect(
      CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] }),
    ).rejects.toThrow(/[Ee]stoque/);
  });
});
