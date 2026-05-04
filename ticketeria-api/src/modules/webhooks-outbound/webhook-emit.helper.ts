/**
 * Helper para emitir webhook resolvendo organizationId a partir do contexto.
 *
 * Durante a migração multi-tenant, `Event.organizationId` pode ser null
 * (eventos legados). Nesses casos resolvemos via `Producer → Organization`.
 *
 * Auditoria CTO 2026-05 — wire-up phase
 */
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { WebhookEventType } from '../../generated/prisma/client';
import { WebhookOutboundService } from './webhook-outbound.service';

const ORG_CACHE = new Map<string, string | null>();

/**
 * Resolve organizationId a partir de um Event.
 * Cacheado em memória do processo (TTL implícito = vida do processo).
 */
export async function resolveOrgIdFromEvent(eventId: string): Promise<string | null> {
  if (ORG_CACHE.has(eventId)) return ORG_CACHE.get(eventId)!;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizationId: true, producerId: true },
  });
  if (!event) {
    ORG_CACHE.set(eventId, null);
    return null;
  }

  if (event.organizationId) {
    ORG_CACHE.set(eventId, event.organizationId);
    return event.organizationId;
  }

  // Fallback: producerId aponta para User. Achar Producer via userId, depois Organization legacy.
  const producer = await prisma.producer.findUnique({
    where: { userId: event.producerId },
    select: { id: true },
  });
  if (!producer) {
    ORG_CACHE.set(eventId, null);
    return null;
  }
  const org = await prisma.organization.findFirst({
    where: { legacyProducerId: producer.id },
    select: { id: true },
  });
  const orgId = org?.id ?? null;
  ORG_CACHE.set(eventId, orgId);
  return orgId;
}

/**
 * Emit não-bloqueante: nunca lança. Loga em erro e segue.
 * Usar nos hot paths de domínio (checkout, checkin, cashless) onde
 * webhook não pode quebrar o fluxo principal.
 */
export async function emitWebhookSafe(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
  eventId: string,
  idempotencyKey?: string,
): Promise<void> {
  try {
    const organizationId = await resolveOrgIdFromEvent(eventId);
    if (!organizationId) {
      logger.debug({ eventId, eventType }, 'webhook skipped — sem organizationId');
      return;
    }
    await WebhookOutboundService.emit(eventType, payload, organizationId, idempotencyKey);
  } catch (err) {
    logger.error({ err, eventType, eventId }, 'emitWebhookSafe falhou — ignorado');
  }
}

/** Versão para quando organizationId já é conhecido (admin endpoints). */
export async function emitWebhookForOrg(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
  organizationId: string,
  idempotencyKey?: string,
): Promise<void> {
  try {
    await WebhookOutboundService.emit(eventType, payload, organizationId, idempotencyKey);
  } catch (err) {
    logger.error({ err, eventType, organizationId }, 'emitWebhookForOrg falhou');
  }
}
