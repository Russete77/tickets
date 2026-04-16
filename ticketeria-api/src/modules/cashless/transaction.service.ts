import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { CashlessTransactionType } from '../../generated/prisma/client';

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

        // Decrementar saldo
        const updated = await tx.cashlessWallet.update({
          where: { id: walletId },
          data: {
            balanceCents: {
              decrement: totalCents,
            },
            totalSpentCents: {
              increment: amountCents, // Não inclui gorjeta no total gasto
            },
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
            metadata,
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
      // Restaurar saldo
      const updated = await tx.cashlessWallet.update({
        where: { id: transaction.walletId },
        data: {
          balanceCents: {
            increment: reversalAmount,
          },
          totalSpentCents: {
            decrement: transaction.amountCents,
          },
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
