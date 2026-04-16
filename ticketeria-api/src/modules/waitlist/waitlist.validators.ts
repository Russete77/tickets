import { z } from 'zod';

/**
 * Validadores Zod para o módulo de waitlist
 */

export const joinWaitlistSchema = z.object({
  quantity: z
    .number()
    .int()
    .min(1, 'Quantidade deve ser maior que 0')
    .max(10, 'Quantidade máxima é 10')
    .default(1),
  batchId: z
    .string()
    .uuid('ID de lote inválido')
    .optional(),
});

export const listWaitlistSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
  notified: z.coerce.boolean().optional(),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

// Type exports
export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
export type ListWaitlistInput = z.infer<typeof listWaitlistSchema>;
export type EventIdParams = z.infer<typeof eventIdParamSchema>;
