import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckinService } from '../checkin.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { createMockTicket, createMockEvent } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

describe('CheckinService', () => {
  const checkinService = new CheckinService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateQR', () => {
    it('should validate valid ticket hash and TOTP', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
      });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await checkinService.validateQR({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
      });

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.ticket).toBeDefined();
    });

    it('should return invalid_hash for non-existent ticket', async () => {
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(null);

      const result = await checkinService.validateQR({
        ticketHash: 'invalid-hash',
        totpCode: '123456',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_hash');
    });

    it('should return invalid_totp for incorrect code', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
      });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);

      const result = await checkinService.validateQR({
        ticketHash: ticket.ticketHash,
        totpCode: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_totp');
    });

    it('should return already_used for checked-in ticket', async () => {
      const checkedInTicket = createMockTicket({
        ticketHash: 'abc123def456',
        checkedInAt: new Date(),
      });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(checkedInTicket as any);

      const result = await checkinService.validateQR({
        ticketHash: checkedInTicket.ticketHash,
        totpCode: '123456',
      });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('already_used');
    });

    it('should mark ticket as checked in on valid QR', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
        checkedInAt: null,
      });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        checkedInAt: new Date(),
      } as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await checkinService.validateQR({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
      });

      expect(result.valid).toBe(true);
      expect(prisma.ticket.update).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should store check-in event in Redis for real-time tracking', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
      });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        checkedInAt: new Date(),
      } as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      await checkinService.validateQR({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
      });

      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('getEventCapacity', () => {
    it('should return correct event capacity stats', async () => {
      const event = createMockEvent();

      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(50); // Total sold
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(25); // Checked in
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(10); // No-show (sold but not checked in within window)

      const result = await checkinService.getEventCapacity(event.id);

      expect(result).toBeDefined();
      expect(result.venueName).toBe(event.venueName);
      expect(result.totalCapacity).toBe(event.venueCapacity);
      expect(result.ticketsSold).toBe(50);
      expect(result.checkedIn).toBe(25);
    });

    it('should calculate no-show rate', async () => {
      const event = createMockEvent();

      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(100); // Total sold
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(80); // Checked in
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(20); // No-shows

      const result = await checkinService.getEventCapacity(event.id);

      expect(result.noShowRate).toBeDefined();
      expect(result.noShowRate).toBeGreaterThan(0);
    });

    it('should handle empty event', async () => {
      const event = createMockEvent();

      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0); // No tickets sold
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0); // No check-ins
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0); // No no-shows

      const result = await checkinService.getEventCapacity(event.id);

      expect(result.ticketsSold).toBe(0);
      expect(result.checkedIn).toBe(0);
    });

    it('should calculate remaining capacity', async () => {
      const event = createMockEvent({ venueCapacity: 1000 });

      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(300); // Total sold
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(250); // Checked in
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(50); // No-shows

      const result = await checkinService.getEventCapacity(event.id);

      expect(result.capacityRemaining).toBe(700); // 1000 - 300
    });
  });

  describe('bulkCheckIn', () => {
    it('should check in multiple tickets', async () => {
      const tickets = [
        createMockTicket({ ticketHash: 'hash1', totpSecret: 'secret1' }),
        createMockTicket({ ticketHash: 'hash2', totpSecret: 'secret2' }),
      ];

      vi.mocked(prisma.ticket.findUnique)
        .mockResolvedValueOnce(tickets[0] as any)
        .mockResolvedValueOnce(tickets[1] as any);

      vi.mocked(prisma.ticket.update)
        .mockResolvedValueOnce({ ...tickets[0], checkedInAt: new Date() } as any)
        .mockResolvedValueOnce({ ...tickets[1], checkedInAt: new Date() } as any);

      vi.mocked(redis.setex).mockResolvedValue('OK');

      const result = await (checkinService as any).bulkCheckIn([
        { ticketHash: 'hash1', totpCode: '123456' },
        { ticketHash: 'hash2', totpCode: '123456' },
      ]);

      expect(result).toBeDefined();
      expect(result.successful).toBe(2);
    });

    it('should handle partial failures in bulk check-in', async () => {
      const validTicket = createMockTicket({ ticketHash: 'hash1' });

      vi.mocked(prisma.ticket.findUnique)
        .mockResolvedValueOnce(validTicket as any)
        .mockResolvedValueOnce(null); // Second ticket not found

      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...validTicket,
        checkedInAt: new Date(),
      } as any);

      vi.mocked(redis.setex).mockResolvedValue('OK');

      const result = await (checkinService as any).bulkCheckIn([
        { ticketHash: 'hash1', totpCode: '123456' },
        { ticketHash: 'invalid', totpCode: '123456' },
      ]);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getRealtimeStats', () => {
    it('should return real-time event statistics', async () => {
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce('{"checkedIn": 150}');

      const result = await (checkinService as any).getRealtimeStats(event.id);

      expect(result).toBeDefined();
      expect(result.checkedIn).toBe(150);
    });

    it('should calculate check-in rate', async () => {
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce('{"checkedIn": 500, "ticketsSold": 1000}');

      const result = await (checkinService as any).getRealtimeStats(event.id);

      expect(result.checkInRate).toBeDefined();
      expect(result.checkInRate).toBeLessThanOrEqual(100);
    });
  });
});
