import { NotificationType, NotificationChannel } from "../enums";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  inAppNotifications: boolean;
  orderUpdates: boolean;
  eventUpdates: boolean;
  promotions: boolean;
  newFeatures: boolean;
}

export interface UpdateNotificationPreferencesRequest {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  inAppNotifications?: boolean;
  orderUpdates?: boolean;
  eventUpdates?: boolean;
  promotions?: boolean;
  newFeatures?: boolean;
}

export interface MarkAsReadRequest {
  notificationIds: string[];
}

export interface MarkAsReadResponse {
  success: true;
  message: string;
}

export interface ClearNotificationsRequest {
  type?: NotificationType;
}

export interface ClearNotificationsResponse {
  success: true;
  clearedCount: number;
  message: string;
}

export interface NotificationDigest {
  period: "daily" | "weekly";
  unreadCount: number;
  notifications: NotificationItem[];
  sentAt: string;
}

export interface SubscribePushRequest {
  endpoint: string;
  auth: string;
  p256dh: string;
}

export interface SubscribePushResponse {
  success: true;
  message: string;
}
