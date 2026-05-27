import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../shared/logger';
import { CustomRequest } from '../types/middleware.types';

const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Internal function to perform sliding window rate limiting using Redis
 * Uses ZADD with timestamps and ZREMRANGEBYSCORE for window management
 */
async function checkSlidingWindow(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; count: number; resetIn: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  try {
    // Use Redis pipeline for atomic operation
    const pipeline = redis.pipeline();

    // Add current attempt with timestamp as score
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Remove entries outside the window
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count remaining entries in window
    pipeline.zcard(key);

    // Set expiration
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, count: 0, resetIn: windowSeconds };
    }

    const count = (results[2][1] as number) || 0;
    const allowed = count <= maxAttempts;
    const resetIn = windowSeconds;

    return { allowed, count, resetIn };
  } catch (error) {
    logger.error({ error, key }, 'Error checking sliding window');
    // On error, allow the request (fail open)
    return { allowed: true, count: 0, resetIn: windowSeconds };
  }
}

/**
 * Check maximum tickets per CPF per event
 * Prevents one user from buying too many tickets
 *
 * @param cpf - User CPF (document)
 * @param eventId - Event ID
 * @param maxTickets - Maximum tickets allowed (default: 4)
 * @returns { allowed: boolean, ticketsUsed: number }
 */
export async function checkCpfLimit(
  cpf: string,
  eventId: string,
  maxTickets: number = 4,
): Promise<{ allowed: boolean; ticketsUsed: number }> {
  try {
    const key = `${RATE_LIMIT_PREFIX}cpf:${cpf}:${eventId}`;
    const now = Date.now();
    const dayAgo = now - 86400 * 1000; // 24h window

    const pipeline = redis.pipeline();

    // Count tickets bought in last 24h
    pipeline.zcount(key, dayAgo, now);

    // If this is an increment, add one
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration to 24h
    pipeline.expire(key, 86400);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, ticketsUsed: 0 };
    }

    const ticketsUsed = ((results[0][1] as number) || 0) + 1;
    const allowed = ticketsUsed <= maxTickets;

    return { allowed, ticketsUsed };
  } catch (error) {
    logger.error({ error, cpf, eventId }, 'Error checking CPF limit');
    return { allowed: true, ticketsUsed: 0 };
  }
}

/**
 * Check maximum purchases per device simultaneously
 * Prevents one device from making multiple concurrent purchases
 *
 * @param fingerprint - Device fingerprint (generated on client)
 * @param maxPurchases - Maximum concurrent purchases (default: 2)
 * @returns { allowed: boolean, purchasesInProgress: number }
 */
export async function checkDeviceLimit(
  fingerprint: string,
  maxPurchases: number = 2,
): Promise<{ allowed: boolean; purchasesInProgress: number }> {
  try {
    const key = `${RATE_LIMIT_PREFIX}device:${fingerprint}`;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000; // 5min window for concurrent purchases

    const pipeline = redis.pipeline();

    // Count active purchases in last 5 minutes
    pipeline.zcount(key, fiveMinutesAgo, now);

    // Add current attempt
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiration to 5 minutes
    pipeline.expire(key, 5 * 60);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, purchasesInProgress: 0 };
    }

    const purchasesInProgress = ((results[0][1] as number) || 0) + 1;
    const allowed = purchasesInProgress <= maxPurchases;

    return { allowed, purchasesInProgress };
  } catch (error) {
    logger.error({ error, fingerprint }, 'Error checking device limit');
    return { allowed: true, purchasesInProgress: 0 };
  }
}

/**
 * Check maximum different cards used per CPF in 24h
 * Prevents fraud attempts with multiple card changes
 *
 * @param cpf - User CPF
 * @param cardToken - Card token or last 4 digits
 * @param maxCards - Maximum different cards allowed (default: 3)
 * @returns { allowed: boolean, cardsUsed: number }
 */
export async function checkCardLimit(
  cpf: string,
  cardToken: string,
  maxCards: number = 3,
): Promise<{ allowed: boolean; cardsUsed: number }> {
  try {
    const key = `${RATE_LIMIT_PREFIX}cards:${cpf}`;
    const now = Date.now();
    const dayAgo = now - 86400 * 1000;

    const pipeline = redis.pipeline();

    // Count unique cards used in last 24h
    // We use ZCARD since each card is a unique member
    pipeline.zcard(key);

    // Add card attempt (member is card, score is time)
    pipeline.zadd(key, now, cardToken);

    // Remove old entries (older than 24h)
    pipeline.zremrangebyscore(key, '-inf', dayAgo);

    // Set expiration
    pipeline.expire(key, 86400);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, cardsUsed: 0 };
    }

    const cardsUsed = ((results[0][1] as number) || 0) + 1;
    const allowed = cardsUsed <= maxCards;

    return { allowed, cardsUsed };
  } catch (error) {
    logger.error({ error, cpf }, 'Error checking card limit');
    return { allowed: true, cardsUsed: 0 };
  }
}

