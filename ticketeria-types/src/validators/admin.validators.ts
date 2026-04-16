import { z } from "zod";
import { UserRole } from "../enums";

export const UserRoleEnum = z.nativeEnum(UserRole);

export const SuspendUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export type SuspendUserInput = z.infer<typeof SuspendUserSchema>;

export const UnsuspendUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type UnsuspendUserInput = z.infer<typeof UnsuspendUserSchema>;

export const PromoteToProducerSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type PromoteToProducerInput = z.infer<typeof PromoteToProducerSchema>;

export const DemoteProducerSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type DemoteProducerInput = z.infer<typeof DemoteProducerSchema>;

export const ApproveEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

export type ApproveEventInput = z.infer<typeof ApproveEventSchema>;

export const RejectEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export type RejectEventInput = z.infer<typeof RejectEventSchema>;

export const ListUsersSchema = z.object({
  role: UserRoleEnum.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListUsersInput = z.infer<typeof ListUsersSchema>;

export const ListEventsForModerationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListEventsForModerationInput = z.infer<typeof ListEventsForModerationSchema>;

export const GetDashboardStatsSchema = z.object({
  period: z.enum(["day", "week", "month", "year"]).optional(),
});

export type GetDashboardStatsInput = z.infer<typeof GetDashboardStatsSchema>;

export const ResolveDisputeSchema = z.object({
  disputeId: z.string().uuid("Invalid dispute ID"),
  decision: z.enum(["approved", "rejected"]),
  notes: z.string().min(5, "Notes must be at least 5 characters"),
});

export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;

export const GetAuditLogsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  adminId: z.string().uuid().optional(),
  action: z.string().optional(),
});

export type GetAuditLogsInput = z.infer<typeof GetAuditLogsSchema>;
