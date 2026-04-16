import { z } from "zod";

export const CreateAffiliateSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  commission: z.coerce.number().min(0).max(100, "Commission must be between 0 and 100"),
});

export type CreateAffiliateInput = z.infer<typeof CreateAffiliateSchema>;

export const GetAffiliateLinkSchema = z.object({
  id: z.string().uuid("Invalid affiliate link ID"),
});

export type GetAffiliateLinkInput = z.infer<typeof GetAffiliateLinkSchema>;

export const ListAffiliateLinksSchema = z.object({
  eventId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListAffiliateLinksInput = z.infer<typeof ListAffiliateLinksSchema>;

export const GetAffiliateStatsSchema = z.object({
  affiliateLinkId: z.string().uuid("Invalid affiliate link ID"),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type GetAffiliateStatsInput = z.infer<typeof GetAffiliateStatsSchema>;

export const PauseAffiliateSchema = z.object({
  id: z.string().uuid("Invalid affiliate link ID"),
});

export type PauseAffiliateInput = z.infer<typeof PauseAffiliateSchema>;

export const ResumeAffiliateSchema = z.object({
  id: z.string().uuid("Invalid affiliate link ID"),
});

export type ResumeAffiliateInput = z.infer<typeof ResumeAffiliateSchema>;

export const DeleteAffiliateSchema = z.object({
  id: z.string().uuid("Invalid affiliate link ID"),
});

export type DeleteAffiliateInput = z.infer<typeof DeleteAffiliateSchema>;

export const GetAffiliatePerformanceSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type GetAffiliatePerformanceInput = z.infer<typeof GetAffiliatePerformanceSchema>;
