import { Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { ZoneOccupancyService } from '../../modules/venue-maps/zone-occupancy.service';

export const zoneOccupancyWorker = new Worker(
  'zone-occupancy',
  async (job) => {
    const n = await ZoneOccupancyService.tickAllPublishedEvents();
    logger.debug(`zone-occupancy: published live updates for ${n} events (job ${job.id})`);
  },
  { connection: redis, concurrency: 1 },
);

zoneOccupancyWorker.on('failed', (job, err) => {
  logger.error(`zone-occupancy ${job?.id} failed: ${err.message}`);
});
