import { z } from 'zod';

export const createItemSchema = z.object({
  type: z.enum(['physical', 'digital', 'voucher']),
  name: z.string().min(2, 'Nome obrigatório').max(255),
  description: z.string().max(1000).optional().or(z.literal('')),
  price: z.number().nonnegative('Preço deve ser não-negativo'),
  quantity: z.number().int().positive('Quantidade deve ser positiva').optional().or(z.literal(null)),
  image: z.string().url('URL de imagem inválida').optional().or(z.literal('')),
});

export const updateItemSchema = z.object({
  type: z.enum(['physical', 'digital', 'voucher']).optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
  price: z.number().nonnegative().optional(),
  quantity: z.number().int().positive().optional().or(z.literal(null)),
  image: z.string().url().optional().or(z.literal('')),
});

export const itemIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const purchaseItemSchema = z.object({
  quantity: z.number().int().positive('Quantidade deve ser positiva').default(1),
});

// Type exports
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemIdParamInput = z.infer<typeof itemIdParamSchema>;
export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;
