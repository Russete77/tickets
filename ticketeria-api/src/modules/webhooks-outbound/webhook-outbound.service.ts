/**
 * Webhook outbound — emissão de eventos do domínio para subscribers externos.
 *
 * Fluxo:
 *   1. Domínio chama `WebhookOutboundService.emit('order.paid', payload, orgId)`.
 *   2. Service cria N WebhookDelivery em status `pending` (1 por subscription ativa).
 *   3. Worker `webhook-outbound.worker.ts` processa pendentes com retry exponencial.
 *   4. Cada POST inclui:
 *        - X-PulsePass-Event: <event_type>
 *        - X-PulsePass-Delivery: <delivery_id>
 *        - X-PulsePass-Signature: sha256=<hmac>
 *
 * Auditoria CTO 2026-05 — gap 4.10
 */
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { webhookOutboundQueue } from '../../jobs/queue';
import { logger } from '../../shared/logger';
import { WebhookEventType } from '../../generated/prisma/client';

export class WebhookOutboundService {
  /**
   * Cria entregas pendentes para uma org. Idempotente por `idempotencyKey`.
   */
  static async emit<T extends Record<string, unknown>>(
    eventType: WebhookEventType,
    payload: T,
    organizationId: string,
    idempotencyKey?: string,
  ): Promise<{ enqueued: number }> {
    const subs = await prisma.webhookSubscription.findMany({
      where: {
        organizationId,
        isActive: true,
        eventTypes: { has: eventType },
      },
    });

    if (subs.length === 0) return { enqueued: 0 };

    const wrappedPayload = {
      type: eventType,
      organizationId,
      idempotencyKey,
      timestamp: new Date().toISOString(),
      data: payload,
    };

    let enqueued = 0;
    for (const sub of subs) {
      const delivery = await prisma.webhookDelivery.create({
        data: {
          subscriptionId: sub.id,
          eventType,
          payload: wrappedPayload,
          status: 'pending',
          nextAttemptAt: new Date(),
        },
      });
      await webhookOutboundQueue.add(
        'deliver',
        { deliveryId: delivery.id },
        {
          jobId: delivery.id,
          attempts: 8,
          backoff: { type: 'exponential', delay: 30_000 }, // 30s, 1m, 2m, 4m...
        },
      );
      enqueued += 1;
    }

    logger.debug({ eventType, organizationId, enqueued }, 'webhook outbound emitted');
    return { enqueued };
  }

  /** Assina payload com HMAC SHA256 — header Stripe-style. */
  static sign(secret: string, body: string): string {
    return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  /** Tentativa única de delivery — chamada pelo worker. */
  static async attemptDelivery(deliveryId: string): Promise<{ ok: boolean; status?: number }> {
    const delivery = await prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { subscription: true },
    });
    if (!delivery) return { ok: false };
    if (delivery.status === 'delivered' || delivery.status === 'abandoned') {
      return { ok: true };
    }

    const body = JSON.stringify(delivery.payload);
    const signature = this.sign(delivery.subscription.secret, body);

    let status: number | undefined;
    let ok = false;
    try {
      const res = await fetch(delivery.subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PulsePass-Webhook/1.0',
          'X-PulsePass-Event': delivery.eventType,
          'X-PulsePass-Delivery': delivery.id,
          'X-PulsePass-Signature': signature,
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      status = res.status;
      ok = res.status >= 200 && res.status < 300;
    } catch (err) {
      logger.warn(
        { err, deliveryId, url: delivery.subscription.url },
        'webhook delivery falhou',
      );
    }

    const attempts = delivery.attempts + 1;
    const finalStatus = ok ? 'delivered' : attempts >= 8 ? 'abandoned' : 'failed';

    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: finalStatus,
        attempts,
        responseStatus: status,
        deliveredAt: ok ? new Date() : undefined,
        nextAttemptAt: ok || finalStatus === 'abandoned' ? null : new Date(),
        lastError: ok ? null : `HTTP ${status ?? 'timeout'}`,
      },
    });

    return { ok, status };
  }
}
