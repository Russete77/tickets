import { z } from 'zod';
import { WalletType, CashlessTransactionType } from '../../generated/prisma/client';

/**
 * Validadores Zod para o módulo cashless
 */

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

export const walletIdParamSchema = z.object({
  id: z.string().uuid('ID de carteira inválido'),
});

export const transactionIdParamSchema = z.object({
  id: z.string().uuid('ID de transação inválido'),
});

export const createCashlessConfigSchema = z.object({
  minTopupCents: z.number().int().min(100).describe('Valor mínimo de recarga em centavos'),
  maxTopupCents: z.number().int().min(1000).describe('Valor máximo de recarga em centavos'),
  maxBalanceCents: z.number().int().min(10000).describe('Saldo máximo permitido em centavos'),
  paymentMethods: z.array(z.enum(['pix', 'credit_card'])).describe('Métodos de pagamento aceitos'),
  enableWristbands: z.boolean().default(true).describe('Habilitar pulseiras NFC'),
  enableCards: z.boolean().default(true).describe('Habilitar cartões digitais'),
  enableMobile: z.boolean().default(false).describe('Habilitar carteiras móveis'),
  refundMaxDays: z.number().int().min(0).describe('Dias máximos para reembolso'),
});

export const updateCashlessConfigSchema = createCashlessConfigSchema.partial();

export const createWalletSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
  walletType: z.enum(['digital', 'wristband', 'card']).describe('Tipo de carteira'),
  nfcTagId: z.string().optional().describe('ID do tag NFC (para wristbands/cards)'),
});

export const topupWalletSchema = z.object({
  amountCents: z.number().int().min(100).describe('Valor de recarga em centavos'),
  paymentMethod: z.enum(['pix', 'credit_card']).describe('Método de pagamento'),
});

export const blockWalletSchema = z.object({
  reason: z.string().optional().describe('Motivo do bloqueio'),
});

export const requestRefundSchema = z.object({
  reason: z.string().describe('Motivo do reembolso'),
});

export const chargeWalletSchema = z.object({
  walletId: z.string().uuid('ID de carteira inválido'),
  amountCents: z.number().int().min(1).describe('Valor a cobrar em centavos'),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      name: z.string(),
      qty: z.number().int().min(1),
      priceCents: z.number().int().min(1),
    })
  ).describe('Itens da compra'),
  tipCents: z.number().int().min(0).default(0).describe('Gorjeta em centavos'),
  metadata: z.record(z.unknown()).optional().describe('Metadados adicionais'),
});

export const reverseTransactionSchema = z.object({
  reason: z.string().optional().describe('Motivo da reversão'),
});

export const walletTransactionsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
  type: z.enum(['topup', 'purchase', 'cashless_refund', 'wallet_transfer', 'cashout', 'courtesy_credit']).optional(),
});

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional().describe('Data inicial (ISO 8601)'),
  endDate: z.string().datetime().optional().describe('Data final (ISO 8601)'),
});

export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const hourlyStatsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Type exports
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type WalletIdParam = z.infer<typeof walletIdParamSchema>;
export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;
export type CreateCashlessConfigInput = z.infer<typeof createCashlessConfigSchema>;
export type UpdateCashlessConfigInput = z.infer<typeof updateCashlessConfigSchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type TopupWalletInput = z.infer<typeof topupWalletSchema>;
export type BlockWalletInput = z.infer<typeof blockWalletSchema>;
export type RequestRefundInput = z.infer<typeof requestRefundSchema>;
export type ChargeWalletInput = z.infer<typeof chargeWalletSchema>;
export type ReverseTransactionInput = z.infer<typeof reverseTransactionSchema>;
export type WalletTransactionsQuery = z.infer<typeof walletTransactionsQuerySchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>;
export type HourlyStatsQuery = z.infer<typeof hourlyStatsQuerySchema>;
