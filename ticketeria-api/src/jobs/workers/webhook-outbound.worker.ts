/**
 * Worker: entrega webhooks outbound com retry exponencial.
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { Worker, Job, UnrecoverableError } from 'bullmq';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { WebhookOutboundService } from '../../modules/webhooks-outbound/webhook-outbound.service';

interface DeliveryJob {
  deliveryId: string;
}

export const webhookOutboundWorker = new Worker<DeliveryJob>(
  'webhook-outbound',
  async (job: Job<DeliveryJob>) => {
    const { ok, status } = await WebhookOutboundService.attemptDelivery(job.data.deliveryId);
    if (!ok) {
      // Status 4xx (exceto 408/429): não retry — endpoint configurado errado.
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        throw new UnrecoverableError(`Webhook 4xx (${status}) — não retry`);
      }
      throw new Error(`Webhook delivery falhou (status=${status ?? 'n/a'})`);
    }
    logger.debug({ deliveryId: job.data.deliveryId }, 'webhook delivered');
  },
  { connection: redis, concurrency: 8 },
);
