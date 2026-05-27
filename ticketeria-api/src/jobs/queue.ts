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

/** Fraud detection — detecção proativa de check-ins duplicados (Fase 2.2) */
export const fraudDetectionQueue = new Queue('fraud-detection', {
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
// Filas adicionadas — Auditoria CTO 2026-05
// ============================================

/** Webhook outbound — entrega pra subscribers externos (gap 4.10) */
export const webhookOutboundQueue = new Queue('webhook-outbound', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 2, attempts: 8 },
});

/** Search sync — Meilisearch (gap 4.3) */
export const searchSyncQueue = new Queue('search-sync', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

/** Ledger close — invariantes pós-evento (gap 4.5) */
export const ledgerCloseQueue = new Queue('ledger-close', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

/** LGPD export — gera ZIP de dados pessoais (Fase 2.5) */
export const lgpdExportQueue = new Queue('lgpd-export', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

/** Notification triggers — remarketing/reminders (Engine 5 Sprint 2) */
export const notificationTriggerQueue = new Queue('notification-trigger', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

/** Zone occupancy — heatmap live updates (Engine 5 Sprint 4) */
export const zoneOccupancyQueue = new Queue('zone-occupancy', {
  connection: redis,
  defaultJobOptions: { ...defaultJobOptions, priority: 3 },
});

/** Achievement evaluator — pós-evento (Engine 5 Sprint 6) */
export const achievementEvaluatorQueue = new Queue('achievement-evaluator', {
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

  // Auditoria CTO 2026-05 — rebuild Meilisearch nightly às 4h (gap 4.3)
  await searchSyncQueue.add(
    'rebuild',
    { type: 'rebuild' },
    { repeat: { pattern: '0 4 * * *' }, jobId: 'search-rebuild-cron' },
  );

  // Engine 5 Sprint 2 — notification triggers a cada 5 minutos
  await notificationTriggerQueue.add(
    'notification-trigger-cycle',
    {},
    { repeat: { pattern: '*/5 * * * *' }, jobId: 'notification-trigger-cron' },
  );

  // Engine 5 Sprint 4 — zone occupancy tick (cada 30s; BullMQ pattern não suporta segundos, usar every)
  await zoneOccupancyQueue.add(
    'zone-occupancy-tick',
    {},
    { repeat: { every: 30_000 }, jobId: 'zone-occupancy-tick-cron' },
  );

  // Engine 5 Sprint 6 — achievement evaluator às 5h
  await achievementEvaluatorQueue.add(
    'achievement-evaluator-daily',
    {},
    { repeat: { pattern: '0 5 * * *' }, jobId: 'achievement-evaluator-cron' },
  );

  logger.info('✅ Recurring jobs configurados');
}

export function setupQueueEvents(): void {
  const queues = [
    emailQueue,
    ticketEmissionQueue,
    paymentWebhookQueue,
    expireReservationsQueue,
    batchSwitchQueue,
    batchScheduleQueue,
    capacityAlertQueue,
    fraudDetectionQueue,
    checkinSyncQueue,
    pushQueue,
    postEventReviewQueue,
    postEventReportQueue,
    cleanupSessionsQueue,
    webhookOutboundQueue,
    searchSyncQueue,
    ledgerCloseQueue,
    lgpdExportQueue,
    notificationTriggerQueue,
    zoneOccupancyQueue,
    achievementEvaluatorQueue,
  ];
  for (const queue of queues) {
    const events = new QueueEvents(queue.name, { connection: redis });
    events.on('failed', ({ jobId, failedReason }) => {
      logger.error({ queue: queue.name, jobId, failedReason }, 'Job falhou');
    });
  }
}
