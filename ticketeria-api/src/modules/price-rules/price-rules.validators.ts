import { z } from 'zod';

/**
 * Validadores Zod para o módulo de regras de preço
 */

export const createRuleSchema = z.object({
  priceType: z
    .string()
    .min(1, 'Tipo de preço obrigatório')
    .max(50, 'Tipo de preço inválido'),
  priceCents: z
    .number()
    .int('Preço deve ser um inteiro')
    .min(0, 'Preço não pode ser negativo'),
  quantity: z
    .number()
    .int('Quantidade deve ser um inteiro')
    .positive('Quantidade deve ser maior que 0')
    .optional(),
  requiresDoc: z
    .boolean()
    .default(false)
    .describe('Se requer documentação para compra'),
});

export const updateRuleSchema = createRuleSchema.partial();

export const batchIdParamSchema = z.object({
  batchId: z
    .string()
    .uuid('ID de lote inválido'),
});

export const idParamSchema = z.object({
  id: z
    .string()
    .uuid('ID inválido'),
});

// Type exports
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type BatchIdParam = z.infer<typeof batchIdParamSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
