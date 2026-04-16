import { PaymentMethod } from "../enums";

export interface PixQRData {
  qrCode: string;
  qrCodeUrl: string;
  copyPaste: string;
  expiresAt: string;
}

export interface CardTokenRequest {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

export interface BoletoData {
  barcode: string;
  barcodeUrl: string;
  expiresAt: string;
  amount: number;
}

export interface CheckoutResponse {
  orderId: string;
  totalCents: number;
  expiresAt: string;
  paymentLink: string | null;
  pix?: PixQRData;
  boleto?: BoletoData;
  supportsCard: boolean;
}

export interface PaymentConfirmation {
  transactionId: string;
  orderId: string;
  method: PaymentMethod;
  amountCents: number;
  status: "success" | "pending" | "failed";
  confirmedAt: string;
}

export interface PaymentWebhook {
  externalId: string;
  status: "paid" | "pending" | "failed" | "refunded";
  amount: number;
  method: PaymentMethod;
  timestamp: string;
}

export interface RefundRequest {
  orderId: string;
  reason: string;
  amount?: number;
}

export interface RefundResponse {
  success: true;
  refundId: string;
  amountCents: number;
  status: string;
  message: string;
}

export interface PaymentMethodInfo {
  method: PaymentMethod;
  isAvailable: boolean;
  minAmount: number;
  maxAmount: number;
  processingTimeMs: number;
}

export interface AsaasWebhook {
  event: string;
  data: {
    id: string;
    status: string;
    value: number;
    netValue: number;
    originalValue: number;
    paidDate: string;
    description: string;
    externalReference: string;
    [key: string]: unknown;
  };
}
