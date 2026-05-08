import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});
export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});
export const orgProductParamsSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
});

export const createStockMovementSchema = z.object({
  type: z.enum(['stock_entry', 'adjustment', 'loss']),
  quantity: z.number().int().refine((n) => n !== 0, 'quantity != 0'),
  notes: z.string().max(500).optional(),
});

export const movementsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
