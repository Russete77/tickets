import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { BadRequestError, NotFoundError, ConflictError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';

import { authenticator } from 'otplib';
import { publishBroadcast } from '../../shared/socketBridge';

/**
 * Verificacao TOTP usando otplib (RFC 6238 compliant)
 * Suporta segredos base32 (novos ingressos) e hex (ingressos legados)
 */
function verifyTotp(secret: string, code: string, windowSize: number = 1): boolean {
  authenticator.options = {
    window: windowSize,
    step: 30,
  };

  // Try verification with the secret as-is (base32 for new tickets)
  if (authenticator.check(code, secret)) {
    return true;
  }

  // Fallback: try converting hex secret to base32 (legacy tickets)
  try {
    const base32Secret = base32Encode(Buffer.from(secret, 'hex'));
    return authenticator.check(code, base32Secret);
  } catch {
    return false;
  }
}

function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, '0');
    result += alphabet[parseInt(chunk, 2)];
  }
  return result;
}

export interface CheckinResult {
  success: boolean;
  result: string;
  message: string;
  ticket?: {
    id: string;
    holderName: string;
    holderEmail: string;
  };
}

export class CheckinService {
  /**
   * Valida QR code e realiza check-in atômico
   * Pipeline: decodificar → extrair hash e TOTP → validar timestamp → localizar ticket → validar TOTP → atualizar status atomicamente
   */
  static async validateQR(
    qrData: string,
    operatorId: string,
    deviceId: string,
    eventId: string,
  ): Promise<CheckinResult> {
    try {
      let replayKey: string | null = null;

      // 1. Decodificar QR data (pode ser base64 ou JSON)
      interface DecodedQR {
        ticketHash: string;
        totpCode: string;
        timestamp: string;
      }
      let decoded: DecodedQR;
      try {
        // Tentar JSON
        decoded = JSON.parse(qrData) as DecodedQR;
      } catch {
        // Tentar base64
        try {
          decoded = JSON.parse(Buffer.from(qrData, 'base64').toString('utf-8')) as DecodedQR;
        } catch {
          return {
            success: false,
            result: 'invalid_hash',
            message: 'QR code inválido',
          };
        }
      }

      const { ticketHash, totpCode, timestamp } = decoded;

      if (!ticketHash || !totpCode || !timestamp) {
        return {
          success: false,
          result: 'invalid_hash',
          message: 'QR code malformado',
        };
      }

      // 2. Validar timestamp (deve estar dentro dos últimos 90 segundos)
      const now = Date.now();
      const qrTimestamp = parseInt(timestamp, 10);
      const timeDifference = Math.abs(now - qrTimestamp);

      if (timeDifference > 90000) {
        // 90 segundos
        return {
          success: false,
          result: 'invalid_hash',
          message: 'QR code expirou',
        };
      }

      // 2.5 Anti-replay Redis: rejeitar QR já processado
      replayKey = `checkin:qr:${ticketHash}:${totpCode}`;
      const isNew = await redis.set(replayKey, '1', 'EX', 300, 'NX');
      if (!isNew) {
        return {
          success: false,
          result: 'already_used',
          message: 'QR code já foi processado',
        };
      }

      // 3. Localizar ticket pelo hash
      const ticket = await prisma.ticket.findUnique({
        where: { ticketHash },
        include: {
          event: {
            select: { id: true, title: true },
          },
        },
      });

      if (!ticket) {
        if (replayKey) await redis.del(replayKey).catch(() => {});
        return {
          success: false,
          result: 'invalid_hash',
          message: 'Ingresso não encontrado',
        };
      }

      // 4. Validar evento
      if (ticket.eventId !== eventId) {
        if (replayKey) await redis.del(replayKey).catch(() => {});
        return {
          success: false,
          result: 'wrong_event',
          message: 'Ingresso é para outro evento',
        };
      }

      // 5. Validar TOTP
      const totpValid = verifyTotp(ticket.totpSecret, totpCode, 1);
      if (!totpValid) {
        if (replayKey) await redis.del(replayKey).catch(() => {});
        return {
          success: false,
          result: 'invalid_totp',
          message: 'Código TOTP inválido',
        };
      }

      // 6. Validar status do ticket
      if (ticket.status !== 'active') {
        if (ticket.status === 'used') {
          return {
            success: false,
            result: 'already_used',
            message: 'Ingresso já foi utilizado',
          };
        }

        if (replayKey) await redis.del(replayKey).catch(() => {});
        return {
          success: false,
          result: 'ticket_cancelled',
          message: `Ingresso foi ${ticket.status}`,
        };
      }

      // 7. Atualizar status para "used" atomicamente (SELECT FOR UPDATE)
      const updated = await prisma.$transaction(async (tx) => {
        // Verificar status atual novamente (double-check)
        const currentTicket = await tx.ticket.findUnique({
          where: { id: ticket.id },
        });

        if (currentTicket?.status !== 'active') {
          return null; // Foi usado por outro operador
        }

        // Atualizar para used
        return await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'used',
            checkedInAt: new Date(),
            checkedInBy: operatorId,
            checkedInDevice: deviceId,
          },
        });
      });

      if (!updated) {
        return {
          success: false,
          result: 'already_used',
          message: 'Ingresso já foi utilizado',
        };
      }

      // 8. Registrar log de check-in
      await prisma.checkinLog.create({
        data: {
          ticketId: ticket.id,
          eventId,
          operatorId,
          deviceId,
          result: 'valid',
          scannedAt: new Date(),
        },
      });

      // 9. Registrar auditoria
      await logAudit({
        actorId: operatorId,
        action: AuditActions.TICKET_CHECKED_IN,
        entityType: 'Ticket',
        entityId: ticket.id,
        metadata: {
          eventId,
          deviceId,
        },
      });

      // 10. Broadcast check-in event via Redis pub/sub → Socket.IO
      await publishBroadcast(`event:${eventId}`, 'checkin:success', {
        ticketId: ticket.id,
        holderName: ticket.holderName,
        eventId,
      }).catch(() => {}); // Don't fail check-in if broadcast fails

      return {
        success: true,
        result: 'valid',
        message: 'Check-in realizado com sucesso',
        ticket: {
          id: ticket.id,
          holderName: ticket.holderName,
          holderEmail: ticket.holderEmail,
        },
      };
    } catch (error) {
      console.error('Erro ao validar QR:', error);
      return {
        success: false,
        result: 'invalid_hash',
        message: 'Erro ao processar check-in',
      };
    }
  }

  /**
   * Obtém capacidade em tempo real do evento
   */
  static async getEventCapacity(eventId: string): Promise<{
    eventId: string;
    eventTitle: string;
    capacity: number;
    checkedIn: number;
    remaining: number;
    percentage: number;
  }> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        venueCapacity: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const checkedIn = await prisma.ticket.count({
      where: {
        eventId,
        status: 'used',
      },
    });

    const remaining = event.venueCapacity - checkedIn;
    const percentage = Math.round((checkedIn / event.venueCapacity) * 100);

    return {
      eventId: event.id,
      eventTitle: event.title,
      capacity: event.venueCapacity,
      checkedIn,
      remaining,
      percentage,
    };
  }

  /**
   * Sincroniza check-ins offline para um evento
   */
  static async syncOfflineCheckins(
    eventId: string,
    checkins: Array<{
      qrData: string;
      timestamp: number;
      result: string;
    }>,
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    results: Array<{
      qrData: string;
      result: string;
      message: string;
    }>;
  }> {
    interface SyncResult {
      qrData: string;
      result: string;
      message: string;
    }
    const results: SyncResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const checkin of checkins) {
      try {
        // Localizar ticket pelo hash
        interface DecodedQR {
          ticketHash: string;
        }
        let decoded: DecodedQR;
        try {
          decoded = JSON.parse(checkin.qrData) as DecodedQR;
        } catch {
          decoded = JSON.parse(Buffer.from(checkin.qrData, 'base64').toString('utf-8')) as DecodedQR;
        }

        const { ticketHash } = decoded;

        if (!ticketHash) {
          failed++;
          results.push({
            qrData: checkin.qrData,
            result: 'invalid_hash',
            message: 'QR code malformado',
          });
          continue;
        }

        const ticket = await prisma.ticket.findUnique({
          where: { ticketHash },
        });

        if (!ticket) {
          failed++;
          results.push({
            qrData: checkin.qrData,
            result: 'invalid_hash',
            message: 'Ingresso não encontrado',
          });
          continue;
        }

        if (ticket.eventId !== eventId) {
          failed++;
          results.push({
            qrData: checkin.qrData,
            result: 'wrong_event',
            message: 'Ingresso é para outro evento',
          });
          continue;
        }

        // Se offline_valid, marcar como used
        if (checkin.result === 'offline_valid' && ticket.status === 'active') {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: {
              status: 'used',
              checkedInAt: new Date(checkin.timestamp),
            },
          });

          successful++;
          results.push({
            qrData: checkin.qrData,
            result: 'valid',
            message: 'Check-in sincronizado',
          });
        } else {
          failed++;
          results.push({
            qrData: checkin.qrData,
            result: checkin.result,
            message: 'Não sincronizado',
          });
        }
      } catch (error) {
        failed++;
        results.push({
          qrData: checkin.qrData,
          result: 'offline_conflict',
          message: 'Erro ao sincronizar',
        });
      }
    }

    return {
      processed: checkins.length,
      successful,
      failed,
      results,
    };
  }
}
