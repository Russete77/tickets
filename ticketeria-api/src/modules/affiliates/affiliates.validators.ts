import { z } from 'zod';

/**
 * Validadores Zod para o módulo de afiliados
 */

export const createLinkSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
  commissionPercent: z
    .number()
    .min(0, 'Comissão deve ser maior ou igual a 0')
    .max(100, 'Comissão deve ser menor ou igual a 100'),
});

export const getAffiliateStatsSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const trackClickSchema = z.object({
  code: z
    .string()
    .min(1, 'Código de afiliado obrigatório')
    .max(50, 'Código de afiliado inválido'),
});

// Type exports
export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type GetAffiliateStatsInput = z.infer<typeof getAffiliateStatsSchema>;
export type TrackClickInput = z.infer<typeof trackClickSchema>;
