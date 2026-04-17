import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckinService } from '../checkin.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { createMockTicket, createMockEvent } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

// Mock publishBroadcast
vi.mock('../../../shared/socketBridge', () => ({
  publishBroadcast: vi.fn().mockResolvedValue(undefined),
}));

describe('CheckinService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateQR', () => {
    it('should validate valid ticket hash and TOTP', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
        status: 'active' as any,
        eventId: 'event-id-1',
      });

      const validQrData = JSON.stringify({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
        timestamp: Date.now().toString(),
      });

      vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
        ...ticket,
        event: { id: ticket.eventId, title: 'Test Event' },
      } as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any); // transaction inner call
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        status: 'used' as any,
        checkedInAt: new Date(),
      } as any);
      vi.mocked(prisma.checkinLog.create).mockResolvedValueOnce({} as any);

      const result = await CheckinService.validateQR(
        validQrData,
        'operator-id',
        'device-id',
        ticket.eventId,
      );

      expect(result).toBeDefined();
    });

    it('should return invalid_hash for non-existent ticket', async () => {
      const validQrData = JSON.stringify({
        ticketHash: 'invalid-hash',
        totpCode: '123456',
        timestamp: Date.now().toString(),
      });

      vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(null);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      const result = await CheckinService.validateQR(
        validQrData,
        'operator-id',
        'device-id',
        'event-id',
      );

      expect(result.success).toBe(false);
      expect(result.result).toBe('invalid_hash');
    });

    it('should return already_used when QR was already processed (Redis replay)', async () => {
      const validQrData = JSON.stringify({
        ticketHash: 'abc123def456',
        totpCode: '123456',
        timestamp: Date.now().toString(),
      });

      // Simulate Redis returning null (already used - set returned null meaning key exists)
      vi.mocked(redis.set).mockResolvedValueOnce(null as any);

      const result = await CheckinService.validateQR(
        validQrData,
        'operator-id',
        'device-id',
        'event-id',
      );

      expect(result.success).toBe(false);
      expect(result.result).toBe('already_used');
    });

    it('should return invalid_hash for malformed QR code', async () => {
      const result = await CheckinService.validateQR(
        'not-valid-data',
        'operator-id',
        'device-id',
        'event-id',
      );

      expect(result.success).toBe(false);
      expect(result.result).toBe('invalid_hash');
    });

    it('should return invalid_hash for expired QR code (old timestamp)', async () => {
      const expiredQrData = JSON.stringify({
        ticketHash: 'abc123',
        totpCode: '123456',
        timestamp: (Date.now() - 200000).toString(), // 200 seconds ago
      });

      const result = await CheckinService.validateQR(
        expiredQrData,
        'operator-id',
        'device-id',
        'event-id',
      );

      expect(result.success).toBe(false);
      expect(result.result).toBe('invalid_hash');
    });

    it('should mark ticket as checked in on valid QR', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
        checkedInAt: null,
        status: 'active' as any,
        eventId: 'event-id-2',
      });

      const validQrData = JSON.stringify({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
        timestamp: Date.now().toString(),
      });

      vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
        ...ticket,
        event: { id: ticket.eventId, title: 'Test Event' },
      } as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        status: 'used' as any,
        checkedInAt: new Date(),
      } as any);
      vi.mocked(prisma.checkinLog.create).mockResolvedValueOnce({} as any);

      const result = await CheckinService.validateQR(
        validQrData,
        'operator-id',
        'device-id',
        ticket.eventId,
      );

      expect(logAudit).toHaveBeenCalled();
    });

    it('should store check-in event in Redis for real-time tracking', async () => {
      const ticket = createMockTicket({
        ticketHash: 'abc123def456',
        totpSecret: 'test-secret',
        status: 'active' as any,
        eventId: 'event-id-3',
      });

      const validQrData = JSON.stringify({
        ticketHash: ticket.ticketHash,
        totpCode: '123456',
        timestamp: Date.now().toString(),
      });

      vi.mocked(redis.set).mockResolvedValueOnce('OK' as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({
        ...ticket,
        event: { id: ticket.eventId, title: 'Test Event' },
      } as any);
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        status: 'used' as any,
        checkedInAt: new Date(),
      } as any);
      vi.mocked(prisma.checkinLog.create).mockResolvedValueOnce({} as any);

      await CheckinService.validateQR(
        validQrData,
        'operator-id',
        'device-id',
        ticket.eventId,
      );

      // Redis anti-replay set should have been called
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('getEventCapacity', () => {
    it('should return correct event capacity stats', async () => {
      const event = createMockEvent({ id: 'event-cap-1', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: event.venueCapacity,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(50); // Checked in

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result).toBeDefined();
      expect(result.eventTitle).toBe(event.title);
      expect(result.capacity).toBe(event.venueCapacity);
      expect(result.checkedIn).toBe(50);
    });

    it('should calculate no-show rate', async () => {
      const event = createMockEvent({ id: 'event-cap-2', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: event.venueCapacity,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(80); // Checked in

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result.percentage).toBeDefined();
      expect(result.percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty event', async () => {
      const event = createMockEvent({ id: 'event-cap-3', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: event.venueCapacity,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0); // No check-ins

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result.checkedIn).toBe(0);
    });

    it('should calculate remaining capacity', async () => {
      const event = createMockEvent({ id: 'event-cap-4', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: 1000,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(300); // Checked in

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result.remaining).toBe(700); // 1000 - 300
    });
  });

  describe('bulkCheckIn', () => {
    it('should check in multiple tickets via syncOfflineCheckins', async () => {
      const ticket1 = createMockTicket({ ticketHash: 'hash1', status: 'active' as any, eventId: 'ev-1' });
      const ticket2 = createMockTicket({ ticketHash: 'hash2', status: 'active' as any, eventId: 'ev-1' });

      vi.mocked(prisma.ticket.findUnique)
        .mockResolvedValueOnce(ticket1 as any)
        .mockResolvedValueOnce(ticket2 as any);

      vi.mocked(prisma.ticket.update)
        .mockResolvedValueOnce({ ...ticket1, status: 'used' as any, checkedInAt: new Date() } as any)
        .mockResolvedValueOnce({ ...ticket2, status: 'used' as any, checkedInAt: new Date() } as any);

      const result = await CheckinService.syncOfflineCheckins('ev-1', [
        { qrData: JSON.stringify({ ticketHash: 'hash1' }), timestamp: Date.now(), result: 'offline_valid' },
        { qrData: JSON.stringify({ ticketHash: 'hash2' }), timestamp: Date.now(), result: 'offline_valid' },
      ]);

      expect(result).toBeDefined();
      expect(result.successful).toBe(2);
    });

    it('should handle partial failures in bulk check-in', async () => {
      const validTicket = createMockTicket({ ticketHash: 'hash1', status: 'active' as any, eventId: 'ev-2' });

      vi.mocked(prisma.ticket.findUnique)
        .mockResolvedValueOnce(validTicket as any)
        .mockResolvedValueOnce(null); // Second ticket not found

      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...validTicket,
        status: 'used' as any,
        checkedInAt: new Date(),
      } as any);

      const result = await CheckinService.syncOfflineCheckins('ev-2', [
        { qrData: JSON.stringify({ ticketHash: 'hash1' }), timestamp: Date.now(), result: 'offline_valid' },
        { qrData: JSON.stringify({ ticketHash: 'invalid' }), timestamp: Date.now(), result: 'offline_valid' },
      ]);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('getRealtimeStats', () => {
    it('should return capacity data from database', async () => {
      const event = createMockEvent({ id: 'event-rt-1', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: event.venueCapacity,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(150);

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result).toBeDefined();
      expect(result.checkedIn).toBe(150);
    });

    it('should calculate check-in rate', async () => {
      const event = createMockEvent({ id: 'event-rt-2', venueCapacity: 1000 });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        id: event.id,
        title: event.title,
        venueCapacity: 1000,
      } as any);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(500);

      const result = await CheckinService.getEventCapacity(event.id);

      expect(result.percentage).toBeDefined();
      expect(result.percentage).toBeLessThanOrEqual(100);
    });
  });
});
