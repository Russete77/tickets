import { z } from 'zod';

/**
 * Validadores Zod para o módulo de pagamentos
 */

export const checkoutItemSchema = z.object({
  batchId: z.string().uuid('ID do lote inválido'),
  quantity: z.number().int().min(1, 'Quantidade mínima é 1').max(50, 'Quantidade máxima é 50'),
  holderName: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome muito longo'),
  holderCpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos')
    .transform((val) => val.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')),
});

export const checkoutSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
  items: z
    .array(checkoutItemSchema)
    .min(1, 'Pelo menos um item é obrigatório')
    .max(50, 'Máximo 50 itens por compra'),
  paymentMethod: z.enum(['pix', 'credit_card', 'boleto'], {
    error: 'Método de pagamento inválido',
  }),
  couponCode: z
    .string()
    .max(50, 'Código de cupom muito longo')
    .optional(),
  affiliateCode: z
    .string()
    .max(50, 'Código de afiliado muito longo')
    .optional(),
  deviceFingerprint: z
    .string()
    .max(255, 'Device fingerprint muito longo')
    .optional(),
});

export const webhookPayloadSchema = z.object({
  id: z.string(),
  event: z.enum([
    'PAYMENT_CREATED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'PAYMENT_REFUNDED',
    'PAYMENT_PARTIALLY_REFUNDED',
    'PAYMENT_CHARGEBACK_REQUESTED',
    'PAYMENT_AWAITING_RISK_ANALYSIS',
    'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
    'PAYMENT_BANK_SLIP_VIEWED',
  ]),
  payment: z.object({}).passthrough(), // Usa passthrough() para aceitar novos campos do Asaas
  account: z.object({
    id: z.string(),
  }).optional(),
});

/**
 * Mapeia método de pagamento do nosso enum para o enum do Asaas
 */
export function mapBillingType(method: 'pix' | 'credit_card' | 'boleto'): 'PIX' | 'CREDIT_CARD' | 'BOLETO' {
  const mapping = {
    pix: 'PIX',
    credit_card: 'CREDIT_CARD',
    boleto: 'BOLETO',
  };
  return mapping[method] as 'PIX' | 'CREDIT_CARD' | 'BOLETO';
}

/**
 * Calcula expiração baseado no método de pagamento
 * PIX: 15 minutos
 * Credit Card: 10 minutos
 * Boleto: 3 dias
 */
export function calculateExpirationDate(method: 'pix' | 'credit_card' | 'boleto'): Date {
  const now = new Date();

  switch (method) {
    case 'pix':
      return new Date(now.getTime() + 15 * 60 * 1000); // 15 minutos
    case 'credit_card':
      return new Date(now.getTime() + 10 * 60 * 1000); // 10 minutos
    case 'boleto':
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 dias
    default:
      return new Date(now.getTime() + 30 * 60 * 1000); // fallback: 30 minutos
  }
}

// Type exports
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type WebhookPayloadInput = z.infer<typeof webhookPayloadSchema>;
