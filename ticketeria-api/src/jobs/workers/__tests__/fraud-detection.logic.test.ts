import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processFraudDetection } from '../fraud-detection.logic';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { logAudit } from '../../../shared/audit';

const input = {
  ticketId: 'ticket-1',
  ticketHash: 'hash-abc',
  eventId: 'event-1',
  operatorId: 'op-1',
};

describe('processFraudDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não flagga quando há apenas 1 check-in na janela', async () => {
    vi.mocked(prisma.checkinLog.count).mockResolvedValueOnce(1);

    const result = await processFraudDetection(input);

    expect(result.flagged).toBe(false);
    expect(result.recentCheckins).toBe(1);
    expect(logAudit).not.toHaveBeenCalled();
  });

  it('flagga + audita + emite socket quando 2+ check-ins em <60s', async () => {
    vi.mocked(prisma.checkinLog.count).mockResolvedValueOnce(2);
    vi.mocked(redis.set).mockResolvedValueOnce('OK'); // primeiro alerta (NX passou)
    vi.mocked(redis.publish).mockResolvedValueOnce(1);

    const result = await processFraudDetection(input);

    expect(result.flagged).toBe(true);
    expect(result.recentCheckins).toBe(2);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ticket.fraud_duplicate_detected',
        entityId: 'ticket-1',
        actorId: 'op-1',
      }),
    );
    expect(redis.publish).toHaveBeenCalled();
  });

  it('não re-alerta dentro da janela de dedup (NX falhou)', async () => {
    vi.mocked(prisma.checkinLog.count).mockResolvedValueOnce(3);
    vi.mocked(redis.set).mockResolvedValueOnce(null); // já alertado

    const result = await processFraudDetection(input);

    expect(result.flagged).toBe(true);
    expect(result.alreadyAlerted).toBe(true);
    expect(logAudit).not.toHaveBeenCalled();
    expect(redis.publish).not.toHaveBeenCalled();
  });
});
