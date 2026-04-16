import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Rate limiter global: 100 req/min por IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas requisições. Tente novamente mais tarde.',
    },
  },
});

/**
 * Rate limiter para checkout: 10 tentativas por IP em 15 minutos
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Limite de tentativas de compra excedido. Tente novamente em 15 minutos.',
    },
  },
});

/**
 * Rate limiter para auth: 5 tentativas por IP em 15 minutos
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    },
  },
});
