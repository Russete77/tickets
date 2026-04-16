import { UserRole, EventStatus, OrderStatus } from "../enums";

export interface DashboardStats {
  users: {
    total: number;
    activeThisMonth: number;
    newThisMonth: number;
    byRole: {
      consumers: number;
      producers: number;
      admins: number;
    };
  };
  events: {
    total: number;
    published: number;
    draft: number;
    cancelled: number;
    finished: number;
  };
  orders: {
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    refunded: number;
  };
  revenue: {
    totalCents: number;
    thisMonthCents: number;
    thisYearCents: number;
    averageOrderValueCents: number;
  };
  platform: {
    activeEventsCount: number;
    ticketsSoldThisMonth: number;
    conversionRate: number;
    avgOrdersPerDay: number;
  };
}

export interface UserManagementItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  lastActivity: string | null;
}

export interface SuspendUserRequest {
  reason: string;
}

export interface SuspendUserResponse {
  success: true;
  user: UserManagementItem;
  message: string;
}

export interface UnsuspendUserResponse {
  success: true;
  message: string;
}

export interface EventModeration {
  id: string;
  title: string;
  producer: {
    id: string;
    name: string;
    email: string;
  };
  status: EventStatus;
  createdAt: string;
  flaggedAt: string | null;
  flagReason: string | null;
}

export interface ApproveEventResponse {
  success: true;
  message: string;
}

export interface RejectEventRequest {
  reason: string;
}

export interface RejectEventResponse {
  success: true;
  message: string;
}

export interface DisputeCase {
  id: string;
  orderId: string;
  claimantEmail: string;
  respondentEmail: string;
  amount: number;
  reason: string;
  status: "open" | "investigating" | "resolved" | "closed";
  createdAt: string;
  resolvedAt: string | null;
  resolution: string | null;
}

export interface ResoluteDisputeRequest {
  decision: "approved" | "rejected";
  notes: string;
}

export interface ResolveDisputeResponse {
  success: true;
  dispute: DisputeCase;
  message: string;
}

export interface SystemHealthCheck {
  database: "ok" | "error";
  fileStorage: "ok" | "error";
  paymentGateway: "ok" | "error";
  emailService: "ok" | "error";
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  changes: Record<string, unknown>;
  timestamp: string;
}
