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
  await expireReservationsQueue.upsertJobScheduler(
    'expire-reservations-cron',
    { pattern: '*/1 * * * *' },
    { name: 'expire-reservations', data: {} },
  );

  // Verifica lotes agendados a cada 5 minutos
  await batchScheduleQueue.upsertJobScheduler(
    'batch-schedule-cron',
    { pattern: '*/5 * * * *' },
    { name: 'batch-schedule', data: {} },
  );

  // Envia pedido de avaliação às 10h
  await postEventReviewQueue.upsertJobScheduler(
    'post-event-review-cron',
    { pattern: '0 10 * * *' },
    { name: 'post-event-review', data: {} },
  );

  // Gera relatórios pós-evento às 6h
  await postEventReportQueue.upsertJobScheduler(
    'post-event-report-cron',
    { pattern: '0 6 * * *' },
    { name: 'post-event-report', data: {} },
  );

  // Limpa sessions expiradas às 3h
  await cleanupSessionsQueue.upsertJobScheduler(
    'cleanup-sessions-cron',
    { pattern: '0 3 * * *' },
    { name: 'cleanup-sessions', data: {} },
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
