import { z } from 'zod';

const pointSchema = z.tuple([z.number(), z.number()]);

const zoneSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  polygon: z.array(pointSchema).min(3),
  capacity: z.number().int().min(0).optional(),
  color: z.string().max(20).optional(),
  kind: z.enum(['general', 'vip', 'bar', 'bathroom', 'first_aid', 'stage', 'exit']).optional(),
});

export const upsertVenueMapSchema = z.object({
  svgUrl: z.string().url().max(500).nullable().optional(),
  zones: z.array(zoneSchema).max(100),
});

export const venueMapParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});
