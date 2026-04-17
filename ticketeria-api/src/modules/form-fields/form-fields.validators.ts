import { z } from 'zod';

/**
 * Validadores Zod para o módulo de campos de formulário
 */

/**
 * Schema para criação de campo de formulário
 */
export const createFieldSchema = z.object({
  label: z
    .string()
    .min(1, 'Label obrigatório')
    .max(255, 'Label muito longo'),
  type: z.enum(['text', 'select', 'checkbox', 'radio', 'date', 'file'], {
    error: 'Tipo de campo inválido (text, select, checkbox, radio, date, file)',
  }),
  options: z
    .array(z.string().max(255))
    .optional(),
  required: z
    .boolean()
    .optional()
    .default(false),
  sortOrder: z
    .number()
    .int('Ordem de classificação deve ser um inteiro')
    .min(0, 'Ordem não pode ser negativa')
    .optional()
    .default(0),
});

/**
 * Schema para atualização de campo de formulário
 */
export const updateFieldSchema = createFieldSchema.partial();

/**
 * Schema para submissão de respostas de formulário
 */
export const submitResponseSchema = z.object({
  responses: z.array(
    z.object({
      fieldId: z.string().uuid('ID de campo inválido'),
      value: z
        .string()
        .max(10000, 'Valor de resposta muito longo'),
    })
  ).min(1, 'Pelo menos uma resposta é obrigatória'),
});

/**
 * Schema para parâmetro de ID de evento
 */
export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID de evento inválido'),
});

/**
 * Schema para parâmetro de ID de campo
 */
export const fieldIdParamSchema = z.object({
  id: z.string().uuid('ID de campo inválido'),
});

/**
 * Schema para parâmetro de ID de ticket
 */
export const ticketIdParamSchema = z.object({
  ticketId: z.string().uuid('ID de ticket inválido'),
});

// Type exports
export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type FieldIdParam = z.infer<typeof fieldIdParamSchema>;
export type TicketIdParam = z.infer<typeof ticketIdParamSchema>;
