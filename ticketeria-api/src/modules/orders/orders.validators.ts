import { z } from 'zod';
import { cursorPaginationSchema } from '../../shared/pagination';

/**
 * Validadores Zod para o módulo de pedidos
 */

export const getOrdersSchema = cursorPaginationSchema.extend({
  status: z.enum(['pending', 'paid', 'cancelled', 'refunded']).optional(),
  eventId: z.string().uuid().optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('ID do pedido inválido'),
});

// Type exports
export type GetOrdersInput = z.infer<typeof getOrdersSchema>;
export type OrderIdParamInput = z.infer<typeof orderIdParamSchema>;
