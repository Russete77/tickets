import { z } from 'zod';

export const issuePairCodeSchema = z.object({
  label: z.string().trim().min(1).max(120),
});

export const posIdParamSchema = z.object({
  posId: z.string().uuid(),
});

export const deviceParamsSchema = z.object({
  posId: z.string().uuid(),
  deviceId: z.string().uuid(),
});

export const redeemSchema = z.object({
  pairingCode: z.string().trim().regex(/^[A-Z0-9]{8}$/),
});

export const heartbeatSchema = z.object({
  appVersion: z.string().trim().max(20).optional(),
  online: z.boolean().optional(),
  pendingQueue: z.number().int().min(0).optional(),
  battery: z.number().int().min(0).max(100).optional(),
});

export const operatorLoginSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/),
});

export type IssuePairCodeInput = z.infer<typeof issuePairCodeSchema>;
export type RedeemInput = z.infer<typeof redeemSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type OperatorLoginInput = z.infer<typeof operatorLoginSchema>;
