export interface LiveStats {
  eventId: string;
  viewersCount: number;
  checkedInCount: number;
  revenuePerMinute: number;
  topSellingBatch: {
    name: string;
    count: number;
  } | null;
}

export interface SocialProofEntry {
  id: string;
  eventId: string;
  type: "ticket_sold" | "user_checkedin" | "favorite_added";
  userName: string;
  message: string;
  timestamp: string;
  isAnonymous: boolean;
}

export interface StreamMetrics {
  eventId: string;
  totalViewers: number;
  peakViewers: number;
  averageSessionDuration: number;
  engagementRate: number;
  conversionRate: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  message: string;
  timestamp: string;
  isPinned: boolean;
}

export interface LiveNotification {
  id: string;
  type: "user_joined" | "ticket_sold" | "batch_soldout" | "chat_message";
  eventId: string;
  data: {
    [key: string]: unknown;
  };
  timestamp: string;
}

export interface StreamState {
  isLive: boolean;
  startedAt: string | null;
  endedAt: string | null;
  viewers: number;
  messages: ChatMessage[];
  notifications: LiveNotification[];
}
