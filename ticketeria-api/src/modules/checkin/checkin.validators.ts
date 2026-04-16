import { z } from 'zod';

/**
 * Validadores Zod para o módulo de check-in
 */

export const validateCheckinSchema = z.object({
  qrData: z
    .string()
    .min(10, 'QR data inválido')
    .max(1000, 'QR data muito longo'),
  operatorId: z.string().uuid('ID do operador inválido'),
  deviceId: z
    .string()
    .max(100, 'ID do dispositivo muito longo'),
  eventId: z.string().uuid('ID do evento inválido'),
});

export const capacityParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const syncOfflineCheckinsSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
  checkins: z.array(
    z.object({
      qrData: z.string(),
      timestamp: z.number(),
      result: z.enum(['valid', 'invalid_hash', 'invalid_totp', 'already_used', 'offline_valid']),
    }),
  ).min(1, 'Pelo menos um check-in é obrigatório'),
});

// Type exports
export type ValidateCheckinInput = z.infer<typeof validateCheckinSchema>;
export type CapacityParamInput = z.infer<typeof capacityParamSchema>;
export type SyncOfflineCheckinsInput = z.infer<typeof syncOfflineCheckinsSchema>;
