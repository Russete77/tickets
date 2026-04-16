import { z } from "zod";
import { OrderStatus, PaymentMethod } from "../enums";

export const OrderStatusEnum = z.nativeEnum(OrderStatus);

export const AttendeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Invalid CPF format"),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format").optional(),
});

export const OrderItemSchema = z.object({
  batchId: z.string().uuid("Invalid batch ID"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  attendees: z.array(AttendeeSchema),
}).refine(
  (data) => data.attendees.length === data.quantity,
  {
    message: "Number of attendees must match quantity",
    path: ["attendees"],
  }
);

export const CreateOrderSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const GetOrderSchema = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export type GetOrderInput = z.infer<typeof GetOrderSchema>;

export const ListOrdersSchema = z.object({
  status: OrderStatusEnum.optional(),
  eventId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListOrdersInput = z.infer<typeof ListOrdersSchema>;

export const CancelOrderSchema = z.object({
  id: z.string().uuid("Invalid order ID"),
});

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>;

export const ApplyDiscountSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  discountCode: z.string().min(1, "Discount code is required"),
});

export type ApplyDiscountInput = z.infer<typeof ApplyDiscountSchema>;

export const PaymentConfirmationSchema = z.object({
  orderId: z.string().uuid("Invalid order ID"),
  paymentMethod: z.nativeEnum(PaymentMethod),
  transactionId: z.string().min(1, "Transaction ID is required"),
  amount: z.coerce.number().int().positive(),
});

export type PaymentConfirmationInput = z.infer<typeof PaymentConfirmationSchema>;
