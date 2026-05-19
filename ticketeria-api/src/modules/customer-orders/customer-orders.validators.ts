import { z } from 'zod';

export const createCustomerOrderSchema = z.object({
  eventId: z.string().uuid(),
  posId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
});

export const updateCustomerOrderStatusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(['preparing', 'ready', 'delivered']),
});

export const customerOrderIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const myCustomerOrdersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']).optional(),
  eventId: z.string().uuid().optional(),
});
