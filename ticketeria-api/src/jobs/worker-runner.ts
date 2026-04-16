/**
 * Entry point para os workers BullMQ
 * Executado separadamente da API: npm run start:worker
 */
import { logger } from '../shared/logger';
import { setupRecurringJobs, setupQueueEvents } from './queue';

// Importa todos os workers (registra no BullMQ)
import './workers/email.worker';
import './workers/expire-reservations.worker';
import './workers/emit-tickets.worker';
import './workers/batch-auto-switch.worker';
import './workers/batch-schedule.worker';
import './workers/capacity-alert.worker';
import './workers/post-event-review.worker';
import './workers/post-event-report.worker';

async function startWorkers() {
  logger.info('🔧 Iniciando BullMQ workers...');

  // Configura CRON jobs recorrentes
  await setupRecurringJobs();

  // Configura event listeners para logging
  setupQueueEvents();

  logger.info('✅ Workers ativos e ouvindo filas');
}

startWorkers().catch((err) => {
  logger.fatal(err, 'Falha ao iniciar workers');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando workers...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Encerrando workers...');
  process.exit(0);
});
