import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../transaction.service';

// ──────────────────────────────────────────────
// In-memory store
// ──────────────────────────────────────────────
const wallets = new Map<string, any>([
  ['wallet-1', { id: 'wallet-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0, lastUsedAt: null }],
  ['wallet-inactive', { id: 'wallet-inactive', balanceCents: 5000, status: 'wallet_blocked', version: 0 }],
]);
const cashlessTransactions = new Map<string, any>();
let txCounter = 0;

function makeTxClient() {
  return {
    cashlessWallet: {
      findUnique: vi.fn(({ where }) => {
        const w = wallets.get(where.id);
        return Promise.resolve(w ?? null);
      }),
      update: vi.fn(({ where, data, select }) => {
        const w = wallets.get(where.id);
        if (!w) return Promise.resolve(null);
        if (data.balanceCents?.decrement !== undefined) w.balanceCents -= data.balanceCents.decrement;
        if (data.balanceCents?.increment !== undefined) w.balanceCents += data.balanceCents.increment;
        if (data.totalSpentCents?.increment !== undefined) w.totalSpentCents += data.totalSpentCents.increment;
        if (data.totalSpentCents?.decrement !== undefined) w.totalSpentCents -= data.totalSpentCents.decrement;
        if (data.version?.increment !== undefined) w.version += data.version.increment;
        if (data.lastUsedAt) w.lastUsedAt = data.lastUsedAt;
        if (data.status !== undefined) w.status = data.status;
        return Promise.resolve({ id: w.id, balanceCents: w.balanceCents });
      }),
    },
    cashlessTransaction: {
      findUnique: vi.fn(({ where }) => {
        const t = cashlessTransactions.get(where.id);
        return Promise.resolve(t ?? null);
      }),
      create: vi.fn(({ data, select }) => {
        txCounter++;
        const id = `tx-${txCounter}`;
        const t = { id, createdAt: new Date(), ...data };
        cashlessTransactions.set(id, t);
        return Promise.resolve({ id, createdAt: t.createdAt });
      }),
      update: vi.fn(({ where, data }) => {
        const t = cashlessTransactions.get(where.id);
        if (t) Object.assign(t, data);
        return Promise.resolve(t ?? null);
      }),
    },
  };
}

vi.mock('../../../config/database', () => ({
  prisma: {
    cashlessWallet: {
      findUnique: vi.fn(({ where }) => {
        const w = wallets.get(where.id);
        return Promise.resolve(w ?? null);
      }),
      update: vi.fn(({ where, data }) => {
        const w = wallets.get(where.id);
        if (!w) return Promise.resolve(null);
        if (data.balanceCents?.increment !== undefined) w.balanceCents += data.balanceCents.increment;
        if (data.totalSpentCents?.decrement !== undefined) w.totalSpentCents -= data.totalSpentCents.decrement;
        if (data.version?.increment !== undefined) w.version += data.version.increment;
        if (data.lastUsedAt) w.lastUsedAt = data.lastUsedAt;
        return Promise.resolve({ id: w.id, balanceCents: w.balanceCents });
      }),
    },
    cashlessTransaction: {
      findUnique: vi.fn(({ where }) => {
        const t = cashlessTransactions.get(where.id);
        return Promise.resolve(t ?? null);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(cashlessTransactions.values()).filter((t) => t.walletId === where.walletId),
        ),
      ),
      create: vi.fn(({ data }) => {
        txCounter++;
        const id = `tx-${txCounter}`;
        const t = { id, createdAt: new Date(), ...data };
        cashlessTransactions.set(id, t);
        return Promise.resolve({ id, createdAt: t.createdAt });
      }),
      update: vi.fn(({ where, data }) => {
        const t = cashlessTransactions.get(where.id);
        if (t) Object.assign(t, data);
        return Promise.resolve(t ?? null);
      }),
    },
    $transaction: vi.fn(async (cb) => cb(makeTxClient())),
  },
}));

vi.mock('../../../shared/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../../shared/metrics', () => ({
  ledgerEntriesCounter: { inc: vi.fn() },
}));

vi.mock('../../ledger/ledger.service', () => ({
  LedgerService: {
    ensureAccount: vi.fn(() => Promise.resolve('acc-1')),
    post: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../webhooks-outbound/webhook-emit.helper', () => ({
  emitWebhookSafe: vi.fn(() => Promise.resolve()),
  resolveOrgIdFromEvent: vi.fn(() => Promise.resolve('org-1')),
}));

vi.mock('../../../shared/pagination', () => ({
  buildCursorPagination: vi.fn(() => ({ take: 10, skip: 0, orderBy: { id: 'desc' } })),
  formatPaginatedResponse: vi.fn((items, limit) => ({
    data: items,
    pagination: { hasMore: false, nextCursor: null, prevCursor: null },
  })),
}));

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

const service = new TransactionService();

describe('TransactionService.charge', () => {
  beforeEach(() => {
    wallets.set('wallet-1', {
      id: 'wallet-1', balanceCents: 5000, status: 'wallet_active',
      version: 0, totalSpentCents: 0, lastUsedAt: null,
    });
    wallets.set('wallet-inactive', {
      id: 'wallet-inactive', balanceCents: 5000, status: 'wallet_blocked', version: 0,
    });
    cashlessTransactions.clear();
    txCounter = 0;
    vi.clearAllMocks();
  });

  it('debita corretamente e retorna ChargeResult', async () => {
    const result = await service.charge(
      'wallet-1', 1000,
      [{ productId: 'p1', name: 'Cerveja', qty: 2, priceCents: 500 }],
    );
    expect(result.transactionId).toMatch(/^tx-/);
    expect(result.amountCents).toBe(1000);
    expect(result.tipCents).toBe(0);
    expect(result.newBalance).toBe(4000);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('inclui gorjeta no total debitado', async () => {
    const result = await service.charge(
      'wallet-1', 1000,
      [{ productId: 'p1', name: 'Água', qty: 1, priceCents: 1000 }],
      200,
    );
    expect(result.tipCents).toBe(200);
    expect(result.newBalance).toBe(3800); // 5000 - 1000 - 200
    expect(result.amountCents).toBe(1000);
  });

  it('lança NotFoundError para carteira inexistente', async () => {
    await expect(
      service.charge('wallet-nao-existe', 100, []),
    ).rejects.toThrow('Carteira não encontrada');
  });

  it('lança BadRequestError para carteira inativa', async () => {
    await expect(
      service.charge('wallet-inactive', 100, []),
    ).rejects.toThrow('Carteira não está ativa para compras');
  });

  it('lança BadRequestError para saldo insuficiente', async () => {
    await expect(
      service.charge('wallet-1', 9999, []),
    ).rejects.toThrow('Saldo insuficiente para realizar esta compra');
  });
});

describe('TransactionService.reverse', () => {
  beforeEach(() => {
    wallets.set('wallet-1', {
      id: 'wallet-1', balanceCents: 3000, status: 'wallet_active',
      version: 1, totalSpentCents: 2000, lastUsedAt: new Date(),
    });
    cashlessTransactions.clear();
    txCounter = 0;
    // Seed uma transação de compra para reverter
    cashlessTransactions.set('tx-completed-1', {
      id: 'tx-completed-1',
      walletId: 'wallet-1',
      type: 'purchase',
      status: 'tx_completed',
      amountCents: 1000,
      tipCents: 200,
      createdAt: new Date(),
    });
    vi.clearAllMocks();
  });

  it('reverte transação e restaura saldo', async () => {
    const result = await service.reverse('tx-completed-1');
    expect(result.transactionId).toBe('tx-completed-1');
    expect(result.reversedAmount).toBe(1200); // 1000 + 200
    expect(result.newBalance).toBe(4200);     // 3000 + 1200
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('lança NotFoundError para transação inexistente', async () => {
    await expect(service.reverse('nao-existe')).rejects.toThrow('Transação não encontrada');
  });

  it('lança BadRequestError para transação não-compra', async () => {
    cashlessTransactions.set('tx-topup', {
      id: 'tx-topup', walletId: 'wallet-1', type: 'top_up',
      status: 'tx_completed', amountCents: 500, tipCents: 0,
    });
    await expect(service.reverse('tx-topup')).rejects.toThrow(
      'Apenas transações de compra podem ser revertidas',
    );
  });

  it('lança BadRequestError para transação já revertida', async () => {
    cashlessTransactions.set('tx-reversed', {
      id: 'tx-reversed', walletId: 'wallet-1', type: 'purchase',
      status: 'reversed', amountCents: 500, tipCents: 0,
    });
    await expect(service.reverse('tx-reversed')).rejects.toThrow(
      'Apenas transações completadas podem ser revertidas',
    );
  });
});
