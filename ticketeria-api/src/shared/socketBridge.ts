import { redis } from '../config/redis';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

const CHANNEL = 'socket:broadcast';

interface BroadcastMessage {
  room: string;
  event: string;
  data: unknown;
}

/**
 * Publish a Socket.IO broadcast message via Redis (called from workers)
 */
export async function publishBroadcast(room: string, event: string, data: unknown): Promise<void> {
  const message: BroadcastMessage = { room, event, data };
  await redis.publish(CHANNEL, JSON.stringify(message));
}

/**
 * Subscribe to broadcast messages and emit via Socket.IO (called from server)
 */
export function subscribeToSocketBroadcasts(io: any): void {
  // Create a dedicated subscriber connection (Redis requires separate connection for sub)
  const subscriber = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
  });

  subscriber.subscribe(CHANNEL, (err) => {
    if (err) {
      logger.error({ err }, 'Failed to subscribe to socket broadcast channel:');
      return;
    }
    logger.info('Subscribed to socket:broadcast channel');
  });

  subscriber.on('message', (channel, message) => {
    try {
      const { room, event, data } = JSON.parse(message) as BroadcastMessage;
      io.to(room).emit(event, data);
      logger.debug(`Socket broadcast: ${event} to ${room}`);
    } catch (error) {
      logger.error({ error }, 'Failed to process socket broadcast:');
    }
  });
}
