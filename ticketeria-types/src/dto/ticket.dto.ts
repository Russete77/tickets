import { TicketStatus, BatchType, TransferStatus } from "../enums";

export interface TicketDetail {
  id: string;
  code: string;
  orderId: string;
  eventId: string;
  batchType: BatchType;
  status: TicketStatus;
  cpf: string;
  name: string;
  email: string;
  phone: string | null;
  checkedInAt: string | null;
  transferredAt: string | null;
  transferredTo: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface TicketQR {
  id: string;
  code: string;
  hash: string;
  status: TicketStatus;
  qrData: string;
  expiresAt: string | null;
}

export interface TicketSummary {
  id: string;
  code: string;
  status: TicketStatus;
  batchType: BatchType;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  cpf: string;
  name: string;
  email: string;
}

export interface TransferTicketRequest {
  transferToEmail: string;
  transferToName: string;
  transferToCpf: string;
}

export interface TransferTicketResponse {
  success: true;
  transferId: string;
  message: string;
  expiresAt: string;
}

export interface TransferOffer {
  id: string;
  ticketId: string;
  ticketCode: string;
  status: TransferStatus;
  fromUserId: string;
  toEmail: string;
  toName: string;
  toCpf: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  createdAt: string;
  expiresAt: string;
}

export interface AcceptTransferResponse {
  success: true;
  ticket: TicketDetail;
  message: string;
}

export interface DeclineTransferResponse {
  success: true;
  message: string;
}

export interface CancelTransferResponse {
  success: true;
  message: string;
}
