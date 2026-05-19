import { z } from 'zod';

/**
 * DELETE /lgpd/me — anonimização exige reautenticação (senha) e,
 * se o usuário tem 2FA ativo, também o código TOTP.
 */
export const anonymizeAccountSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
  totpCode: z
    .string()
    .regex(/^\d{6}$/, 'Código 2FA deve ter 6 dígitos')
    .optional(),
  confirm: z.literal(true, {
    error: 'Confirmação explícita é obrigatória',
  }),
});

export type AnonymizeAccountInput = z.infer<typeof anonymizeAccountSchema>;
