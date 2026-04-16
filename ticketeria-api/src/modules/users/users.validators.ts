import { z } from 'zod';

/**
 * Validadores Zod para o módulo de usuários
 */

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome muito longo')
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone inválido')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .url('URL de avatar inválida')
    .max(500, 'URL muito longa')
    .optional()
    .or(z.literal('')),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/\d/, 'Senha deve conter pelo menos um número')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z
    .string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  }
);

export const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});

export const consentSchema = z.object({
  consentType: z.enum(['marketing', 'analytics', 'data_processing']),
  given: z.boolean(),
});

export const pushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token é obrigatório'),
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
export type PushTokenInput = z.infer<typeof pushTokenSchema>;
