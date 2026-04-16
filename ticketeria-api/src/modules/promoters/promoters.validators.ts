import { z } from 'zod';

/**
 * Validadores Zod para o módulo de promoters
 */

export const registerPromoterSchema = z.object({
  displayName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  instagram: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
});

export const listPromotersSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
  search: z.string().max(100).optional(),
});

export const updatePromoterSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  instagram: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
});

export const assignToEventSchema = z.object({
  maxGuests: z.number().int().positive().optional(),
});

export const rankingSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export const promoterIdParamSchema = z.object({
  id: z.string().uuid('ID de promoter inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

// Type exports
export type RegisterPromoterInput = z.infer<typeof registerPromoterSchema>;
export type ListPromotersInput = z.infer<typeof listPromotersSchema>;
export type UpdatePromoterInput = z.infer<typeof updatePromoterSchema>;
export type AssignToEventInput = z.infer<typeof assignToEventSchema>;
export type RankingInput = z.infer<typeof rankingSchema>;
export type PromoterIdParams = z.infer<typeof promoterIdParamSchema>;
export type EventIdParams = z.infer<typeof eventIdParamSchema>;
