import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors';
import crypto from 'crypto';
import { WalletStatus } from '../../generated/prisma/client';

export interface WalletData {
  id: string;
  walletCode: string;
  balanceCents: number;
  totalTopupCents: number;
  totalSpentCents: number;
  status: WalletStatus;
  walletType: string;
  createdAt: Date;
}

/**
 * Serviço de gerenciamento de carteiras digitais
 */
export class WalletService {
  /**
   * Gera um código único para a carteira
   */
  private generateWalletCode(): string {
    return crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase();
  }

  /**
   * Cria uma nova carteira
   */
  async createWallet(
    userId: string,
    eventId: string,
    walletType: 'digital' | 'wristband' | 'card',
    nfcTagId?: string,
  ): Promise<WalletData> {
    // Validar que o usuário não tem carteira ativa para este evento
    const existingWallet = await prisma.cashlessWallet.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });

    if (existingWallet && existingWallet.status !== 'wallet_refunded') {
      throw new ConflictError('Usuário já possui carteira ativa para este evento');
    }

    // Validar que o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Gerar código único
    let walletCode: string;
    let isUnique = false;
    do {
      walletCode = this.generateWalletCode();
      const existing = await prisma.cashlessWallet.findUnique({
        where: { walletCode },
      });
      isUnique = !existing;
    } while (!isUnique);

    // Criar carteira
    const wallet = await prisma.cashlessWallet.create({
      data: {
        userId,
        eventId,
        walletType,
        walletCode,
        nfcTagId,
        status: 'wallet_active',
        activatedAt: new Date(),
      },
      select: {
        id: true,
        walletCode: true,
        balanceCents: true,
        totalTopupCents: true,
        totalSpentCents: true,
        status: true,
        walletType: true,
        createdAt: true,
      },
    });

    return wallet as WalletData;
  }

  /**
   * Obtém a carteira do usuário para um evento
   */
  async getMyWallet(userId: string, eventId: string): Promise<WalletData> {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
      select: {
        id: true,
        walletCode: true,
        balanceCents: true,
        totalTopupCents: true,
        totalSpentCents: true,
        status: true,
        walletType: true,
        createdAt: true,
      },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada para este evento');
    }

    return wallet as WalletData;
  }

  /**
   * Recarrega a carteira com validação de limites
   */
  async topUp(
    walletId: string,
    amountCents: number,
    config: {
      minTopupCents: number;
      maxTopupCents: number;
      maxBalanceCents: number;
    },
  ): Promise<{ walletId: string; newBalance: number; totalTopup: number }> {
    // Validar limites
    if (amountCents < config.minTopupCents || amountCents > config.maxTopupCents) {
      throw new BadRequestError(
        `Valor de recarga deve estar entre ${config.minTopupCents} e ${config.maxTopupCents} centavos`,
      );
    }

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
      throw new BadRequestError('Carteira não está ativa para recarga');
    }

    const newBalance = wallet.balanceCents + amountCents;
    if (newBalance > config.maxBalanceCents) {
      throw new BadRequestError(
        `Saldo não pode exceder ${config.maxBalanceCents} centavos`,
      );
    }

    // Criar transação atomicamente
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar saldo
      const updated = await tx.cashlessWallet.update({
        where: { id: walletId },
        data: {
          balanceCents: {
            increment: amountCents,
          },
          totalTopupCents: {
            increment: amountCents,
          },
          lastUsedAt: new Date(),
        },
        select: {
          id: true,
          balanceCents: true,
          totalTopupCents: true,
        },
      });

      // Registrar transação de recarga
      await tx.cashlessTransaction.create({
        data: {
          walletId,
          type: 'topup',
          status: 'tx_completed',
          amountCents,
          balanceAfter: updated.balanceCents,
        },
      });

      return updated;
    });

    return {
      walletId: result.id,
      newBalance: result.balanceCents,
      totalTopup: result.totalTopupCents,
    };
  }

  /**
   * Bloqueia uma carteira
   */
  async blockWallet(walletId: string, reason?: string): Promise<WalletData> {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada');
    }

    const updated = await prisma.cashlessWallet.update({
      where: { id: walletId },
      data: {
        status: 'blocked',
        lastUsedAt: new Date(),
      },
      select: {
        id: true,
        walletCode: true,
        balanceCents: true,
        totalTopupCents: true,
        totalSpentCents: true,
        status: true,
        walletType: true,
        createdAt: true,
      },
    });

    // Registrar no Redis para auditoria
    if (reason) {
      await redis.setex(
        `wallet:blocked:${walletId}`,
        86400 * 30, // 30 dias
        JSON.stringify({ walletId, reason, blockedAt: new Date() }),
      );
    }

    return updated as WalletData;
  }

  /**
   * Solicita reembolso de carteira
   */
  async requestRefund(
    walletId: string,
    reason: string,
  ): Promise<{ walletId: string; status: string; refundableBalance: number }> {
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
      throw new BadRequestError('Apenas carteiras ativas podem solicitar reembolso');
    }

    // Atualizar status e criar transação de cashout
    const result = await prisma.$transaction(async (tx) => {
      await tx.cashlessWallet.update({
        where: { id: walletId },
        data: {
          status: 'refund_pending',
          lastUsedAt: new Date(),
        },
      });

      // Registrar transação de cashout
      await tx.cashlessTransaction.create({
        data: {
          walletId,
          type: 'cashout',
          status: 'tx_pending',
          amountCents: wallet.balanceCents,
          balanceAfter: wallet.balanceCents,
          metadata: { reason },
        },
      });

      return wallet.balanceCents;
    });

    return {
      walletId,
      status: 'refund_pending',
      refundableBalance: result,
    };
  }

  /**
   * Obtém informações de saldo
   */
  async getBalance(walletId: string): Promise<{
    walletId: string;
    balanceCents: number;
    totalTopupCents: number;
    totalSpentCents: number;
    status: WalletStatus;
  }> {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: walletId },
      select: {
        id: true,
        balanceCents: true,
        totalTopupCents: true,
        totalSpentCents: true,
        status: true,
      },
    });

    if (!wallet) {
      throw new NotFoundError('Carteira não encontrada');
    }

    return {
      walletId: wallet.id,
      balanceCents: wallet.balanceCents,
      totalTopupCents: wallet.totalTopupCents,
      totalSpentCents: wallet.totalSpentCents,
      status: wallet.status,
    };
  }
}

export const walletService = new WalletService();
