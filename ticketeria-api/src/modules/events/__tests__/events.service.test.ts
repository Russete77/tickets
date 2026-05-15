import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventStatus } from '../../../generated/prisma/client';
import { EventsService } from '../events.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { createMockEvent, createMockUser, createMockProducer, createMockTicketBatch } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

describe('EventsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an event with batches in transaction', async () => {
      const producer = createMockProducer();
      const mockEvent = createMockEvent({ producerId: producer.id });

      const createInput = {
        title: 'New Event',
        description: 'Test event',
        shortDescription: 'Test',
        category: 'Music',
        venueName: 'Test Venue',
        venueAddress: '123 Street',
        venueLat: 23.5505,
        venueLng: -46.6333,
        venueCapacity: 1000,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000).toISOString(), // 1 hour before startsAt
        coverImageUrl: 'https://example.com/image.jpg',
        tags: ['music'],
        ageRating: 'Livre',
        dressCode: 'casual',
        isOpenBar: false,
        lineup: ['DJ XYZ'],
        rules: 'No outside drinks',
        maxTicketsPerCpf: 4,
        batches: [
          {
            name: 'Lote 1',
            priceCents: 10000,
            quantity: 100,
            type: 'regular',
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            autoSwitch: true,
          },
        ],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(producer);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValueOnce({
        organizationId: 'org-1',
        userId: producer.id,
      } as any);
      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.event.create).mockResolvedValueOnce(mockEvent);
      vi.mocked(prisma.ticketBatch.create).mockResolvedValueOnce({} as any);
      vi.mocked(redis.del).mockResolvedValue(1);

      const result = await EventsService.create(producer.id, createInput as any);

      expect(result).toEqual(mockEvent);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw BadRequestError if endsAt is before startsAt', async () => {
      const producer = createMockProducer();
      const now = new Date();

      const createInput = {
        title: 'Invalid Event',
        description: 'Test',
        shortDescription: 'Test',
        category: 'Music',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: 23.5505,
        venueLng: -46.6333,
        venueCapacity: 1000,
        startsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Before startsAt
        batches: [],
      };

      await expect(EventsService.create(producer.id, createInput as any)).rejects.toThrow(
        BadRequestError
      );
    });

    it('should throw BadRequestError if doorsOpenAt is after startsAt', async () => {
      const producer = createMockProducer();
      const now = new Date();

      const createInput = {
        title: 'Invalid Event',
        description: 'Test',
        shortDescription: 'Test',
        category: 'Music',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: 23.5505,
        venueLng: -46.6333,
        venueCapacity: 1000,
        startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        doorsOpenAt: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString(), // After startsAt
        batches: [],
      };

      await expect(EventsService.create(producer.id, createInput as any)).rejects.toThrow(
        BadRequestError
      );
    });

    it('should throw NotFoundError if producer does not exist', async () => {
      const createInput = {
        title: 'Event',
        description: 'Test',
        shortDescription: 'Test',
        category: 'Music',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: 23.5505,
        venueLng: -46.6333,
        venueCapacity: 1000,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        batches: [],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      await expect(EventsService.create('nonexistent', createInput as any)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should generate unique slug when duplicate exists', async () => {
      const producer = createMockProducer();
      const mockEvent = createMockEvent({ producerId: producer.id });

      const createInput = {
        title: 'Test Event',
        description: 'Test',
        shortDescription: 'Test',
        category: 'Music',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: 23.5505,
        venueLng: -46.6333,
        venueCapacity: 1000,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        batches: [],
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(producer);
      vi.mocked(prisma.organizationMember.findFirst).mockResolvedValueOnce({
        organizationId: 'org-1',
        userId: producer.id,
      } as any);
      // First call returns existing event, subsequent calls return null
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce(mockEvent) // Slug exists
        .mockResolvedValueOnce(null); // New slug is unique
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.event.create).mockResolvedValueOnce(mockEvent);
      vi.mocked(redis.del).mockResolvedValue(1);

      const result = await EventsService.create(producer.id, createInput as any);

      expect(result).toBeDefined();
      expect(prisma.event.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBySlug', () => {
    it('should return cached event from Redis', async () => {
      const mockEvent = createMockEvent();
      const cachedEvent = JSON.stringify({ ...mockEvent, reviewCount: 0 });

      // Service uses key `event:slug:${slug}` not `event:${slug}`
      vi.mocked(redis.get).mockResolvedValueOnce(cachedEvent);

      const result = await EventsService.getBySlug(mockEvent.slug);

      expect(result).toBeDefined();
      expect(redis.get).toHaveBeenCalledWith(`event:slug:${mockEvent.slug}`);
    });

    it('should fetch from database and cache if not in Redis', async () => {
      const mockEvent = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        ...mockEvent,
        batches: [],
      } as any);
      vi.mocked(prisma.eventReview.count).mockResolvedValueOnce(5);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await EventsService.getBySlug(mockEvent.slug);

      expect(result).toBeDefined();
      expect(prisma.event.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: mockEvent.slug },
          include: expect.any(Object),
        })
      );
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should throw NotFoundError if event not found', async () => {
      const slug = 'nonexistent-event';

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(null);

      await expect(EventsService.getBySlug(slug)).rejects.toThrow(NotFoundError);
    });
  });

  describe('publish', () => {
    it('should delegate to PublishingService', async () => {
      const draftEvent = createMockEvent({ status: EventStatus.draft });
      const mockBatch = createMockTicketBatch({ eventId: draftEvent.id });

      // PublishingService.publish uses `include: { batches: true }` so we need batches
      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        ...draftEvent,
        batches: [mockBatch],
      } as any);
      vi.mocked(prisma.event.update).mockResolvedValueOnce({
        ...draftEvent,
        status: EventStatus.published,
      } as any);
      vi.mocked(redis.del).mockResolvedValue(1);

      const result = await EventsService.publish(draftEvent.id, draftEvent.producerId);

      expect(result.status).toBe(EventStatus.published);
    });

    it('should throw error if event is not in draft status', async () => {
      const publishedEvent = createMockEvent({ status: EventStatus.published });
      const mockBatch = createMockTicketBatch({ eventId: publishedEvent.id });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        ...publishedEvent,
        batches: [mockBatch],
      } as any);

      await expect(EventsService.publish(publishedEvent.id, publishedEvent.producerId)).rejects.toThrow();
    });

    it('should invalidate cache after publishing', async () => {
      const draftEvent = createMockEvent({ status: EventStatus.draft });
      const mockBatch = createMockTicketBatch({ eventId: draftEvent.id });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce({
        ...draftEvent,
        batches: [mockBatch],
      } as any);
      vi.mocked(prisma.event.update).mockResolvedValueOnce({
        ...draftEvent,
        status: EventStatus.published,
      } as any);
      vi.mocked(redis.del).mockResolvedValue(1);

      await EventsService.publish(draftEvent.id, draftEvent.producerId);

      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel event via PublishingService', async () => {
      const mockEvent = createMockEvent({ status: EventStatus.published });

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(mockEvent);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.event.update).mockResolvedValueOnce({
        ...mockEvent,
        status: EventStatus.cancelled,
      } as any);
      // PublishingService.cancel uses order.findMany inside transaction
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([]); // No orders to cancel
      vi.mocked(redis.del).mockResolvedValue(1);

      const result = await EventsService.cancel(mockEvent.id, mockEvent.producerId);

      expect(result.status).toBe(EventStatus.cancelled);
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw NotFoundError if event not found', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(null);

      await expect(EventsService.cancel('nonexistent', 'producer-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('search', () => {
    it('should search events with filters', async () => {
      const mockEvents = [createMockEvent(), createMockEvent()];

      vi.mocked(prisma.event.findMany).mockResolvedValueOnce(mockEvents);

      const result = await EventsService.search({
        cursor: undefined,
        limit: 20,
        direction: 'forward',
        category: 'Music',
        status: EventStatus.published,
      } as any);

      expect(result.data).toHaveLength(2);
      expect(prisma.event.findMany).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      const mockEvents = [
        createMockEvent({ category: 'Music' }),
        createMockEvent({ category: 'Music' }),
      ];

      vi.mocked(prisma.event.findMany).mockResolvedValueOnce(mockEvents);

      await EventsService.search({
        cursor: undefined,
        limit: 20,
        direction: 'forward',
        category: 'Music',
      } as any);

      const call = vi.mocked(prisma.event.findMany).mock.calls[0];
      expect(call[0].where).toHaveProperty('category', 'Music');
    });

    it('should filter by status', async () => {
      const mockEvents = [createMockEvent({ status: EventStatus.published })];

      vi.mocked(prisma.event.findMany).mockResolvedValueOnce(mockEvents);

      await EventsService.search({
        cursor: undefined,
        limit: 20,
        direction: 'forward',
      } as any);

      const call = vi.mocked(prisma.event.findMany).mock.calls[0];
      // Default filter is published
      expect(call[0].where).toHaveProperty('status', 'published');
    });
  });
});
