import { z } from 'zod';

/**
 * Validadores Zod para o módulo de ingressos
 */

export const validateQRSchema = z.object({
  qrData: z
    .string()
    .min(1, 'QR data obrigatório'),
  operatorId: z
    .string()
    .uuid('ID do operador inválido'),
  deviceId: z
    .string()
    .min(1, 'ID do dispositivo obrigatório'),
  eventId: z
    .string()
    .uuid('ID do evento inválido'),
});

export const transferTicketSchema = z.object({
  toEmail: z
    .string()
    .email('Email do destinatário inválido'),
  toCpf: z
    .string()
    .regex(/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos'),
  toName: z
    .string()
    .min(3, 'Nome do destinatário deve ter pelo menos 3 caracteres')
    .max(255, 'Nome do destinatário muito longo'),
});

export const confirmTransferSchema = z.object({
  transferId: z
    .string()
    .uuid('ID da transferência inválido'),
  otpCode: z
    .string()
    .regex(/^\d{6}$/, 'Código OTP deve conter exatamente 6 dígitos'),
});

export const ticketIdParamSchema = z.object({
  id: z.string().uuid('ID do ingresso inválido'),
});

export const transferIdParamSchema = z.object({
  id: z.string().uuid('ID da transferência inválido'),
});

// Type exports
export type ValidateQRInput = z.infer<typeof validateQRSchema>;
export type TransferTicketInput = z.infer<typeof transferTicketSchema>;
export type ConfirmTransferInput = z.infer<typeof confirmTransferSchema>;
export type TicketIdParam = z.infer<typeof ticketIdParamSchema>;
export type TransferIdParam = z.infer<typeof transferIdParamSchema>;
