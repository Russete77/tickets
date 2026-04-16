import { Request } from 'express';

/**
 * Extended Express Request with custom properties added by middleware
 */
export interface CustomRequest extends Request {
  userId?: string;
  idempotencyKey?: string;
  rateCheckResults?: {
    cpf: RateLimitCheckResult | null;
    device: RateLimitCheckResult | null;
    card: RateLimitCheckResult | null;
    ip: RateLimitCheckResult | null;
  };
  flashSaleEventId?: string;
  flashSaleUserId?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining?: number;
  resetTime?: number;
  reason?: string;
}
