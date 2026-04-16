import { z } from 'zod';

/**
 * Validadores Zod para o módulo de guest lists
 */

export const createOrUpdateConfigSchema = z.object({
  maxGuestsTotal: z.number().int().positive('Máximo de convidados deve ser maior que 0'),
  maxGuestsPerPromoter: z.number().int().positive().optional(),
  maxPlusOnes: z.number().int().min(0).default(1),
  requiresCpf: z.boolean().default(true),
  requiresPhone: z.boolean().default(false),
  autoApprove: z.boolean().default(true),
  closesAt: z.string().datetime().optional(),
  freeUntilHour: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  discountUntilHour: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  welcomeMessage: z.string().max(1000).optional(),
});

export const addEntrySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  cpf: z.string().regex(/^\d{11}$/).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  plusOnes: z.number().int().min(0).default(0),
  listType: z.enum(['free', 'vip', 'backstage', 'press']),
  promoterId: z.string().uuid().optional(),
});

export const listEntriesSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
  status: z.enum(['pending', 'confirmed', 'checked_in', 'rejected', 'no_show']).optional(),
  listType: z.enum(['free', 'vip', 'backstage', 'press']).optional(),
  promoterId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
});

export const updateEntrySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'checked_in', 'rejected', 'no_show']).optional(),
  plusOnes: z.number().int().min(0).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const importCSVSchema = z.object({
  csv: z.string().min(10, 'CSV inválido'),
  listType: z.enum(['free', 'vip', 'backstage', 'press']),
});

export const searchEntriesSchema = z.object({
  query: z.string().min(1).max(100),
});

export const checkinGuestSchema = z.object({
  guestId: z.string().uuid(),
  operatorId: z.string().uuid(),
  plusOnesCount: z.number().int().min(0).default(0),
});

export const publicRegisterSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(255),
  cpf: z.string().regex(/^\d{11}$/).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  plusOnes: z.number().int().min(0).default(0),
});

// Type exports
export type CreateOrUpdateConfigInput = z.infer<typeof createOrUpdateConfigSchema>;
export type AddEntryInput = z.infer<typeof addEntrySchema>;
export type ListEntriesInput = z.infer<typeof listEntriesSchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type ImportCSVInput = z.infer<typeof importCSVSchema>;
export type SearchEntriesInput = z.infer<typeof searchEntriesSchema>;
export type CheckinGuestInput = z.infer<typeof checkinGuestSchema>;
export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>;
