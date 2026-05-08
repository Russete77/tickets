import { z } from 'zod';

const PRODUCT_CATEGORIES = [
  'beer', 'drink', 'cocktail', 'soft_drink', 'water',
  'food', 'snack', 'merch', 'service', 'other',
] as const;

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
export const cloneFromParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
  sourcePosId: z.string().uuid(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(500).optional(),
  category: z.enum(PRODUCT_CATEGORIES).default('other'),
  categoryId: z.string().uuid().optional(),
  priceCents: z.number().int().min(0),
  stockQty: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  posId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isAvailable: z.enum(['true', 'false']).optional(),
});

export const cloneCatalogQuerySchema = z.object({
  overwrite: z.enum(['true', 'false']).optional(),
});
