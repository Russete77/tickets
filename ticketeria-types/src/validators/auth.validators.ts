import { z } from "zod";
import { UserRole } from "../enums";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "Invalid CPF format"),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyEmailInput = z.infer<typeof VerifyEmailSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

export const EnableTotpSchema = z.object({
  password: z.string().min(8, "Password is required for verification"),
});

export type EnableTotpInput = z.infer<typeof EnableTotpSchema>;

export const VerifyTotpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

export type VerifyTotpInput = z.infer<typeof VerifyTotpSchema>;

export const DisableTotpSchema = z.object({
  password: z.string().min(8, "Password is required for verification"),
  backupCode: z.string().optional(),
});

export type DisableTotpInput = z.infer<typeof DisableTotpSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
