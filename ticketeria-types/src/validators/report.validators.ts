import { z } from "zod";

export const GetSalesReportSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  eventId: z.string().uuid().optional(),
  producerId: z.string().uuid().optional(),
});

export type GetSalesReportInput = z.infer<typeof GetSalesReportSchema>;

export const GetCheckinReportSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  eventId: z.string().uuid().optional(),
});

export type GetCheckinReportInput = z.infer<typeof GetCheckinReportSchema>;

export const GetDetailedSalesReportSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  eventId: z.string().uuid().optional(),
  groupBy: z.enum(["day", "category", "paymentMethod"]).optional(),
});

export type GetDetailedSalesReportInput = z.infer<typeof GetDetailedSalesReportSchema>;

export const ExportReportSchema = z.object({
  type: z.enum(["sales", "checkin"]),
  format: z.enum(["csv", "pdf"]),
  startDate: z.string().date(),
  endDate: z.string().date(),
  eventId: z.string().uuid().optional(),
});

export type ExportReportInput = z.infer<typeof ExportReportSchema>;

export const GetRevenueAnalyticsSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  eventId: z.string().uuid().optional(),
  groupBy: z.enum(["day", "week", "month"]).optional(),
});

export type GetRevenueAnalyticsInput = z.infer<typeof GetRevenueAnalyticsSchema>;

export const GetEventPerformanceSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

export type GetEventPerformanceInput = z.infer<typeof GetEventPerformanceSchema>;

export const CompareEventsSchema = z.object({
  eventIds: z.array(z.string().uuid("Invalid event ID")).min(2, "At least 2 events required"),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type CompareEventsInput = z.infer<typeof CompareEventsSchema>;
