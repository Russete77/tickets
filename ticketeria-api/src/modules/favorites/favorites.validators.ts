import { z } from 'zod';

/**
 * Validadores Zod para o módulo de favoritos
 */

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
