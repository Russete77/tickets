import { z } from "zod";
import { EventCategory, EventStatus, BatchType } from "../enums";

export const EventCategoryEnum = z.nativeEnum(EventCategory);
export const EventStatusEnum = z.nativeEnum(EventStatus);
export const BatchTypeEnum = z.nativeEnum(BatchType);

export const LineupItemSchema = z.object({
  name: z.string().min(1, "Lineup name is required"),
  role: z.string().optional(),
  imageUrl: z.string().url("Invalid image URL").optional(),
  time: z.string().optional(),
});

export const CreateEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  shortDescription: z.string().min(10, "Short description must be at least 10 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  category: EventCategoryEnum,
  venueName: z.string().min(1, "Venue name is required"),
  venueAddress: z.string().min(5, "Venue address is required"),
  venueLat: z.number().min(-90).max(90).optional(),
  venueLng: z.number().min(-180).max(180).optional(),
  venueCapacity: z.coerce.number().int().positive("Venue capacity must be positive"),
  startsAt: z.string().datetime("Invalid start date"),
  endsAt: z.string().datetime("Invalid end date"),
  doorsOpenAt: z.string().datetime("Invalid doors open time").optional(),
  coverImageUrl: z.string().url("Invalid image URL"),
  gallery: z.array(z.string().url("Invalid image URL")).optional(),
  tags: z.array(z.string()).optional(),
  ageRating: z.string().min(1, "Age rating is required"),
  isOpenBar: z.boolean().default(false),
  dressCode: z.string().optional(),
  rules: z.string().optional(),
  maxTicketsPerCpf: z.coerce.number().int().positive().default(4),
}).refine(
  (data) => new Date(data.startsAt) < new Date(data.endsAt),
  {
    message: "Event start time must be before end time",
    path: ["endsAt"],
  }
).refine(
  (data) => !data.doorsOpenAt || new Date(data.doorsOpenAt) <= new Date(data.startsAt),
  {
    message: "Doors open time must be before or equal to event start time",
    path: ["doorsOpenAt"],
  }
);

export type CreateEventInput = z.infer<typeof CreateEventSchema>;

export const UpdateEventSchema = CreateEventSchema.partial();

export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;

export const GetEventSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
});

export type GetEventInput = z.infer<typeof GetEventSchema>;

export const ListEventsSchema = z.object({
  category: EventCategoryEnum.optional(),
  status: EventStatusEnum.optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  cursor: z.string().optional(),
});

export type ListEventsInput = z.infer<typeof ListEventsSchema>;

export const PublishEventSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
});

export type PublishEventInput = z.infer<typeof PublishEventSchema>;

export const CancelEventSchema = z.object({
  id: z.string().uuid("Invalid event ID"),
  reason: z.string().optional(),
});

export type CancelEventInput = z.infer<typeof CancelEventSchema>;
