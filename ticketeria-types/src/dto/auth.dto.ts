import { UserRole } from "../enums";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  cpf: string;
  phone: string | null;
  role: UserRole;
  emailVerified: boolean;
  avatarUrl: string | null;
  totpEnabled: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RegisterResponse {
  user: UserProfile;
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface VerifyEmailResponse {
  success: true;
  message: string;
}

export interface EnableTotpResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface VerifyTotpResponse {
  success: true;
  message: string;
}

export interface DisableTotpResponse {
  success: true;
  message: string;
}
