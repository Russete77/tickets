import { OrderStatus, PaymentMethod, TicketStatus, BatchType } from "../enums";

export interface OrderTicketItem {
  id: string;
  code: string;
  status: TicketStatus;
  batchType: BatchType;
  name: string;
  email: string;
  cpf: string;
}

export interface OrderSummary {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  status: OrderStatus;
  totalCents: number;
  paymentMethod: PaymentMethod | null;
  ticketCount: number;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventEndorsement: string;
  status: OrderStatus;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  feeCents: number;
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  expiresAt: string | null;
  tickets: OrderTicketItem[];
  createdAt: string;
}

export interface CreateOrderRequest {
  eventId: string;
  items: Array<{
    batchId: string;
    quantity: number;
    attendees: Array<{
      name: string;
      email: string;
      cpf: string;
      phone?: string;
    }>;
  }>;
}

export interface CreateOrderResponse {
  order: OrderDetail;
  message: string;
}

export interface OrderListResponse {
  id: string;
  eventTitle: string;
  status: OrderStatus;
  totalCents: number;
  ticketCount: number;
  createdAt: string;
}

export interface CancelOrderResponse {
  success: true;
  message: string;
}

export interface OrderConfirmationEmail {
  orderId: string;
  eventTitle: string;
  totalCents: number;
  tickets: OrderTicketItem[];
  confirmationUrl: string;
}
