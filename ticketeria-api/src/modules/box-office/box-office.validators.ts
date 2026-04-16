import { z } from 'zod';

/**
 * Validadores Zod para o módulo de caixa (box-office)
 */

/**
 * Schema para abertura de sessão de caixa
 */
export const openSessionSchema = z.object({
  operatorName: z
    .string()
    .min(3, 'Nome do operador deve ter pelo menos 3 caracteres')
    .max(255, 'Nome do operador muito longo'),
});

/**
 * Schema para fechamento de sessão de caixa
 */
export const closeSessionSchema = z.object({
  cashCount: z
    .number()
    .int('Valor em dinheiro deve ser um inteiro (em centavos)')
    .min(0, 'Valor em dinheiro não pode ser negativo')
    .optional(),
  notes: z
    .string()
    .max(2000, 'Notas muito longas')
    .optional(),
});

/**
 * Schema para venda de ingresso na porta
 */
export const sellTicketSchema = z.object({
  batchId: z.string().uuid('ID de lote inválido'),
  quantity: z
    .number()
    .int('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser maior que 0'),
  paymentMethod: z.enum(['cash', 'card', 'pix'], {
    errorMap: () => ({ message: 'Método de pagamento inválido (cash, card, pix)' }),
  }),
  customerName: z
    .string()
    .min(3, 'Nome do cliente deve ter pelo menos 3 caracteres')
    .max(255, 'Nome do cliente muito longo'),
  customerCpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato: 000.000.000-00')
    .optional(),
});

/**
 * Schema para parâmetro de ID de evento
 */
export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

/**
 * Schema para parâmetro de ID de sessão de caixa
 */
export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('ID de sessão inválido'),
});

/**
 * Schema para parâmetro de ID de ticket
 */
export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid('ID de ticket inválido'),
});

// Type exports
export type OpenSessionInput = z.infer<typeof openSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
export type SellTicketInput = z.infer<typeof sellTicketSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
export type TicketIdParam = z.infer<typeof ticketIdParamSchema>;
