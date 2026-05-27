import { Worker } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { NotificationTriggersService } from '../../modules/notifications/notification-triggers.service';

const notificationTriggerWorker = new Worker(
  'notification-trigger',
  async (job) => {
    logger.info(`Processing notification-trigger job ${job.id}`);
    await NotificationTriggersService.runAll();
    logger.info(`notification-trigger job ${job.id} done`);
  },
  {
    connection: redis,
    concurrency: 1,
  },
);

notificationTriggerWorker.on('failed', (job, error) => {
  logger.error(`notification-trigger ${job?.id} failed: ${error.message}`);
});

export { notificationTriggerWorker };
