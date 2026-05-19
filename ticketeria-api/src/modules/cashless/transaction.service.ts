import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { CashlessTransactionType } from '../../generated/prisma/client';
import { LedgerService } from '../ledger/ledger.service';
import { logger } from '../../shared/logger';
import { emitWebhookSafe, resolveOrgIdFromEvent } from '../webhooks-outbound/webhook-emit.helper';
import { ledgerEntriesCounter } from '../../shared/metrics';

export interface TransactionData {
  id: string;
  type: CashlessTransactionType;
  status: string;
  amountCents: number;
  tipCents: number;
  balanceAfter: number;
  items: Array<{
    productId: string;
    name: string;
    qty: number;
    priceCents: number;
  }> | null;
  createdAt: Date;
}

export interface ChargeResult {
  transactionId: string;
  amountCents: number;
  tipCents: number;
  newBalance: number;
  timestamp: Date;
}

/**
 * Serviço de gerenciamento de transações cashless
 */
export class TransactionService {
  /**
   * Efetua uma cobrança na carteira
   */
  async charge(
    walletId: string,
    amountCents: number,
    items: Array<{
      productId: string;
      name: string;
      qty: number;
      priceCents: number;
    }>,
    tipCents: number = 0,
    posId?: string,
    operatorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<ChargeResult> {
    // Obter carteira
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        balanceCents: true,
        status: true,
      },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada');
    }

    if (wallet.status !== 'wallet_active') {
      throw new BadRequestError('Carteira não está ativa para compras');
    }

    const totalCents = amountCents + tipCents;

    if (wallet.balanceCents < totalCents) {
      throw new BadRequestError('Saldo insuficiente para realizar esta compra');
    }

    // Executar transação atomicamente com isolamento
    const result = await prisma.$transaction(
      async (tx) => {
        // Verificar saldo novamente (lock pessimista)
        const currentWallet = await tx.cashlessWallet.findUnique({
          where: { id: walletId },
          select: { balanceCents: true },
        });

        if (!currentWallet || currentWallet.balanceCents < totalCents) {
          throw new BadRequestError('Saldo insuficiente - transação concorrente detectada');
        }

        // Decrementar saldo (version: optimistic-lock defense-in-depth — Serializable já protege)
        const updated = await tx.cashlessWallet.update({
          where: { id: walletId },
          data: {
            balanceCents: {
              decrement: totalCents,
            },
            totalSpentCents: {
              increment: amountCents, // Não inclui gorjeta no total gasto
            },
            version: { increment: 1 },
            lastUsedAt: new Date(),
          },
          select: {
            id: true,
            balanceCents: true,
          },
        });

        // Criar transação
        const transaction = await tx.cashlessTransaction.create({
          data: {
            walletId,
            posId,
            operatorId,
            type: 'purchase',
            status: 'tx_completed',
            amountCents,
            tipCents,
            balanceAfter: updated.balanceCents,
            items,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          },
          select: {
            id: true,
            createdAt: true,
          },
        });

        return {
          transactionId: transaction.id,
          amountCents,
          tipCents,
          newBalance: updated.balanceCents,
          timestamp: transaction.createdAt,
        };
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    // Auditoria CTO 2026-05 — gap 4.5/4.10
    void postCashlessPurchaseToLedger({
      walletId, transactionId: result.transactionId, amountCents, tipCents, posId,
    });

    return result;
  }

  /**
   * Reverte uma transação de compra
   */
  async reverse(
    transactionId: string,
    reason?: string,
  ): Promise<{
    transactionId: string;
    reversedAmount: number;
    newBalance: number;
    timestamp: Date;
  }> {
    // Obter transação
    const transaction = await prisma.cashlessTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        walletId: true,
        type: true,
        status: true,
        amountCents: true,
        tipCents: true,
      },
    });

    if (!transaction) {
      throw new NotFoundError('Transação não encontrada');
    }

    // Validar que a transação é reversível
    if (transaction.type !== 'purchase') {
      throw new BadRequestError('Apenas transações de compra podem ser revertidas');
    }

    if (transaction.status !== 'tx_completed') {
      throw new BadRequestError('Apenas transações completadas podem ser revertidas');
    }

    const reversalAmount = transaction.amountCents + transaction.tipCents;

    // Executar reversão atomicamente
    const result = await prisma.$transaction(async (tx) => {
      // Restaurar saldo (version: optimistic-lock defense-in-depth)
      const updated = await tx.cashlessWallet.update({
        where: { id: transaction.walletId },
        data: {
          balanceCents: {
            increment: reversalAmount,
          },
          totalSpentCents: {
            decrement: transaction.amountCents,
          },
          version: { increment: 1 },
          lastUsedAt: new Date(),
        },
        select: {
          id: true,
          balanceCents: true,
        },
      });

      // Atualizar transação original como revertida
      await tx.cashlessTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'reversed',
          metadata: { reversalReason: reason },
        },
      });

      // Registrar transação de reembolso
      const refundTx = await tx.cashlessTransaction.create({
        data: {
          walletId: transaction.walletId,
          type: 'cashless_refund',
          status: 'tx_completed',
          amountCents: transaction.amountCents,
          tipCents: transaction.tipCents,
          balanceAfter: updated.balanceCents,
          metadata: { originalTransactionId: transactionId, reason },
        },
        select: {
          createdAt: true,
        },
      });

      return {
        transactionId,
        reversedAmount: reversalAmount,
        newBalance: updated.balanceCents,
        timestamp: refundTx.createdAt,
      };
    });

    void postCashlessRefundToLedger({
      walletId: transaction.walletId,
      originalTransactionId: transactionId,
      amountCents: transaction.amountCents,
      tipCents: transaction.tipCents,
      reason,
    });

    return result;
  }

  /**
   * Obtém histórico de transações de uma carteira com paginação
   */
  async getTransactions(
    walletId: string,
    pagination: { cursor?: string; limit: number; direction: 'forward' | 'backward' },
    type?: CashlessTransactionType,
  ): Promise<PaginatedResponse<TransactionData>> {
    // Validar que a carteira existe
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: walletId },
      select: { id: true },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada');
    }

    const paginationParams = buildCursorPagination({
      cursor: pagination.cursor,
      limit: pagination.limit,
      direction: pagination.direction,
    });

    const transactions = await prisma.cashlessTransaction.findMany({
      where: {
        walletId,
        ...(type ? { type } : {}),
      },
      select: {
        id: true,
        type: true,
        status: true,
        amountCents: true,
        tipCents: true,
        balanceAfter: true,
        items: true,
        createdAt: true,
      },
      ...paginationParams,
    });

    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      status: tx.status,
      amountCents: tx.amountCents,
      tipCents: tx.tipCents,
      balanceAfter: tx.balanceAfter,
      items: tx.items as TransactionData['items'],
      createdAt: tx.createdAt,
    }));

    return formatPaginatedResponse(formattedTransactions, pagination.limit);
  }
}

