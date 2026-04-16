import { z } from "zod";
import { TicketStatus, TransferStatus } from "../enums";

export const TicketStatusEnum = z.nativeEnum(TicketStatus);
export const TransferStatusEnum = z.nativeEnum(TransferStatus);

export const TransferTicketSchema = z.object({
  transferToEmail: z.string().email("Invalid email address"),
  transferToName: z.string().min(2, "Name must be at least 2 characters"),
  transferToCpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Invalid CPF format"),
});

export type TransferTicketInput = z.infer<typeof TransferTicketSchema>;

export const AcceptTransferSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
});

export type AcceptTransferInput = z.infer<typeof AcceptTransferSchema>;

export const DeclineTransferSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
});

export type DeclineTransferInput = z.infer<typeof DeclineTransferSchema>;

export const CancelTransferSchema = z.object({
  transferId: z.string().uuid("Invalid transfer ID"),
});

export type CancelTransferInput = z.infer<typeof CancelTransferSchema>;

export const GetTicketSchema = z.object({
  id: z.string().uuid("Invalid ticket ID"),
});

export type GetTicketInput = z.infer<typeof GetTicketSchema>;

export const ListUserTicketsSchema = z.object({
  eventId: z.string().uuid().optional(),
  status: TicketStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListUserTicketsInput = z.infer<typeof ListUserTicketsSchema>;

export const GetTicketQRSchema = z.object({
  id: z.string().uuid("Invalid ticket ID"),
});

export type GetTicketQRInput = z.infer<typeof GetTicketQRSchema>;

export const ValidateTicketCodeSchema = z.object({
  code: z.string().min(1, "Ticket code is required"),
});

export type ValidateTicketCodeInput = z.infer<typeof ValidateTicketCodeSchema>;

export const GetTransfersSchema = z.object({
  status: TransferStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type GetTransfersInput = z.infer<typeof GetTransfersSchema>;
