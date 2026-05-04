/**
 * Adapter NFC para identificação de wallets físicas (pulseira/cartão).
 *
 * Suporta:
 *   - Mifare Classic 1K/4K (UID)
 *   - Mifare DESFire EV2/EV3 (UID + AES)
 *   - NTAG213/215/216 (UID + URL para reativação online)
 *
 * O fluxo cashless usa apenas o UID (`nfcTagId`), mantendo o saldo
 * autoritativo no servidor. Modo offline é tratado pelo próprio app POS
 * (cache local + sync) — ver pos-app-spec.md.
 *
 * Auditoria CTO 2026-05 — gap 4.4
 */
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { BadRequestError, NotFoundError } from '../../shared/errors';

export type NfcTagType = 'mifare_classic' | 'mifare_desfire' | 'ntag2xx';

export interface NfcAssociationInput {
  tagUid: string;
  tagType: NfcTagType;
  walletId: string;
  operatorId: string;
  posId?: string;
}

export class NfcAdapter {
  /**
   * Vincula UID NFC a um wallet existente.
   * Idempotente — se já está associado ao mesmo wallet, sucesso.
   */
  static async associate(input: NfcAssociationInput) {
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { id: input.walletId },
    });
    if (!wallet) throw new NotFoundError('Wallet não encontrada');
    if (wallet.status !== 'wallet_active') {
      throw new BadRequestError(`Wallet em status ${wallet.status}`);
    }

    const normalized = input.tagUid.toUpperCase().replace(/[^0-9A-F]/g, '');
    if (normalized.length < 8 || normalized.length > 32) {
      throw new BadRequestError('UID NFC inválido');
    }

    // Garante que o UID não está em uso por outra wallet do mesmo evento.
    const collision = await prisma.cashlessWallet.findFirst({
      where: {
        eventId: wallet.eventId,
        nfcTagId: normalized,
        NOT: { id: input.walletId },
      },
    });
    if (collision) {
      throw new BadRequestError(
        `UID já vinculado a outra wallet do evento (${collision.id})`,
      );
    }

    const updated = await prisma.cashlessWallet.update({
      where: { id: input.walletId },
      data: {
        nfcTagId: normalized,
        walletType: input.tagType === 'ntag2xx' ? 'card' : 'wristband',
        activatedAt: wallet.activatedAt ?? new Date(),
      },
    });

    logger.info(
      { walletId: input.walletId, tagType: input.tagType, operatorId: input.operatorId },
      'NFC vinculado a wallet',
    );
    return updated;
  }

  /**
   * Resolve wallet a partir do UID NFC. Usado pelo POS no scan.
   * Cache em Redis pode ser adicionado depois — por enquanto direto no DB.
   */
  static async resolveByUid(eventId: string, tagUid: string) {
    const normalized = tagUid.toUpperCase().replace(/[^0-9A-F]/g, '');
    return prisma.cashlessWallet.findFirst({
      where: { eventId, nfcTagId: normalized, status: 'wallet_active' },
    });
  }

  /**
   * Gera um UID virtual quando hardware não está disponível
   * (modo digital/wallet pure ou testes).
   */
  static generateVirtualUid(): string {
    return crypto.randomBytes(7).toString('hex').toUpperCase();
  }
}
