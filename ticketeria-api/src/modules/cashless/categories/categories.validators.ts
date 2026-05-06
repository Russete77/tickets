import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const orgCategoryParamsSchema = z.object({
  organizationId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ).min(1),
});

export const deleteCategoryQuerySchema = z.object({
  force: z.enum(['true', 'false']).optional(),
});
