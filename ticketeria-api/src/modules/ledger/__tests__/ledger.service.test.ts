/**
 * Tests: LedgerService
 * Auditoria CTO 2026-05 — gap 4.5
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LedgerService } from '../ledger.service';

const accounts = new Map<string, { id: string; type: string; balanceCents: bigint }>();
const entries: any[] = [];

vi.mock('../../../config/database', () => {
  return {
    prisma: {
      $transaction: vi.fn(async (fn) => fn({
        $queryRaw: vi.fn((_strings: any) => {
          // Devolve a primeira account encontrada para o último id testado.
          // Mock simplificado.
          return Promise.resolve(
            Array.from(accounts.values()).slice(0, 1).map((a) => ({
              id: a.id,
              balance_cents: a.balanceCents,
              type: a.type,
            })),
          );
        }),
        ledgerAccount: {
          update: vi.fn(({ where, data }) => {
            const acc = accounts.get(where.id);
            if (!acc) throw new Error('Not found');
            acc.balanceCents = data.balanceCents;
            return Promise.resolve(acc);
          }),
        },
        ledgerEntry: {
          create: vi.fn(({ data }) => {
            entries.push(data);
            return Promise.resolve(data);
          }),
        },
      })),
      ledgerAccount: {
        findUnique: vi.fn(({ where }) => Promise.resolve(accounts.get(where.id) ?? null)),
        findFirst: vi.fn(() => Promise.resolve(null)),
        findMany: vi.fn(() => Promise.resolve(Array.from(accounts.values()))),
        create: vi.fn(({ data }) => {
          const id = `acc-${accounts.size + 1}`;
          const a = { id, ...data, balanceCents: data.balanceCents ?? 0n };
          accounts.set(id, a as any);
          return Promise.resolve(a);
        }),
      },
      $queryRaw: vi.fn(() => Promise.resolve([{ total: 0n }])),
    },
  };
});

vi.mock('../../../shared/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe('LedgerService', () => {
  beforeEach(() => {
    accounts.clear();
    entries.length = 0;
  });

  it('rejeita transação com 1 entry só', async () => {
    await expect(
      LedgerService.post({
        organizationId: 'org-1',
        sourceType: 'topup',
        sourceId: 'src-1',
        entries: [{ accountId: 'acc-1', direction: 'credit', amountCents: 100 }],
      }),
    ).rejects.toThrow(/double-entry/i);
  });

  it('rejeita debits != credits', async () => {
    accounts.set('acc-1', { id: 'acc-1', type: 'wallet', balanceCents: 0n });
    accounts.set('acc-2', { id: 'acc-2', type: 'event_revenue', balanceCents: 0n });
    await expect(
      LedgerService.post({
        organizationId: 'org-1',
        sourceType: 'topup',
        sourceId: 'src-1',
        entries: [
          { accountId: 'acc-1', direction: 'debit', amountCents: 100 },
          { accountId: 'acc-2', direction: 'credit', amountCents: 200 },
        ],
      }),
    ).rejects.toThrow(/desbalanceado/i);
  });

  it('rejeita amount zero ou negativo', async () => {
    await expect(
      LedgerService.post({
        organizationId: 'org-1',
        sourceType: 'x',
        sourceId: 'y',
        entries: [
          { accountId: 'acc-1', direction: 'credit', amountCents: 0 },
          { accountId: 'acc-2', direction: 'debit', amountCents: 0 },
        ],
      }),
    ).rejects.toThrow(/positivo/i);
  });
});
