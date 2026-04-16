import { EventCategory, EventStatus } from "../enums";

export interface FavoriteItem {
  id: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  coverImageUrl: string;
  category: EventCategory;
  status: EventStatus;
  venueName: string;
  startsAt: string;
  lowestPriceCents: number | null;
  addedAt: string;
}

export interface AddFavoriteRequest {
  eventId: string;
}

export interface AddFavoriteResponse {
  success: true;
  favorite: FavoriteItem;
  message: string;
}

export interface RemoveFavoriteResponse {
  success: true;
  message: string;
}

export interface FavoriteListResponse {
  id: string;
  eventTitle: string;
  eventSlug: string;
  coverImageUrl: string;
  venueName: string;
  startsAt: string;
  lowestPriceCents: number | null;
  addedAt: string;
}

export interface CheckFavoriteResponse {
  isFavorited: boolean;
}

export interface FavoritesStats {
  totalFavorites: number;
  byCategory: Array<{
    category: EventCategory;
    count: number;
  }>;
  topFavorited: Array<{
    eventTitle: string;
    count: number;
  }>;
}
