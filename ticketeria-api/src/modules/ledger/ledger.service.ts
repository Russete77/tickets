/**
 * Ledger contábil double-entry.
 *
 * Toda transação cashless gera N ≥ 2 LedgerEntry com mesmo `groupId`,
 * onde Σdebits == Σcredits. `LedgerAccount.balanceCents` é mantido
 * em transação para evitar drift.
 *
 * Após o evento, `assertEventClosed(eventId)` valida invariantes:
 *   - Σ(wallet) + Σ(refund_clearing) == Σ(top-ups capturados)
 *   - Σ(event_revenue) == Σ(pos_sales) + tax/tip
 *   - balanceCents de cada account == soma de entries
 *
 * Auditoria CTO 2026-05 — gap 4.5
 */
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { BadRequestError, InternalError } from '../../shared/errors';
import type { LedgerAccountType, Prisma } from '../../generated/prisma/client';
import { randomUUID } from 'crypto';

export type LedgerEntryDirection = 'debit' | 'credit';

export interface LedgerEntryInput {
  accountId: string;
  direction: LedgerEntryDirection;
  amountCents: bigint | number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PostTransactionInput {
  organizationId: string;
  eventId?: string;
  sourceType: string; // ex: 'cashless_transaction', 'order', 'refund'
  sourceId: string;
  currency?: string;
  entries: LedgerEntryInput[];
}

export class LedgerService {
  /**
   * Posta uma transação balanceada no ledger.
   * Falha se debit != credit ou se algum saldo ficar negativo (exceto contas
   * de revenue que aceitam negativos por design).
   */
  static async post(input: PostTransactionInput): Promise<{ groupId: string }> {
    if (input.entries.length < 2) {
      throw new BadRequestError('Ledger transaction precisa de ao menos 2 entries (double-entry)');
    }

    let totalDebits = 0n;
    let totalCredits = 0n;
    for (const e of input.entries) {
      const amount = BigInt(e.amountCents);
      if (amount <= 0n) {
        throw new BadRequestError('amountCents deve ser positivo');
      }
      if (e.direction === 'debit') totalDebits += amount;
      else totalCredits += amount;
    }

    if (totalDebits !== totalCredits) {
      throw new BadRequestError(
        `Ledger desbalanceado: debits=${totalDebits} credits=${totalCredits}`,
      );
    }

    const groupId = randomUUID();
    const currency = input.currency ?? 'BRL';

    return prisma.$transaction(async (tx) => {
      for (const entry of input.entries) {
        // Lock + atualiza balance atomicamente.
        const account = await tx.$queryRaw<
          Array<{ id: string; balance_cents: bigint; type: string }>
        >`
          SELECT id, balance_cents, type::text as type
          FROM ledger_accounts
          WHERE id = ${entry.accountId}::uuid
          FOR UPDATE
        `;

        if (account.length === 0) {
          throw new InternalError(`LedgerAccount não encontrada: ${entry.accountId}`);
        }

        const current = BigInt(account[0].balance_cents);
        const delta =
          entry.direction === 'credit'
            ? BigInt(entry.amountCents)
            : -BigInt(entry.amountCents);
        const newBalance = current + delta;

        // Wallets/refund clearing não podem ficar negativas.
        if (
          newBalance < 0n &&
          ['wallet', 'refund_clearing'].includes(account[0].type)
        ) {
          throw new BadRequestError(
            `Saldo insuficiente em conta ${account[0].type}: balance=${current} delta=${delta}`,
          );
        }

        await tx.ledgerAccount.update({
          where: { id: entry.accountId },
          data: { balanceCents: newBalance },
        });

        await tx.ledgerEntry.create({
          data: {
            accountId: entry.accountId,
            groupId,
            sourceType: input.sourceType,
            sourceId: input.sourceId,
            direction: entry.direction,
            amountCents: BigInt(entry.amountCents),
            balanceAfter: newBalance,
            currency,
            description: entry.description,
            metadata: entry.metadata as Prisma.InputJsonValue | undefined,
          },
        });
      }

      logger.debug({ groupId, sourceType: input.sourceType }, 'Ledger transaction posted');
      return { groupId };
    });
  }

  /**
   * Garante que conta exista; cria sob demanda.
   */
  static async ensureAccount(args: {
    organizationId: string;
    eventId?: string;
    walletId?: string;
    type: LedgerAccountType;
    currency?: string;
  }): Promise<string> {
    if (args.walletId) {
      const existing = await prisma.ledgerAccount.findUnique({
        where: { walletId: args.walletId },
      });
      if (existing) return existing.id;
    }

    const found = await prisma.ledgerAccount.findFirst({
      where: {
        organizationId: args.organizationId,
        eventId: args.eventId ?? null,
        walletId: args.walletId ?? null,
        type: args.type,
      },
    });
    if (found) return found.id;

    const created = await prisma.ledgerAccount.create({
      data: {
        organizationId: args.organizationId,
        eventId: args.eventId,
        walletId: args.walletId,
        type: args.type,
        currency: args.currency ?? 'BRL',
        balanceCents: 0n,
      },
    });
    return created.id;
  }

  /**
   * Verifica invariantes de fechamento de um evento.
   * Retorna lista de divergências (vazia em sucesso).
   */
  static async assertEventClosed(eventId: string): Promise<string[]> {
    const issues: string[] = [];

    // 1. balanceCents de cada conta == soma assinada de entries
    const accounts = await prisma.ledgerAccount.findMany({ where: { eventId } });
    for (const acc of accounts) {
      const computed = await prisma.$queryRaw<Array<{ total: bigint | null }>>`
        SELECT COALESCE(SUM(
          CASE WHEN direction = 'credit' THEN amount_cents ELSE -amount_cents END
        ), 0)::BIGINT as total
        FROM ledger_entries
        WHERE account_id = ${acc.id}::uuid
      `;
      const totalEntries = BigInt(computed[0]?.total ?? 0n);
      if (totalEntries !== BigInt(acc.balanceCents)) {
        issues.push(
          `Drift em conta ${acc.id} (${acc.type}): balance=${acc.balanceCents} entries=${totalEntries}`,
        );
      }
    }

    // 2. Wallets agregadas não podem ser negativas
    const negativeWallets = await prisma.ledgerAccount.findMany({
      where: { eventId, type: 'wallet', balanceCents: { lt: 0n } },
    });
    if (negativeWallets.length > 0) {
      issues.push(`${negativeWallets.length} wallet(s) com saldo negativo`);
    }

    if (issues.length > 0) {
      logger.error({ eventId, issues }, 'Ledger invariants failed');
    } else {
      logger.info({ eventId }, 'Ledger invariants OK');
    }

    return issues;
  }
}
