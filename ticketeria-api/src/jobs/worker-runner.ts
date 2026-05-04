/**
 * Entry point para os workers BullMQ
 * Executado separadamente da API: npm run start:worker
 */
import { logger } from '../shared/logger';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { setupRecurringJobs, setupQueueEvents } from './queue';

// Importa todos os workers (registra no BullMQ)
import { emailWorker } from './workers/email.worker';
import { expireReservationsWorker } from './workers/expire-reservations.worker';
import { emitTicketsWorker } from './workers/emit-tickets.worker';
import { batchAutoSwitchWorker } from './workers/batch-auto-switch.worker';
import { batchScheduleWorker } from './workers/batch-schedule.worker';
import { capacityAlertWorker } from './workers/capacity-alert.worker';
import { postEventReviewWorker } from './workers/post-event-review.worker';
import { postEventReportWorker } from './workers/post-event-report.worker';

// Workers adicionados — Auditoria CTO 2026-05
import { webhookOutboundWorker } from './workers/webhook-outbound.worker';
import { searchSyncWorker } from './workers/search-sync.worker';

const workers = [
  emailWorker,
  expireReservationsWorker,
  emitTicketsWorker,
  batchAutoSwitchWorker,
  batchScheduleWorker,
  capacityAlertWorker,
  postEventReviewWorker,
  postEventReportWorker,
  webhookOutboundWorker,
  searchSyncWorker,
];

async function startWorkers(): Promise<void> {
  logger.info('🔧 Iniciando BullMQ workers...');

  await setupRecurringJobs();
  setupQueueEvents();

  logger.info(`✅ ${workers.length} workers ativos e ouvindo filas`);
}

startWorkers().catch((err) => {
  logger.fatal(err, 'Falha ao iniciar workers');
  process.exit(1);
});

/**
 * Graceful shutdown:
 *   1. Para de pegar novos jobs (worker.close()).
 *   2. Espera jobs em execução terminarem (BullMQ aguarda concurrency atual).
 *   3. Fecha Prisma e Redis.
 *   4. Timeout de 25s — em K8s o SIGKILL chega em 30s default, então deixamos folga.
 */
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} recebido. Drenando workers...`);

  const forceExitTimer = setTimeout(() => {
    logger.error('Timeout de shutdown (25s). Forçando saída.');
    process.exit(1);
  }, 25_000);
  forceExitTimer.unref();

  try {
    // Fechamos todos os workers em paralelo. close() faz drain dos jobs ativos.
    await Promise.allSettled(workers.map((w) => w.close()));
    logger.info('✅ Todos os workers drenados');

    await prisma.$disconnect();
    logger.info('✅ Prisma desconectado');

    await redis.quit();
    logger.info('✅ Redis desconectado');

    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Erro no graceful shutdown dos workers');
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException no worker — iniciando shutdown');
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection no worker');
});
