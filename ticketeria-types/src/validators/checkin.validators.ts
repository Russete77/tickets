import { z } from "zod";
import { CheckinResult } from "../enums";

export const CheckinResultEnum = z.nativeEnum(CheckinResult);

export const CheckinRequestSchema = z.object({
  ticketCode: z.string().min(1, "Ticket code is required"),
  totp: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits").optional(),
  offlineMode: z.boolean().default(false).optional(),
});

export type CheckinRequestInput = z.infer<typeof CheckinRequestSchema>;

export const BulkCheckinSchema = z.object({
  tickets: z.array(
    z.object({
      code: z.string().min(1, "Ticket code is required"),
      totp: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits").optional(),
    })
  ).min(1, "At least one ticket is required"),
});

export type BulkCheckinInput = z.infer<typeof BulkCheckinSchema>;

export const GetCheckinStatsSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

export type GetCheckinStatsInput = z.infer<typeof GetCheckinStatsSchema>;

export const GetCheckinHistorySchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type GetCheckinHistoryInput = z.infer<typeof GetCheckinHistorySchema>;

export const SyncOfflineCheckinsSchema = z.object({
  checkins: z.array(
    z.object({
      ticketCode: z.string().min(1, "Ticket code is required"),
      checkedInAt: z.string().datetime("Invalid datetime"),
    })
  ).min(1, "At least one checkin is required"),
});

export type SyncOfflineCheckinsInput = z.infer<typeof SyncOfflineCheckinsSchema>;

export const ValidateCheckinSchema = z.object({
  ticketCode: z.string().min(1, "Ticket code is required"),
  eventId: z.string().uuid("Invalid event ID"),
});

export type ValidateCheckinInput = z.infer<typeof ValidateCheckinSchema>;

export const ExportCheckinReportSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  format: z.enum(["csv", "pdf"]),
});

export type ExportCheckinReportInput = z.infer<typeof ExportCheckinReportSchema>;
