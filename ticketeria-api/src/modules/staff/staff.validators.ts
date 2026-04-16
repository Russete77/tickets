import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').max(255),
  email: z.string().email('Email inválido'),
  cpf: z.string().length(14, 'CPF inválido').optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.enum(['security', 'medical', 'logistics', 'support', 'other']),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().optional(),
  cpf: z.string().length(14).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  role: z.enum(['security', 'medical', 'logistics', 'support', 'other']).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
});

export const staffIdParamSchema = z.object({
  id: z.string().uuid('ID inválido'),
});

export const eventIdParamSchema = z.object({
  eventId: z.string().uuid('ID do evento inválido'),
});

export const staffCheckinSchema = z.object({
  notes: z.string().max(500).optional().or(z.literal('')),
});

// Type exports
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type StaffIdParamInput = z.infer<typeof staffIdParamSchema>;
export type EventIdParamInput = z.infer<typeof eventIdParamSchema>;
export type StaffCheckinInput = z.infer<typeof staffCheckinSchema>;
