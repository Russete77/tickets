import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { processLgpdExport, type LgpdExportInput } from './lgpd-export.logic';

/**
 * Worker de exportação LGPD. Lógica em lgpd-export.logic.ts (testável).
 */
export const lgpdExportWorker = new Worker<LgpdExportInput>(
  'lgpd-export',
  async (job: Job<LgpdExportInput>) => processLgpdExport(job.data),
  { connection: redis, concurrency: 2 },
);

lgpdExportWorker.on('failed', (job, err) => {
  logger.error(`❌ lgpd-export worker falhou para user ${job?.data.userId}: ${err.message}`);
});
