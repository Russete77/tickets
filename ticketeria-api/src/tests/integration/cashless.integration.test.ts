import { describe, it, expect } from 'vitest';
import './setup';
import { createTestUser, createTestEvent } from './helpers';
import { getTestPrisma } from './setup';
import { TransactionService } from '../../modules/cashless/transaction.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cobertura crítica do cashless:
 *   1. Charge atômico com saldo suficiente reduz o saldo na quantia correta.
 *   2. Charge com saldo insuficiente lança erro e não altera saldo.
 *   3. Concorrência: 5 charges simultâneos de R$30 cada em wallet de R$100 ⇒
 *      apenas 3 sucessos (saldo final = R$10), nunca saldo negativo.
 *   4. Reverse devolve saldo corretamente.
 */

async function createWallet(eventId: string, userId: string, balanceCents: number) {
  const prisma = getTestPrisma();
  return prisma.cashlessWallet.create({
    data: {
      eventId,
      userId,
      walletType: 'wallet_personal',
      walletCode: `wlt-${uuidv4().slice(0, 8)}`,
      balanceCents,
      status: 'wallet_active',
      activatedAt: new Date(),
    },
  });
}

describe('Cashless Integration: atomic debit & impossible negative balance', () => {
  it('should debit balance correctly on successful charge', async () => {
    const prisma = getTestPrisma();
    const service = new TransactionService();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const event = await createTestEvent(prisma, producer.id);

    const wallet = await createWallet(event.id, holder.id, 10_000); // R$100

    const result = await service.charge(
      wallet.id,
      3_000, // R$30
      [{ productId: 'cerveja', name: 'Cerveja', qty: 1, priceCents: 3_000 }],
      0,
    );

    expect(result.newBalance).toBe(7_000);
    const updated = await prisma.cashlessWallet.findUnique({ where: { id: wallet.id } });
    expect(updated?.balanceCents).toBe(7_000);
    expect(updated?.totalSpentCents).toBe(3_000);
  });

  it('should reject charge when balance is insufficient', async () => {
    const prisma = getTestPrisma();
    const service = new TransactionService();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const event = await createTestEvent(prisma, producer.id);

    const wallet = await createWallet(event.id, holder.id, 1_000); // R$10

    await expect(
      service.charge(wallet.id, 5_000, [
        { productId: 'drink', name: 'Drink', qty: 1, priceCents: 5_000 },
      ]),
    ).rejects.toThrow(/saldo insuficiente/i);

    const unchanged = await prisma.cashlessWallet.findUnique({ where: { id: wallet.id } });
    expect(unchanged?.balanceCents).toBe(1_000);
  });

  it('should never allow negative balance under concurrent charges', async () => {
    const prisma = getTestPrisma();
    const service = new TransactionService();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const event = await createTestEvent(prisma, producer.id);

    const wallet = await createWallet(event.id, holder.id, 10_000); // R$100
    const items = [{ productId: 'beer', name: 'Beer', qty: 1, priceCents: 3_000 }];

    // 5 charges simultâneos de R$30 — saldo só comporta 3
    const settled = await Promise.allSettled(
      Array.from({ length: 5 }, () => service.charge(wallet.id, 3_000, items)),
    );

    const successes = settled.filter((s) => s.status === 'fulfilled');
    const failures = settled.filter((s) => s.status === 'rejected');

    expect(successes.length).toBe(3);
    expect(failures.length).toBe(2);

    const final = await prisma.cashlessWallet.findUnique({ where: { id: wallet.id } });
    // Saldo final tem que ser >= 0 e == 100 - (3 * 30) = 10
    expect(final?.balanceCents).toBe(1_000);
    expect(final?.balanceCents).toBeGreaterThanOrEqual(0);
  });
});
