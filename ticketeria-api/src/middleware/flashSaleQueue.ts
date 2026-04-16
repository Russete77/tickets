import { Request, Response, NextFunction } from 'express';
import { CustomRequest } from '../types/middleware.types';
import { redis } from '../config/redis';
import { logger } from '../shared/logger';
import { TooManyRequestsError } from '../shared/errors';

const DEFAULT_BATCH_SIZE = 500;
const FLASH_SALE_PREFIX = 'flashsale:';
const QUEUE_PREFIX = 'flashsale:queue:';

/**
 * Get all active flash sale event IDs
 */
async function getActiveFlashSales(): Promise<string[]> {
  try {
    const keys = await redis.keys(`${FLASH_SALE_PREFIX}*`);
    return keys.map((key) => key.replace(FLASH_SALE_PREFIX, ''));
  } catch (error) {
    logger.error({ error }, 'Failed to get active flash sales');
    return [];
  }
}

/**
 * Activate flash sale mode for an event
 */
export async function activateFlashSale(
  eventId: string,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<void> {
  try {
    const key = `${FLASH_SALE_PREFIX}${eventId}`;
    await redis.set(key, batchSize.toString(), 'EX', 86400); // 24h TTL
    logger.info({ eventId, batchSize }, 'Flash sale activated');
  } catch (error) {
    logger.error({ error, eventId }, 'Failed to activate flash sale');
    throw error;
  }
}

/**
 * Deactivate flash sale for an event
 */
export async function deactivateFlashSale(eventId: string): Promise<void> {
  try {
    const key = `${FLASH_SALE_PREFIX}${eventId}`;
    const queueKey = `${QUEUE_PREFIX}${eventId}`;
    await redis.del(key, queueKey);
    logger.info({ eventId }, 'Flash sale deactivated');
  } catch (error) {
    logger.error({ error, eventId }, 'Failed to deactivate flash sale');
    throw error;
  }
}

/**
 * Get user's position in queue and estimated wait time
 */
export async function getQueuePosition(
  eventId: string,
  userId: string,
): Promise<{ position: number | null; estimatedWait: number | null }> {
  try {
    const queueKey = `${QUEUE_PREFIX}${eventId}`;
    const position = await redis.zrank(queueKey, userId);

    if (position === null) {
      return { position: null, estimatedWait: null };
    }

    // Estimate wait time: 5 seconds per user in queue
    const estimatedWait = position * 5;
    return { position: position + 1, estimatedWait };
  } catch (error) {
    logger.error({ error, eventId, userId }, 'Failed to get queue position');
    return { position: null, estimatedWait: null };
  }
}

/**
 * Remove user from queue after checkout completion
 */
export async function removeFromQueue(eventId: string, userId: string): Promise<void> {
  try {
    const queueKey = `${QUEUE_PREFIX}${eventId}`;
    await redis.zrem(queueKey, userId);
    logger.debug({ eventId, userId }, 'User removed from queue');
  } catch (error) {
    logger.error({ error, eventId, userId }, 'Failed to remove user from queue');
    // Don't throw - this is cleanup
  }
}

/**
 * Flash sale queue middleware
 * Manages virtual queue for high-traffic events
 */
export function flashSaleQueue() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Only check for routes with eventId parameter
      const eventId = req.params.eventId || req.body?.eventId;
      if (!eventId) {
        return next();
      }

      // Check if flash sale is active for this event
      const key = `${FLASH_SALE_PREFIX}${eventId}`;
      const batchSizeStr = await redis.get(key);

      if (!batchSizeStr) {
        // Flash sale not active, proceed normally
        return next();
      }

      const batchSize = parseInt(batchSizeStr, 10) || DEFAULT_BATCH_SIZE;
      const userId = req.user?.userId || req.ip || 'anonymous';

      // Add user to queue with current timestamp
      const now = Date.now();
      const queueKey = `${QUEUE_PREFIX}${eventId}`;

      // ZADD: add user to sorted set with score = timestamp
      await redis.zadd(queueKey, now, userId);

      // Set expiration on queue key (24h)
      await redis.expire(queueKey, 86400);

      // Get user's position
      const position = await redis.zrank(queueKey, userId);

      if (position === null || position >= batchSize) {
        // User is beyond batch size, return 429
        const estimatedWait = ((position || 0) + 1) * 5; // seconds

        logger.warn(
          { eventId, userId, position: (position || 0) + 1, estimatedWait },
          'User in queue (not processed)',
        );

        return res.status(429).json({
          success: false,
          error: {
            code: 'QUEUE_FULL',
            message: 'Evento em alta demanda. Você está em fila virtual.',
            position: (position || 0) + 1,
            estimatedWait,
          },
        });
      }

      // User is within batch, add to request for later cleanup
      (req as CustomRequest).flashSaleEventId = eventId;
      (req as CustomRequest).flashSaleUserId = userId;

      logger.debug(
        { eventId, userId, position: position + 1, batchSize },
        'User processed in queue',
      );

      next();
    } catch (error) {
      logger.error({ error }, 'Flash sale queue middleware error');
      // On error, allow the request through
      next();
    }
  };
}

/**
 * Helper to clean up user from queue after successful checkout
 * Call this after payment is completed
 */
export async function cleanupFlashSaleQueue(req: Request): Promise<void> {
  const eventId = (req as CustomRequest).flashSaleEventId;
  const userId = (req as CustomRequest).flashSaleUserId;

  if (eventId && userId) {
    await removeFromQueue(eventId, userId);
  }
}
