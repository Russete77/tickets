import { z } from "zod";
import { CompanyType } from "../enums";

export const CompanyTypeEnum = z.nativeEnum(CompanyType);

export const UpdateProducerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  bio: z.string().max(500, "Bio must not exceed 500 characters").optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format").optional(),
});

export type UpdateProducerInput = z.infer<typeof UpdateProducerSchema>;

export const CompanyInfoSchema = z.object({
  name: z.string().min(2, "Company name is required"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "Invalid CNPJ format"),
  type: CompanyTypeEnum,
  email: z.string().email("Invalid email address"),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format"),
  website: z.string().url("Invalid URL").optional(),
});

export const BankingInfoSchema = z.object({
  accountHolder: z.string().min(2, "Account holder name is required"),
  accountNumber: z.string().regex(/^\d{4,12}$/, "Invalid account number"),
  bankCode: z.string().regex(/^\d{3}$/, "Invalid bank code"),
  bankName: z.string().min(1, "Bank name is required"),
  accountType: z.enum(["checking", "savings"]),
  cpfCnpj: z.string().regex(/^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})$/, "Invalid CPF or CNPJ"),
});

export const DocumentUploadSchema = z.object({
  type: z.string().min(1, "Document type is required"),
  url: z.string().url("Invalid URL"),
});

export const VerifyProducerSchema = z.object({
  companyInfo: CompanyInfoSchema,
  bankingInfo: BankingInfoSchema,
  documents: z.array(DocumentUploadSchema).min(1, "At least one document is required"),
});

export type VerifyProducerInput = z.infer<typeof VerifyProducerSchema>;

export const GetProducerSchema = z.object({
  id: z.string().uuid("Invalid producer ID"),
});

export type GetProducerInput = z.infer<typeof GetProducerSchema>;

export const ListProducersSchema = z.object({
  verified: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
});

export type ListProducersInput = z.infer<typeof ListProducersSchema>;

export const GetFinancialSummarySchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type GetFinancialSummaryInput = z.infer<typeof GetFinancialSummarySchema>;

export const GetStatementSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().int().min(0).default(0).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
});

export type GetStatementInput = z.infer<typeof GetStatementSchema>;

export const RequestPayoutSchema = z.object({
  amount: z.coerce.number().int().positive("Amount must be positive"),
});

export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>;
