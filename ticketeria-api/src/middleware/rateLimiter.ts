import rateLimit from 'express-rate-limit';
import { Request } from 'express';
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
 * Resolve a chave de rate limit por usuário autenticado quando disponível,
 * caindo para device fingerprint ou IP. Garante que rate limit de operações
 * autenticadas seja por conta, não por IP compartilhado (NAT, proxy).
 */
function userOrDeviceKey(req: Request): string {
  if (req.user?.userId) return `u:${req.user.userId}`;
  if (req.deviceFingerprint) return `d:${req.deviceFingerprint}`;
  return `i:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

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

/**
 * Rate limiter para validação de QR no check-in: 20 req/s por operador
 * (controlado por userId quando autenticado).
 *
 * Justificativa: um operador real escaneia ~3-5 QRs/s no pico.
 * 20/s deixa folga para retries, falhas de leitura e bursts. Acima disso
 * é provável bot ou bug.
 */
export const checkinValidateRateLimiter = rateLimit({
  windowMs: 1_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrDeviceKey,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas validações em sequência. Aguarde alguns segundos.',
    },
  },
});

/**
 * Rate limiter para criação de pedidos / reserva de ingressos: 2 req/s por usuário.
 * Evita race conditions de cliques duplos e força idempotência via X-Idempotency-Key.
 */
export const ticketReserveRateLimiter = rateLimit({
  windowMs: 1_000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrDeviceKey,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Aguarde antes de tentar novamente.',
    },
  },
});

/**
 * Rate limiter para webhooks externos (Sympla, Ingresso): 100 req/s por origem.
 * Confia em idempotência forçada na rota.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 1_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `wh:${req.ip || 'unknown'}`,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Webhook rate limit excedido.',
    },
  },
});

/**
 * Rate limiter para LGPD export/delete: 3 tentativas por usuário em 1 hora.
 * Operações pesadas + sensíveis — não devem ser spam-able.
 */
export const lgpdRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrDeviceKey,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Limite de operações LGPD atingido. Tente novamente em uma hora.',
    },
  },
});