/**
 * Check IP burst limit - maximum attempts per IP in time window
 * Detects brute force attacks
 *
 * @param ip - Client IP address
 * @param maxAttempts - Maximum attempts allowed (default: 10)
 * @param windowMinutes - Time window in minutes (default: 15)
 * @returns { allowed: boolean, attempts: number, resetIn: number }
 */
export async function checkIpBurstLimit(
  ip: string,
  maxAttempts: number = 10,
  windowMinutes: number = 15,
): Promise<{ allowed: boolean; attempts: number; resetIn: number }> {
  try {
    const key = `${RATE_LIMIT_PREFIX}ip:${ip}`;
    const windowSeconds = windowMinutes * 60;

    const result = await checkSlidingWindow(key, maxAttempts, windowSeconds);

    return {
      allowed: result.allowed,
      attempts: result.count,
      resetIn: result.resetIn,
    };
  } catch (error) {
    logger.error({ error, ip }, 'Error checking IP burst limit');
    return { allowed: true, attempts: 0, resetIn: 900 };
  }
}

interface AdvancedRateLimitOptions {
  eventId?: string;
  checkCpf?: boolean;
  checkDevice?: boolean;
  checkCard?: boolean;
  checkIp?: boolean;
}

/**
 * Advanced rate limiter middleware
 * Combines multiple rate limiting strategies
 *
 * Usage:
 *   router.post('/checkout', authenticate, advancedRateLimit({ checkCpf: true }), ...)
 */
export function advancedRateLimit(options: AdvancedRateLimitOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cpf = req.body?.cpf;
      const deviceFingerprint = req.headers['x-device-fingerprint'] as string;
      const cardToken = req.body?.cardToken;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';

      // Check IP burst limit (always enabled)
      if (options.checkIp !== false) {
        const ipCheck = await checkIpBurstLimit(ip, 10, 15);
        if (!ipCheck.allowed) {
          logger.warn({ ip, attempts: ipCheck.attempts }, 'IP burst limit exceeded');
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: `Muitas tentativas. Tente novamente em ${ipCheck.resetIn} segundos.`,
              retryAfter: ipCheck.resetIn,
            },
          });
          return;
        }
      }

      // Check CPF limit (if CPF provided and check enabled)
      if (options.checkCpf !== false && cpf && options.eventId) {
        const cpfCheck = await checkCpfLimit(cpf, options.eventId, 4);
        if (!cpfCheck.allowed) {
          logger.warn({ cpf, eventId: options.eventId }, 'CPF ticket limit exceeded');
          res.status(429).json({
            success: false,
            error: {
              code: 'CPF_LIMIT_EXCEEDED',
              message: 'Limite de ingressos por pessoa excedido para este evento.',
              limit: 4,
            },
          });
          return;
        }
      }

      // Check device limit (if fingerprint provided and check enabled)
      if (options.checkDevice !== false && deviceFingerprint) {
        const deviceCheck = await checkDeviceLimit(deviceFingerprint, 2);
        if (!deviceCheck.allowed) {
          logger.warn({ fingerprint: deviceFingerprint }, 'Device concurrent purchase limit exceeded');
          res.status(429).json({
            success: false,
            error: {
              code: 'DEVICE_LIMIT_EXCEEDED',
              message: 'Múltiplas compras simultâneas detectadas. Aguarde a conclusão da compra anterior.',
              limit: 2,
            },
          });
          return;
        }
      }

      // Check card limit (if card token provided and check enabled)
      if (options.checkCard !== false && cpf && cardToken) {
        const cardCheck = await checkCardLimit(cpf, cardToken, 3);
        if (!cardCheck.allowed) {
          logger.warn({ cpf }, 'Card limit exceeded');
          res.status(429).json({
            success: false,
            error: {
              code: 'CARD_LIMIT_EXCEEDED',
              message: 'Limite de cartões diferentes por pessoa em 24h excedido.',
              limit: 3,
            },
          });
          return;
        }
      }

      // Store check results in request for later use
      (req as CustomRequest).rateCheckResults = {
        cpf: cpf ? await checkCpfLimit(cpf, options.eventId || '', 4) : null,
        device: deviceFingerprint ? await checkDeviceLimit(deviceFingerprint, 2) : null,
        card: cpf && cardToken ? await checkCardLimit(cpf, cardToken, 3) : null,
        ip: await checkIpBurstLimit(ip, 10, 15),
      };

      next();
    } catch (error) {
      logger.error({ error }, 'Advanced rate limiter middleware error');
      // On error, allow request through
      next();
    }
  };
}
