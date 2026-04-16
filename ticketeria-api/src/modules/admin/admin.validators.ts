import { z } from 'zod';
import { EventStatus } from '../../generated/prisma/client';

/**
 * Validadores Zod para o módulo admin
 */

export const moderateEventSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
  action: z
    .enum(['approve', 'reject', 'suspend'])
    .describe('Ação de moderação'),
  reason: z
    .string()
    .optional()
    .describe('Motivo da ação (opcional)'),
});

export const manageUserSchema = z.object({
  userId: z
    .string()
    .uuid('ID de usuário inválido'),
  action: z
    .enum(['block', 'unblock'])
    .describe('Ação de gerenciamento'),
  reason: z
    .string()
    .optional()
    .describe('Motivo da ação (opcional)'),
});

export const listEventsSchema = z.object({
  status: z
    .enum(['draft', 'published', 'cancelled', 'finished'])
    .optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const listUsersSchema = z.object({
  role: z
    .enum(['consumer', 'producer', 'admin'])
    .optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const eventIdParamSchema = z.object({
  id: z.string().uuid('ID de evento inválido'),
});

export const userIdParamSchema = z.object({
  id: z.string().uuid('ID de usuário inválido'),
});

// Type exports
export type ModerateEventInput = z.infer<typeof moderateEventSchema>;
export type ManageUserInput = z.infer<typeof manageUserSchema>;
export type ListEventsInput = z.infer<typeof listEventsSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