export const transactionService = new TransactionService();

// ============================================================
// Helpers — postar no ledger + emitir webhooks (Auditoria CTO 2026-05)
// ============================================================

async function postCashlessPurchaseToLedger(args: {
  walletId: string;
  transactionId: string;
  amountCents: number;
  tipCents: number;
  posId?: string;
}): Promise<void> {
  try {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: args.walletId },
      select: { eventId: true },
    });
    if (!wallet) return;
    const organizationId = await resolveOrgIdFromEvent(wallet.eventId);
    if (!organizationId) return;

    const walletAcc = await LedgerService.ensureAccount({
      organizationId, eventId: wallet.eventId, walletId: args.walletId, type: 'wallet',
    });
    const posAcc = await LedgerService.ensureAccount({
      organizationId, eventId: wallet.eventId, type: 'pos_sales',
    });

    const entries: Array<{ accountId: string; direction: 'debit' | 'credit'; amountCents: number; description: string }> = [
      { accountId: walletAcc, direction: 'debit', amountCents: args.amountCents, description: 'Cashless purchase' },
      { accountId: posAcc, direction: 'credit', amountCents: args.amountCents, description: 'POS sale' },
    ];

    if (args.tipCents > 0) {
      const tipAcc = await LedgerService.ensureAccount({
        organizationId, eventId: wallet.eventId, type: 'tip_pool',
      });
      entries.push(
        { accountId: walletAcc, direction: 'debit', amountCents: args.tipCents, description: 'Tip' },
        { accountId: tipAcc, direction: 'credit', amountCents: args.tipCents, description: 'Tip credited' },
      );
    }

    await LedgerService.post({
      organizationId, eventId: wallet.eventId,
      sourceType: 'cashless_transaction', sourceId: args.transactionId,
      entries,
    });
    ledgerEntriesCounter.inc({ source_type: 'cashless_transaction' }, entries.length);

    await emitWebhookSafe(
      'cashless_purchase',
      { transactionId: args.transactionId, walletId: args.walletId, eventId: wallet.eventId, amountCents: args.amountCents, tipCents: args.tipCents, posId: args.posId },
      wallet.eventId,
      `cashless_purchase:${args.transactionId}`,
    );
  } catch (err) {
    logger.error({ err, transactionId: args.transactionId }, 'Ledger purchase post failed');
  }
}

async function postCashlessRefundToLedger(args: {
  walletId: string;
  originalTransactionId: string;
  amountCents: number;
  tipCents: number;
  reason?: string;
}): Promise<void> {
  try {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: args.walletId },
      select: { eventId: true },
    });
    if (!wallet) return;
    const organizationId = await resolveOrgIdFromEvent(wallet.eventId);
    if (!organizationId) return;

    const walletAcc = await LedgerService.ensureAccount({
      organizationId, eventId: wallet.eventId, walletId: args.walletId, type: 'wallet',
    });
    const posAcc = await LedgerService.ensureAccount({
      organizationId, eventId: wallet.eventId, type: 'pos_sales',
    });

    const entries: Array<{ accountId: string; direction: 'debit' | 'credit'; amountCents: number; description: string }> = [
      { accountId: posAcc, direction: 'debit', amountCents: args.amountCents, description: 'POS sale reverted' },
      { accountId: walletAcc, direction: 'credit', amountCents: args.amountCents, description: 'Wallet refunded' },
    ];

    if (args.tipCents > 0) {
      const tipAcc = await LedgerService.ensureAccount({
        organizationId, eventId: wallet.eventId, type: 'tip_pool',
      });
      entries.push(
        { accountId: tipAcc, direction: 'debit', amountCents: args.tipCents, description: 'Tip reverted' },
        { accountId: walletAcc, direction: 'credit', amountCents: args.tipCents, description: 'Tip refunded' },
      );
    }

    await LedgerService.post({
      organizationId, eventId: wallet.eventId,
      sourceType: 'cashless_refund', sourceId: args.originalTransactionId,
      entries,
    });
    ledgerEntriesCounter.inc({ source_type: 'cashless_refund' }, entries.length);

    await emitWebhookSafe(
      'cashless_refund',
      { originalTransactionId: args.originalTransactionId, walletId: args.walletId, eventId: wallet.eventId, amountCents: args.amountCents, tipCents: args.tipCents, reason: args.reason },
      wallet.eventId,
      `cashless_refund:${args.originalTransactionId}`,
    );
  } catch (err) {
    logger.error({ err, originalTransactionId: args.originalTransactionId }, 'Refund ledger post failed');
  }
}
