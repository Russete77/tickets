import { z } from 'zod';

/**
 * Validadores Zod para o módulo de seguro
 */

/**
 * Schema para criação de seguro de evento
 */
export const createInsuranceSchema = z.object({
  provider: z
    .string()
    .min(3, 'Nome do provedor deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do provedor muito longo'),
  coverageType: z
    .string()
    .min(3, 'Tipo de cobertura obrigatório')
    .max(100, 'Tipo de cobertura muito longo'),
  coverageAmount: z
    .number()
    .int('Valor de cobertura deve ser um inteiro')
    .min(0, 'Valor de cobertura não pode ser negativo'),
  premiumCents: z
    .number()
    .int('Prêmio deve estar em centavos')
    .min(0, 'Prêmio não pode ser negativo'),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((data) => data.endsAt > data.startsAt, {
  message: 'Data de término deve ser após data de início',
  path: ['endsAt'],
});

/**
 * Schema para atualização de seguro
 */
export const updateInsuranceSchema = createInsuranceSchema.partial();

/**
 * Schema para parâmetro de ID de evento
 */
export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

/**
 * Schema para parâmetro de ID de seguro
 */
export const insuranceIdParamSchema = z.object({
  id: z.string().uuid('ID de seguro inválido'),
});

// Type exports
export type CreateInsuranceInput = z.infer<typeof createInsuranceSchema>;
export type UpdateInsuranceInput = z.infer<typeof updateInsuranceSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type InsuranceIdParam = z.infer<typeof insuranceIdParamSchema>;
