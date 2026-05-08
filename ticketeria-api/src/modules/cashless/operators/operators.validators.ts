import { z } from 'zod';

export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});
export const orgOperatorParamsSchema = z.object({
  organizationId: z.string().uuid(),
  operatorId: z.string().uuid(),
});

const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN deve ter 4 a 6 dígitos');

export const createOperatorSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/).optional(),
    userId: z.string().uuid().optional(),
    pin: pinSchema,
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.name || d.userId, {
    message: 'Forneça name ou userId',
    path: ['name'],
  });

export const updateOperatorSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export const resetPinSchema = z.object({
  newPin: pinSchema,
});
