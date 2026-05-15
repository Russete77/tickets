import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import {
  processFraudDetection,
  type FraudDetectionInput,
} from './fraud-detection.logic';

/**
 * Worker de detecção proativa de fraude.
 * Disparado após cada CheckinLog. A lógica vive em fraud-detection.logic.ts
 * (testável sem instanciar BullMQ).
 */
export const fraudDetectionWorker = new Worker<FraudDetectionInput>(
  'fraud-detection',
  async (job: Job<FraudDetectionInput>) => processFraudDetection(job.data),
  { connection: redis, concurrency: 5 },
);

fraudDetectionWorker.on('failed', (job, err) => {
  logger.error(`❌ fraud-detection worker falhou para ticket ${job?.data.ticketId}: ${err.message}`);
});
