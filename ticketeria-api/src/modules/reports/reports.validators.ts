import { z } from 'zod';

/**
 * Validadores Zod para o módulo de relatórios
 */

export const salesReportSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const checkinReportSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
});

export const exportReportSchema = z.object({
  type: z
    .enum(['sales', 'checkin', 'financial'])
    .describe('Tipo de relatório a exportar'),
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
});

// Type exports
export type SalesReportInput = z.infer<typeof salesReportSchema>;
export type CheckinReportInput = z.infer<typeof checkinReportSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type ExportReportInput = z.infer<typeof exportReportSchema>;
