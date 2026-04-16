import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger } from '../shared/logger';
import { BadRequestError } from '../shared/errors';
import { CustomRequest } from '../types/middleware.types';

const IDEMPOTENCY_PREFIX = 'idempotency:';

/**
 * Idempotency middleware for POST requests
 * Prevents duplicate processing by caching responses based on idempotency key
 *
 * Usage:
 *   router.post('/checkout', authenticate, idempotency(), validate(...), controllerMethod)
 *
 * Client must provide X-Idempotency-Key header for POST requests
 */
export function idempotency(ttlSeconds: number = 86400) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to POST requests
    if (req.method !== 'POST') {
      return next();
    }

    try {
      const idempotencyKey = req.headers['x-idempotency-key'] as string;

      // Idempotency key is required
      if (!idempotencyKey) {
        throw new BadRequestError('Header X-Idempotency-Key é obrigatório para POST');
      }

      // Validate key format (should be a UUID or similar)
      if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8) {
        throw new BadRequestError('X-Idempotency-Key inválida');
      }

      const cacheKey = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;

      // Check if this request was already processed
      try {
        const cachedResponse = await redis.get(cacheKey);

        if (cachedResponse) {
          logger.debug({ idempotencyKey }, 'Returning cached response for idempotent request');

          const response = JSON.parse(cachedResponse);
          return res.status(response.status || 200).json(response.body);
        }
      } catch (error) {
        logger.error({ error, idempotencyKey }, 'Error retrieving cached response');
        // Continue with request on cache error
      }

      // Store the original res.json to intercept response
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (body: unknown) {
        // Don't cache error responses (4xx, 5xx)
        const statusCode = res.statusCode || 200;

        if (statusCode >= 200 && statusCode < 400) {
          try {
            const responseData = {
              status: statusCode,
              body: body,
            };
            // Store in Redis with TTL
            redis.setex(
              cacheKey,
              ttlSeconds,
              JSON.stringify(responseData),
            ).catch((err) => {
              logger.error({ error: err, idempotencyKey }, 'Failed to cache idempotent response');
            });

            logger.debug(
              { idempotencyKey, statusCode },
              'Cached response for idempotent request',
            );
          } catch (error) {
            logger.error({ error, idempotencyKey }, 'Error caching response');
          }
        }

        return originalJson(body);
      };

      // Attach key to request for potential use in handlers
      (req as CustomRequest).idempotencyKey = idempotencyKey;

      next();
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error({ error }, 'Idempotency middleware error');
      // On unexpected error, allow request through
      next();
    }
  };
}

/**
 * Clear idempotency cache (useful for testing or explicit invalidation)
 */
export async function clearIdempotencyCache(idempotencyKey: string): Promise<void> {
  try {
    const cacheKey = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    await redis.del(cacheKey);
    logger.debug({ idempotencyKey }, 'Idempotency cache cleared');
  } catch (error) {
    logger.error({ error, idempotencyKey }, 'Failed to clear idempotency cache');
    throw error;
  }
}
