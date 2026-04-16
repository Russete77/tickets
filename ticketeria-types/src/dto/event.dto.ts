import { EventStatus, EventCategory, BatchType } from "../enums";
import { ProducerPublicInfo } from "./producer.dto";

export interface LineupItem {
  name: string;
  role?: string;
  imageUrl?: string;
  time?: string;
}

export interface BatchSummary {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  type: BatchType;
  available: number;
  isVisible: boolean;
}

export interface EventReviews {
  averageRating: number;
  count: number;
}

export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  category: EventCategory;
  status: EventStatus;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string;
  tags: string[];
  ageRating: string;
  isOpenBar: boolean;
  lowestPriceCents: number | null;
  isFavorited?: boolean;
}

export interface EventDetail extends EventSummary {
  description: string;
  venueLat: number | null;
  venueLng: number | null;
  venueCapacity: number;
  doorsOpenAt: string | null;
  gallery: string[];
  dressCode: string | null;
  lineup: LineupItem[];
  rules: string | null;
  maxTicketsPerCpf: number;
  batches: BatchSummary[];
  producer: ProducerPublicInfo;
  reviews: EventReviews;
}

export interface CreateEventRequest {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: EventCategory;
  venueName: string;
  venueAddress: string;
  venueLat?: number;
  venueLng?: number;
  venueCapacity: number;
  startsAt: string;
  endsAt: string;
  doorsOpenAt?: string;
  coverImageUrl: string;
  gallery?: string[];
  tags?: string[];
  ageRating: string;
  isOpenBar: boolean;
  dressCode?: string;
  rules?: string;
  maxTicketsPerCpf?: number;
}

export interface UpdateEventRequest {
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  category?: EventCategory;
  venueName?: string;
  venueAddress?: string;
  venueLat?: number;
  venueLng?: number;
  venueCapacity?: number;
  startsAt?: string;
  endsAt?: string;
  doorsOpenAt?: string;
  coverImageUrl?: string;
  gallery?: string[];
  tags?: string[];
  ageRating?: string;
  isOpenBar?: boolean;
  dressCode?: string;
  rules?: string;
  maxTicketsPerCpf?: number;
}

export interface PublishEventResponse {
  success: true;
  event: EventDetail;
  message: string;
}

export interface CancelEventResponse {
  success: true;
  message: string;
}

export interface EventListResponse {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverImageUrl: string;
  category: EventCategory;
  status: EventStatus;
  startsAt: string;
  venueName: string;
  lowestPriceCents: number | null;
}
