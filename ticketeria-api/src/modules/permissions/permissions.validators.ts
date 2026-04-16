import { z } from 'zod';

/**
 * Validadores Zod para o módulo de permissões
 */

const VALID_RESOURCES = [
  'events',
  'tickets',
  'cashless',
  'pos',
  'guest-lists',
  'reports',
  'financial',
  'staff',
  'admin',
] as const;

const VALID_ACTIONS = ['read', 'create', 'update', 'delete'] as const;

export const grantPermissionSchema = z.object({
  userId: z
    .string()
    .uuid('ID de usuário inválido'),
  eventId: z
    .string()
    .uuid('ID de evento inválido')
    .optional()
    .describe('ID do evento (opcional - deixar vazio para permissão global)'),
  resource: z
    .enum(VALID_RESOURCES)
    .describe('Recurso ao qual a permissão se aplica'),
  actions: z
    .array(z.enum(VALID_ACTIONS))
    .min(1, 'Deve incluir pelo menos uma ação')
    .describe('Ações permitidas (read, create, update, delete)'),
});

export const userIdParamSchema = z.object({
  userId: z
    .string()
    .uuid('ID de usuário inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido'),
});

export const idParamSchema = z.object({
  id: z
    .string()
    .uuid('ID inválido'),
});

export const checkPermissionSchema = z.object({
  eventId: z
    .string()
    .uuid('ID de evento inválido')
    .optional()
    .describe('ID do evento (opcional)'),
  resource: z
    .enum(VALID_RESOURCES)
    .describe('Recurso a verificar'),
  action: z
    .enum(VALID_ACTIONS)
    .describe('Ação a verificar'),
});

// Type exports
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type EventIdParam = z.infer<typeof eventIdParamSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type CheckPermissionInput = z.infer<typeof checkPermissionSchema>;
