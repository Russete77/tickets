import { z } from 'zod';

/**
 * Validadores Zod para o módulo de cortesias
 */

export const requestCourtesySchema = z.object({
  recipientName: z
    .string()
    .min(1, 'Nome do destinatário obrigatório')
    .max(255, 'Nome muito longo'),
  recipientCpf: z
    .string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF em formato inválido')
    .optional(),
  recipientEmail: z
    .string()
    .email('Email inválido')
    .optional(),
  reason: z
    .string()
    .max(500, 'Motivo muito longo')
    .optional(),
  batchId: z
    .string()
    .uuid('ID de lote inválido')
    .optional(),
  maxQuantity: z
    .number()
    .int()
    .min(1, 'Quantidade deve ser maior que 0')
    .max(10, 'Quantidade máxima é 10')
    .default(1),
});

export const listCourtesiesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
  status: z.enum([
    'courtesy_pending',
    'approved',
    'issued',
    'courtesy_used',
    'courtesy_expired',
    'revoked',
  ]).optional(),
  requestedBy: z.string().uuid().optional(),
});

export const courtesyIdParamSchema = z.object({
  id: z.string().uuid('ID de cortesia inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

// Type exports
export type RequestCourtesyInput = z.infer<typeof requestCourtesySchema>;
export type ListCourtesiesInput = z.infer<typeof listCourtesiesSchema>;
export type CourtesyIdParams = z.infer<typeof courtesyIdParamSchema>;
export type EventIdParams = z.infer<typeof eventIdParamSchema>;
