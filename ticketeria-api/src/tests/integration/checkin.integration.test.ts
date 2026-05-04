import { describe, it, expect, beforeEach } from 'vitest';
import { authenticator } from 'otplib';
import './setup';
import {
  createTestUser,
  createTestEvent,
  createTestBatch,
  createTestOrder,
  createTestTicket,
} from './helpers';
import { getTestPrisma } from './setup';
import { CheckinService } from '../../modules/checkin/checkin.service';
import { redis } from '../../config/redis';

/**
 * Cobertura crítica do fluxo de check-in:
 *   1. TOTP válido → ticket vai para `used`.
 *   2. Mesmo QR escaneado duas vezes → segunda rejeitada por anti-replay (Redis).
 *   3. TOTP inválido → rejeição sem alterar ticket.
 *   4. Ticket de outro evento → rejeição.
 *   5. Ticket cancelado/refundado → rejeição.
 */

const buildQRPayload = (ticketHash: string, totpSecret: string): string => {
  authenticator.options = { window: 1, step: 30 };
  const totpCode = authenticator.generate(totpSecret);
  return JSON.stringify({
    ticketHash,
    totpCode,
    timestamp: String(Date.now()),
  });
};

describe('Checkin Integration: anti-replay & ticket lifecycle', () => {
  beforeEach(async () => {
    // Limpa replay-keys do Redis para evitar interferência entre testes
    const keys = await redis.keys('checkin:qr:*');
    if (keys.length > 0) await redis.del(...keys);
  });

  it('should mark ticket as used on first valid scan', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const event = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, event.id);
    const order = await createTestOrder(prisma, holder.id, event.id, { status: 'paid' });

    const totpSecret = 'JBSWY3DPEHPK3PXP'; // base32 (otplib RFC 6238)
    const ticket = await createTestTicket(prisma, order.id, event.id, batch.id, holder.id, {
      totpSecret,
    });

    const qrData = buildQRPayload(ticket.ticketHash, totpSecret);
    const result = await CheckinService.validateQR(qrData, operator.id, 'device-1', event.id);

    expect(result.success).toBe(true);
    expect(result.result).toBe('valid');

    const updated = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(updated?.status).toBe('used');
    expect(updated?.checkedInAt).toBeTruthy();
  });

  it('should reject second scan of same QR (anti-replay)', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const event = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, event.id);
    const order = await createTestOrder(prisma, holder.id, event.id, { status: 'paid' });

    const totpSecret = 'JBSWY3DPEHPK3PXP';
    const ticket = await createTestTicket(prisma, order.id, event.id, batch.id, holder.id, {
      totpSecret,
    });

    const qrData = buildQRPayload(ticket.ticketHash, totpSecret);

    // 1ª leitura: aceita
    const first = await CheckinService.validateQR(qrData, operator.id, 'device-1', event.id);
    expect(first.success).toBe(true);

    // 2ª leitura do MESMO QR: rejeitada por anti-replay (Redis SET NX)
    const second = await CheckinService.validateQR(qrData, operator.id, 'device-2', event.id);
    expect(second.success).toBe(false);
    expect(second.result).toBe('already_used');
  });

  it('should reject invalid TOTP code', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const event = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, event.id);
    const order = await createTestOrder(prisma, holder.id, event.id, { status: 'paid' });
    const ticket = await createTestTicket(prisma, order.id, event.id, batch.id, holder.id, {
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });

    const qrData = JSON.stringify({
      ticketHash: ticket.ticketHash,
      totpCode: '000000', // claramente inválido
      timestamp: String(Date.now()),
    });

    const result = await CheckinService.validateQR(qrData, operator.id, 'device-1', event.id);
    expect(result.success).toBe(false);
    expect(result.result).toBe('invalid_totp');

    // Ticket continua active (não foi alterado)
    const stillActive = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(stillActive?.status).toBe('active');
  });

  it('should reject ticket from a different event', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const eventA = await createTestEvent(prisma, producer.id, { status: 'published' });
    const eventB = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, eventA.id);
    const order = await createTestOrder(prisma, holder.id, eventA.id, { status: 'paid' });
    const ticket = await createTestTicket(prisma, order.id, eventA.id, batch.id, holder.id, {
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });

    const qrData = buildQRPayload(ticket.ticketHash, 'JBSWY3DPEHPK3PXP');
    const result = await CheckinService.validateQR(qrData, operator.id, 'device-1', eventB.id);

    expect(result.success).toBe(false);
    expect(result.result).toBe('wrong_event');
  });

  it('should reject expired QR (timestamp > 90s ago)', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const event = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, event.id);
    const order = await createTestOrder(prisma, holder.id, event.id, { status: 'paid' });
    const ticket = await createTestTicket(prisma, order.id, event.id, batch.id, holder.id, {
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });

    const qrData = JSON.stringify({
      ticketHash: ticket.ticketHash,
      totpCode: '123456',
      timestamp: String(Date.now() - 120_000), // 2 minutos atrás
    });

    const result = await CheckinService.validateQR(qrData, operator.id, 'device-1', event.id);
    expect(result.success).toBe(false);
    expect(result.result).toBe('invalid_hash');
    expect(result.message).toMatch(/expirou/i);
  });

  it('should reject already-used ticket on legitimate retry', async () => {
    const prisma = getTestPrisma();

    const { user: producer } = await createTestUser(prisma, { role: 'producer' });
    const { user: holder } = await createTestUser(prisma);
    const { user: operator } = await createTestUser(prisma, { role: 'producer' });

    const event = await createTestEvent(prisma, producer.id, { status: 'published' });
    const batch = await createTestBatch(prisma, event.id);
    const order = await createTestOrder(prisma, holder.id, event.id, { status: 'paid' });
    const ticket = await createTestTicket(prisma, order.id, event.id, batch.id, holder.id, {
      status: 'used',
      totpSecret: 'JBSWY3DPEHPK3PXP',
    });

    const qrData = buildQRPayload(ticket.ticketHash, 'JBSWY3DPEHPK3PXP');
    const result = await CheckinService.validateQR(qrData, operator.id, 'device-1', event.id);

    expect(result.success).toBe(false);
    expect(result.result).toBe('already_used');
  });
});
