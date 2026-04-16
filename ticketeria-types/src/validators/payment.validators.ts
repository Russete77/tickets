import { z } from "zod";
import { PaymentMethod } from "../enums";

export const PaymentMethodEnum = z.nativeEnum(PaymentMethod);

export const CardTokenSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be 16 digits"),
  cardholderName: z.string().min(2, "Cardholder name must be at least 2 characters"),
  expiryMonth: z.coerce.number().int().min(1).max(12),
  expiryYear: z.coerce.number().int().min(new Date().getFullYear()),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
});

export type CardTokenInput = z.infer<typeof CardTokenSchema>;

export const CheckoutSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  paymentMethod: PaymentMethodEnum,
  card: CardTokenSchema.optional(),
});

export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export const RefundRequestSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
  amount: z.coerce.number().int().positive().optional(),
});

export type RefundRequestInput = z.infer<typeof RefundRequestSchema>;

export const PixWebhookSchema = z.object({
  id: z.string(),
  status: z.enum(["paid", "pending", "failed"]),
  amount: z.number(),
  paidDate: z.string().datetime().optional(),
  externalReference: z.string().optional(),
});

export const BoletoWebhookSchema = z.object({
  id: z.string(),
  status: z.enum(["paid", "pending", "failed", "expired"]),
  amount: z.number(),
  dueDate: z.string().date(),
  paidDate: z.string().datetime().optional(),
  externalReference: z.string().optional(),
});

export const CardWebhookSchema = z.object({
  id: z.string(),
  status: z.enum(["authorized", "captured", "failed", "refunded"]),
  amount: z.number(),
  authorizationCode: z.string().optional(),
  externalReference: z.string().optional(),
});

export const WebhookPayloadSchema = z.union([
  PixWebhookSchema,
  BoletoWebhookSchema,
  CardWebhookSchema,
]);

export type WebhookPayloadInput = z.infer<typeof WebhookPayloadSchema>;

export const InitiateRefundSchema = z.object({
  transactionId: z.string().min(1, "Transaction ID is required"),
  amount: z.coerce.number().int().positive(),
  reason: z.string().min(5, "Reason must be at least 5 characters"),
});

export type InitiateRefundInput = z.infer<typeof InitiateRefundSchema>;

export const ConfirmPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  paymentMethod: PaymentMethodEnum,
  status: z.enum(["success", "pending", "failed"]),
  externalTransactionId: z.string().optional(),
});

export type ConfirmPaymentInput = z.infer<typeof ConfirmPaymentSchema>;
