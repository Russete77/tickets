import { z } from 'zod';

export const orgTypeSchema = z.enum(['producer', 'venue', 'agency', 'network']);

export const orgRoleSchema = z.enum([
  'owner',
  'admin',
  'finance',
  'operator',
  'promoter',
  'viewer',
]);

const orgIdParamSchema = z.object({ organizationId: z.string().uuid() });
const orgUserParamSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const createOrganizationSchema = {
  body: z.object({
    name: z.string().min(2).max(255),
    slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
    type: orgTypeSchema.optional(),
    cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/).optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultLocale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/).optional(),
  }),
};

export const inviteMemberSchema = {
  params: orgIdParamSchema,
  body: z.object({
    email: z.email(),
    role: orgRoleSchema,
  }),
};

export const updateMemberRoleSchema = {
  params: orgUserParamSchema,
  body: z.object({ role: orgRoleSchema }),
};

export const memberParamsSchema = { params: orgUserParamSchema };

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema.body>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema.body>;
