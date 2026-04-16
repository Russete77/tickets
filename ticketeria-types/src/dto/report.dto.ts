import { OrderStatus, PaymentMethod, EventStatus } from "../enums";

export interface SalesReportEntry {
  date: string;
  orderId: string;
  eventTitle: string;
  quantity: number;
  grossAmountCents: number;
  feeCents: number;
  netAmountCents: number;
  paymentMethod: PaymentMethod | null;
  status: OrderStatus;
}

export interface SalesReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalOrders: number;
    totalTickets: number;
    grossRevenue: number;
    totalFees: number;
    netRevenue: number;
  };
  entries: SalesReportEntry[];
}

export interface CheckinReportEntry {
  date: string;
  eventTitle: string;
  eventStatus: EventStatus;
  totalTickets: number;
  checkedIn: number;
  noShow: number;
  cancelled: number;
  refunded: number;
  capacity: number;
  utilizationRate: number;
}

export interface CheckinReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEvents: number;
    totalTickets: number;
    totalCheckedIn: number;
    totalNoShow: number;
    averageUtilization: number;
  };
  entries: CheckinReportEntry[];
}

export interface RevenueByCategory {
  category: string;
  count: number;
  grossRevenue: number;
  netRevenue: number;
  percentage: number;
}

export interface RevenueByPaymentMethod {
  method: PaymentMethod;
  count: number;
  revenue: number;
  percentage: number;
}

export interface DetailedSalesReport extends SalesReport {
  byCategory: RevenueByCategory[];
  byPaymentMethod: RevenueByPaymentMethod[];
  topEvents: Array<{
    eventTitle: string;
    ticketsSold: number;
    revenue: number;
  }>;
}

export interface ExportReportRequest {
  type: "sales" | "checkin";
  format: "csv" | "pdf";
  startDate: string;
  endDate: string;
  eventId?: string;
}

export interface ExportReportResponse {
  success: true;
  downloadUrl: string;
  expiresAt: string;
}
