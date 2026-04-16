import { z } from 'zod';

/**
 * Validadores Zod para o módulo de certificados
 */

export const createCertificateSchema = z.object({
  ticketId: z.string().uuid('ID do ingresso inválido'),
  holderName: z
    .string()
    .min(1, 'Nome do participante obrigatório')
    .max(255, 'Nome do participante muito longo'),
  hours: z.number().int().positive('Horas deve ser um número positivo').optional(),
});

export const listCertificatesSchema = z.object({
  cursor: z.string().uuid('Cursor inválido').optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'Limite deve estar entre 1 e 100')
    .optional(),
  direction: z.enum(['forward', 'backward']).optional(),
});

export const verifyCertificateSchema = z.object({
  code: z
    .string()
    .min(1, 'Código do certificado obrigatório')
    .max(20, 'Código do certificado inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const certificateIdParamSchema = z.object({
  id: z.string().uuid('ID do certificado inválido'),
});

export const codeParamSchema = z.object({
  code: z
    .string()
    .min(1, 'Código do certificado obrigatório')
    .max(20, 'Código do certificado inválido'),
});

// Type exports
export type CreateCertificateInput = z.infer<typeof createCertificateSchema>;
export type ListCertificatesInput = z.infer<typeof listCertificatesSchema>;
export type VerifyCertificateInput = z.infer<typeof verifyCertificateSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type CertificateIdParam = z.infer<typeof certificateIdParamSchema>;
export type CodeParam = z.infer<typeof codeParamSchema>;
