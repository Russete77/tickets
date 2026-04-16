import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { pushService } from '../../modules/notifications/push.service';

interface PushJobData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const pushWorker = new Worker<PushJobData>(
  'send-push',
  async (job: Job<PushJobData>) => {
    const { userId, title, body, data } = job.data;
    logger.info(`Processing push job ${job.id} for user ${userId}`);

    await pushService.deliver({ userId, title, body, data });

    logger.info(`Push job ${job.id} delivered`);
  },
  {
    connection: redis,
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000, // 100 pushes per second
    },
  },
);

pushWorker.on('failed', (job, error) => {
  logger.error(`Push job ${job?.id} failed: ${error.message}`);
});

pushWorker.on('completed', (job) => {
  logger.debug(`Push job ${job.id} completed`);
});

export { pushWorker };
