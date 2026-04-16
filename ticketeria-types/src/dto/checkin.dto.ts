import { CheckinResult, TicketStatus } from "../enums";

export interface CheckinRequest {
  ticketCode: string;
  totp?: string;
  offlineMode?: boolean;
}

export interface CheckinResponse {
  result: CheckinResult;
  ticket: {
    id: string;
    code: string;
    status: TicketStatus;
    name: string;
    email: string;
    cpf: string;
  } | null;
  message: string;
  checkedInAt?: string;
}

export interface CapacityInfo {
  totalCapacity: number;
  checkedIn: number;
  remaining: number;
  percentage: number;
}

export interface EventCheckinStats {
  eventId: string;
  eventTitle: string;
  startsAt: string;
  totalTickets: number;
  checkedInCount: number;
  noShowCount: number;
  cancelledCount: number;
  refundedCount: number;
}

export interface CheckinHistory {
  id: string;
  ticketCode: string;
  ticketId: string;
  ticketName: string;
  eventId: string;
  eventTitle: string;
  result: CheckinResult;
  checkedInAt: string;
  checkedInBy: string;
}

export interface BulkCheckinRequest {
  tickets: Array<{
    code: string;
    totp?: string;
  }>;
}

export interface BulkCheckinResponse {
  successful: number;
  failed: number;
  results: CheckinResponse[];
}

export interface CheckinReportResponse {
  stats: EventCheckinStats;
  capacity: CapacityInfo;
  history: CheckinHistory[];
}

export interface OfflineCheckinSync {
  checkins: Array<{
    ticketCode: string;
    checkedInAt: string;
  }>;
  uploadedAt: string;
  conflicts?: Array<{
    ticketCode: string;
    issue: string;
  }>;
}
