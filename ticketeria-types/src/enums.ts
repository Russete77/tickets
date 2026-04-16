export enum UserRole {
  CONSUMER = "consumer",
  PRODUCER = "producer",
  ADMIN = "admin",
}

export enum EventStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  CANCELLED = "cancelled",
  FINISHED = "finished",
}

export enum EventCategory {
  SHOW = "show",
  FESTIVAL = "festival",
  ESPORTE = "esporte",
  TEATRO = "teatro",
  MUSEU = "museu",
  CURSO = "curso",
  OUTRO = "outro",
}

export enum BatchType {
  REGULAR = "regular",
  VIP = "vip",
  BACKSTAGE = "backstage",
  CAMAROTE = "camarote",
}

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum PaymentMethod {
  PIX = "pix",
  CREDIT_CARD = "credit_card",
  BOLETO = "boleto",
}

export enum TicketStatus {
  ACTIVE = "active",
  USED = "used",
  TRANSFERRED = "transferred",
  CANCELLED = "cancelled",
  REFUNDED = "refunded",
}

export enum TransferStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export enum CheckinResult {
  VALID = "valid",
  INVALID_HASH = "invalid_hash",
  INVALID_TOTP = "invalid_totp",
  ALREADY_USED = "already_used",
  WRONG_EVENT = "wrong_event",
  TICKET_CANCELLED = "ticket_cancelled",
  OFFLINE_VALID = "offline_valid",
  OFFLINE_CONFLICT = "offline_conflict",
}

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

export enum NotificationType {
  EMAIL = "email",
  PUSH = "push",
  IN_APP = "in_app",
}

export enum NotificationChannel {
  EMAIL = "email",
  PUSH = "push",
  IN_APP = "in_app",
}

export enum CompanyType {
  MEI = "MEI",
  ME = "ME",
  EPP = "EPP",
  LTDA = "LTDA",
  SA = "SA",
  INDIVIDUAL = "INDIVIDUAL",
}

export enum AsaasAccountStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  SUSPENDED = "suspended",
}

export enum DocumentsStatus {
  PENDING = "pending",
  SENT = "sent",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum GuestListType {
  FREE = "free",
  VIP = "vip",
  BACKSTAGE = "backstage",
  PRESS = "press",
}

export enum MediaType {
  IMAGE = "image",
  VIDEO = "video",
}
