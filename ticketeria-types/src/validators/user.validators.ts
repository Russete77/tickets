import { z } from "zod";

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  phone: z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Invalid phone format").optional(),
  avatarUrl: z.string().url("Invalid URL").optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"],
  }
);

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const GetUserByIdSchema = z.object({
  id: z.string().uuid("Invalid user ID"),
});

export type GetUserByIdInput = z.infer<typeof GetUserByIdSchema>;

export const ResendVerificationEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ResendVerificationEmailInput = z.infer<typeof ResendVerificationEmailSchema>;
