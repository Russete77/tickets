import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../shared/logger';
import { logAudit, AuditActions } from '../../shared/audit';
import { publishBroadcast } from '../../shared/socketBridge';

export interface FraudDetectionInput {
  ticketId: string;
  ticketHash: string;
  eventId: string;
  operatorId: string;
}

export interface FraudDetectionResult {
  flagged: boolean;
  recentCheckins: number;
  alreadyAlerted?: boolean;
}

export const DUPLICATE_WINDOW_MS = 60_000;

/**
 * Detecta o mesmo ticket escaneado 2+ vezes em 60s (clonagem de QR).
 * Função pura de orquestração — testável sem instanciar BullMQ Worker.
 */
export async function processFraudDetection(
  data: FraudDetectionInput,
): Promise<FraudDetectionResult> {
  const { ticketId, ticketHash, eventId, operatorId } = data;

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const recentCheckins = await prisma.checkinLog.count({
    where: {
      ticketId,
      scannedAt: { gte: since },
    },
  });

  if (recentCheckins < 2) {
    return { flagged: false, recentCheckins };
  }

  // Dedup de alerta: 1 alerta por ticket a cada 5min
  const alertKey = `fraud:dup:${ticketId}`;
  const isFirstAlert = await redis.set(alertKey, '1', 'EX', 300, 'NX');
  if (!isFirstAlert) {
    return { flagged: true, recentCheckins, alreadyAlerted: true };
  }

  logger.warn(
    { ticketId, ticketHash, eventId, recentCheckins },
    '🚨 Fraude: múltiplos check-ins do mesmo ticket em <60s',
  );

  await logAudit({
    actorId: operatorId,
    action: AuditActions.TICKET_FRAUD_DUPLICATE_DETECTED,
    entityType: 'ticket',
    entityId: ticketId,
    metadata: {
      eventId,
      ticketHash,
      recentCheckins,
      windowMs: DUPLICATE_WINDOW_MS,
    },
  });

  await publishBroadcast(`event:${eventId}`, 'fraud_alert', {
    type: 'duplicate_checkin',
    ticketId,
    eventId,
    recentCheckins,
    detectedAt: new Date().toISOString(),
  }).catch(() => {});

  return { flagged: true, recentCheckins };
}
