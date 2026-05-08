import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});

const POS_TYPES = ['bar', 'mobile', 'totem', 'vip_lounge', 'food_truck', 'backstage_pos'] as const;

export const createPosSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(POS_TYPES),
  location: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
});

export const updatePosSchema = createPosSchema.partial();
