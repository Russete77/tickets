import { z } from 'zod';

export const createAreaSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(100),
  capacity: z.number().int().positive('Capacidade deve ser positiva'),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const updateAreaSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const areaIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const updateCountSchema = z.object({
  delta: z.number().int('Delta deve ser um número inteiro'),
});

// Type exports
export type CreateAreaInput = z.infer<typeof createAreaSchema>;
export type UpdateAreaInput = z.infer<typeof updateAreaSchema>;
export type AreaIdParamInput = z.infer<typeof areaIdParamSchema>;
export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type UpdateCountInput = z.infer<typeof updateCountSchema>;
