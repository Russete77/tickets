import { z } from 'zod';

/**
 * Validadores Zod para o módulo de credenciais
 */

export const createCredentialSchema = z.object({
  ticketId: z.string().uuid('ID do ingresso inválido').optional(),
  name: z
    .string()
    .min(1, 'Nome obrigatório')
    .max(255, 'Nome muito longo'),
  company: z
    .string()
    .max(255, 'Nome da empresa muito longo')
    .optional(),
  jobTitle: z
    .string()
    .max(100, 'Título do cargo muito longo')
    .optional(),
  category: z
    .string()
    .max(100, 'Categoria muito longa')
    .optional(),
  customFields: z.record(z.string(), z.any()).optional(),
});

export const listCredentialsSchema = z.object({
  cursor: z.string().uuid('Cursor inválido').optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Limite deve estar entre 1 e 100')
    .optional(),
  direction: z.enum(['forward', 'backward']).optional(),
  category: z.string().max(100, 'Categoria inválida').optional(),
});

export const bulkCreateSchema = z.array(
  z.object({
    ticketId: z.string().uuid('ID do ingresso inválido').optional(),
    name: z
      .string()
      .min(1, 'Nome obrigatório')
      .max(255, 'Nome muito longo'),
    company: z
      .string()
      .max(255, 'Nome da empresa muito longo')
      .optional(),
    jobTitle: z
      .string()
      .max(100, 'Título do cargo muito longo')
      .optional(),
    category: z
      .string()
      .max(100, 'Categoria muito longa')
      .optional(),
    customFields: z.record(z.string(), z.any()).optional(),
  }),
);

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const credentialIdParamSchema = z.object({
  id: z.string().uuid('ID da credencial inválido'),
});

// Type exports
export type CreateCredentialInput = z.infer<typeof createCredentialSchema>;
export type ListCredentialsInput = z.infer<typeof listCredentialsSchema>;
export type BulkCreateInput = z.infer<typeof bulkCreateSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type CredentialIdParam = z.infer<typeof credentialIdParamSchema>;
