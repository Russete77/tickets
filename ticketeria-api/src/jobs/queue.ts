import { Queue, QueueEvents } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../shared/logger';

const defaultJobOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

// ============================================
// Filas
// ============================================

export const emailQueue = new Queue('send-email', {
  connection: redis,
  defaultJobOptions,
});

export const ticketEmissionQueue = new Queue('emit-tickets', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

export const paymentWebhookQueue = new Queue('process-payment-webhook', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

export const batchSwitchQueue = new Queue('batch-auto-switch', {
  connection: redis,
  defaultJobOptions,
});

export const capacityAlertQueue = new Queue('capacity-alert', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

export const checkinSyncQueue = new Queue('sync-checkin-offline', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

export const pushQueue = new Queue('send-push', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 2 },
});

// ============================================
// Filas com CRON
// ============================================

export const expireReservationsQueue = new Queue('expire-reservations', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 1 },
});

export const batchScheduleQueue = new Queue('batch-schedule', {
  connection: redis,
  defaultJobOptions,
});

export const postEventReviewQueue = new Queue('post-event-review', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

export const postEventReportQueue = new Queue('post-event-report', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

export const cleanupSessionsQueue = new Queue('cleanup-expired-sessions', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

// ============================================
// Setup de CRON jobs
// ============================================

export async function setupRecurringJobs(): Promise<void> {
  // Expira reservas pendentes a cada 1 minuto
  await expireReservationsQueue.add(
    'expire-reservations',
    {},
    { repeat: { pattern: '*/1 * * * *' }, jobId: 'expire-reservations-cron' },
  );

  // Verifica lotes agendados a cada 5 minutos
  await batchScheduleQueue.add(
    'batch-schedule',
    {},
    { repeat: { pattern: '*/5 * * * *' }, jobId: 'batch-schedule-cron' },
  );

  // Envia pedido de avaliação às 10h
  await postEventReviewQueue.add(
    'post-event-review',
    {},
    { repeat: { pattern: '0 10 * * *' }, jobId: 'post-event-review-cron' },
  );

  // Gera relatórios pós-evento às 6h
  await postEventReportQueue.add(
    'post-event-report',
    {},
    { repeat: { pattern: '0 6 * * *' }, jobId: 'post-event-report-cron' },
  );

  // Limpa sessions expiradas às 3h
  await cleanupSessionsQueue.add(
    'cleanup-sessions',
    {},
    { repeat: { pattern: '0 3 * * *' }, jobId: 'cleanup-sessions-cron' },
  );

  logger.info('✅ Recurring jobs configurados');
}

// ============================================
// Queue events para logging
// ============================================

export function setupQueueEvents(): void {
  const queues = [
    emailQueue,
    ticketEmissionQueue,
    paymentWebhookQueue,
    expireReservationsQueue,
    batchSwitchQueue,
    batchScheduleQueue,
    capacityAlertQueue,
    postEventReviewQueue,
    postEventReportQueue,
    cleanupSessionsQueue,
    checkinSyncQueue,
    pushQueue,
  ];

  for (const queue of queues) {
    const events = new QueueEvents(queue.name, { connection: redis });

    events.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${queue.name}:${jobId} falhou: ${failedReason}`);
    });

    events.on('stalled', ({ jobId }) => {
      logger.warn(`Job ${queue.name}:${jobId} travado (stalled)`);
    });
  }
}
