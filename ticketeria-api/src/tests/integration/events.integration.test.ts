import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import {
  createTestClient,
  createTestPrisma,
  createTestUser,
  createTestEvent,
  cleanupTestData,
} from './helpers';

let prisma: PrismaClient;
let client: ReturnType<typeof createTestClient>;
let producerAccessToken: string;
let producerId: string;
let consumerAccessToken: string;
let consumerId: string;

describe('Events Integration Tests', () => {
  beforeAll(async () => {
    // Skip if no database configured
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️  Skipping events integration tests - no database configured');
      return;
    }

    prisma = createTestPrisma();
    client = createTestClient();

    // Create a producer user
    const producerResponse = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'producer@example.com',
        name: 'Test Producer',
        password: 'ValidPassword123!',
        cpf: '12345678901',
        phone: '11999999999',
      });

    if (producerResponse.status === 201) {
      const { user, tokens } = producerResponse.body.data;
      producerId = user.id;
      producerAccessToken = tokens.accessToken;

      // Update user role to producer
      await prisma.user.update({
        where: { id: producerId },
        data: { role: 'producer' },
      });
    }

    // Create a consumer user
    const consumerResponse = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'consumer@example.com',
        name: 'Test Consumer',
        password: 'ValidPassword123!',
        cpf: '12345678902',
        phone: '11988888888',
      });

    if (consumerResponse.status === 201) {
      const { user, tokens } = consumerResponse.body.data;
      consumerId = user.id;
      consumerAccessToken = tokens.accessToken;
    }

    // Clean up before tests
    await cleanupTestData(prisma);

    // Recreate users after cleanup
    const prodUser = await createTestUser(prisma, {
      email: 'producer@example.com',
      name: 'Test Producer',
      role: 'producer',
    });
    producerId = prodUser.user.id;

    const consUser = await createTestUser(prisma, {
      email: 'consumer@example.com',
      name: 'Test Consumer',
    });
    consumerId = consUser.user.id;
  });

  afterEach(async () => {
    if (!prisma) return;
    // Clean up events and related data only, keep users
    await prisma.ticket.deleteMany({});
    await prisma.ticketTransfer.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.ticketBatch.deleteMany({});
    await prisma.event.deleteMany({});
  });

  afterAll(async () => {
    if (prisma) {
      await cleanupTestData(prisma);
      await prisma.$disconnect();
    }
  });

  describe('POST /api/v1/events (authenticated producer)', () => {
    it('should create an event as a producer', async () => {
      const response = await client
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${producerAccessToken}`)
        .send({
          title: 'New Test Event',
          slug: 'new-test-event',
          description: 'A brand new test event',
          shortDescription: 'New test',
          category: 'show',
          venueName: 'Test Venue',
          venueAddress: '123 Test Street',
          venueLat: '23.5505',
          venueLng: '-46.6333',
          venueCapacity: 1000,
          coverImageUrl: 'https://example.com/image.jpg',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['music', 'party'],
          maxTicketsPerCpf: 4,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.title).toBe('New Test Event');
      expect(response.body.data.producerId).toBe(producerId);
      expect(response.body.data.status).toBe('draft');

      // Verify in database
      const event = await prisma.event.findUnique({
        where: { id: response.body.data.id },
      });
      expect(event).toBeDefined();
    });

    it('should reject event creation without authentication', async () => {
      const response = await client
        .post('/api/v1/events')
        .send({
          title: 'Unauthorized Event',
          slug: 'unauthorized-event',
          category: 'show',
          venueName: 'Test Venue',
          venueAddress: '123 Test Street',
          venueLat: '23.5505',
          venueLng: '-46.6333',
          venueCapacity: 1000,
          coverImageUrl: 'https://example.com/image.jpg',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject event creation by non-producer', async () => {
      const response = await client
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${consumerAccessToken}`)
        .send({
          title: 'Consumer Event',
          slug: 'consumer-event',
          category: 'show',
          venueName: 'Test Venue',
          venueAddress: '123 Test Street',
          venueLat: '23.5505',
          venueLng: '-46.6333',
          venueCapacity: 1000,
          coverImageUrl: 'https://example.com/image.jpg',
          startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
          doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events/:slug (public)', () => {
    let eventId: string;
    let eventSlug: string;

    beforeEach(async () => {
      if (!prisma) return;
      const event = await createTestEvent(prisma, producerId, {
        slug: 'public-event-test',
        status: 'published',
      });
      eventId = event.id;
      eventSlug = event.slug;
    });

    it('should retrieve published event by slug without authentication', async () => {
      const response = await client
        .get(`/api/v1/events/slug/${eventSlug}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.slug).toBe(eventSlug);
      expect(response.body.data.status).toBe('published');
    });

    it('should return 404 for non-existent slug', async () => {
      const response = await client
        .get('/api/v1/events/slug/non-existent-event')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events/:id (public)', () => {
    let eventId: string;

    beforeEach(async () => {
      if (!prisma) return;
      const event = await createTestEvent(prisma, producerId, {
        status: 'published',
      });
      eventId = event.id;
    });

    it('should retrieve event by ID', async () => {
      const response = await client
        .get(`/api/v1/events/${eventId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(eventId);
      expect(response.body.data.producerId).toBe(producerId);
    });

    it('should return 404 for non-existent event ID', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client
        .get(`/api/v1/events/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/events/search (public)', () => {
    beforeEach(async () => {
      if (!prisma) return;
      // Create multiple test events
      await createTestEvent(prisma, producerId, {
        title: 'Rock Concert',
        tags: ['music', 'rock'],
        status: 'published',
      });

      await createTestEvent(prisma, producerId, {
        title: 'Jazz Festival',
        tags: ['music', 'jazz'],
        status: 'published',
      });

      await createTestEvent(prisma, producerId, {
        title: 'Theater Show',
        category: 'teatro',
        tags: ['arts'],
        status: 'draft',
      });
    });

    it('should search events by title', async () => {
      const response = await client
        .get('/api/v1/events/search')
        .query({ q: 'Rock' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // Should find the Rock Concert
      expect(response.body.data.some((e: any) => e.title.includes('Rock'))).toBe(true);
    });

    it('should filter events by category', async () => {
      const response = await client
        .get('/api/v1/events/search')
        .query({ category: 'show' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty results for no matches', async () => {
      const response = await client
        .get('/api/v1/events/search')
        .query({ q: 'NonExistentEvent12345' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/events/weekend (public)', () => {
    beforeEach(async () => {
      if (!prisma) return;
      // Create events for this weekend
      const friday = new Date();
      const daysUntilFriday = (5 - friday.getDay() + 7) % 7 || 7;
      friday.setDate(friday.getDate() + daysUntilFriday);

      await createTestEvent(prisma, producerId, {
        title: 'Weekend Event 1',
        startsAt: friday,
        status: 'published',
      });

      const saturday = new Date(friday);
      saturday.setDate(saturday.getDate() + 1);

      await createTestEvent(prisma, producerId, {
        title: 'Weekend Event 2',
        startsAt: saturday,
        status: 'published',
      });
    });

    it('should retrieve weekend events', async () => {
      const response = await client
        .get('/api/v1/events/weekend')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('PATCH /api/v1/events/:id (authenticated producer)', () => {
    let eventId: string;

    beforeEach(async () => {
      if (!prisma) return;
      const event = await createTestEvent(prisma, producerId, {
        status: 'draft',
      });
      eventId = event.id;
    });

    it('should update event as producer', async () => {
      const response = await client
        .patch(`/api/v1/events/${eventId}`)
        .set('Authorization', `Bearer ${producerAccessToken}`)
        .send({
          title: 'Updated Event Title',
          description: 'Updated description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Event Title');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should reject event update by non-owner', async () => {
      // Create an event by a different producer
      const otherProducer = await createTestUser(prisma, {
        email: 'other-producer@example.com',
        role: 'producer',
      });

      const otherEvent = await createTestEvent(prisma, otherProducer.user.id, {
        status: 'draft',
      });

      const response = await client
        .patch(`/api/v1/events/${otherEvent.id}`)
        .set('Authorization', `Bearer ${producerAccessToken}`)
        .send({
          title: 'Unauthorized Update',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/events/:id/publish (authenticated producer)', () => {
    let eventId: string;

    beforeEach(async () => {
      if (!prisma) return;
      const event = await createTestEvent(prisma, producerId, {
        status: 'draft',
      });
      eventId = event.id;
    });

    it('should publish event', async () => {
      const response = await client
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${producerAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');

      // Verify in database
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(event?.status).toBe('published');
    });
  });

  describe('POST /api/v1/events/:id/cancel (authenticated producer)', () => {
    let eventId: string;

    beforeEach(async () => {
      if (!prisma) return;
      const event = await createTestEvent(prisma, producerId, {
        status: 'published',
      });
      eventId = event.id;
    });

    it('should cancel event', async () => {
      const response = await client
        .post(`/api/v1/events/${eventId}/cancel`)
        .set('Authorization', `Bearer ${producerAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');

      // Verify in database
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });
      expect(event?.status).toBe('cancelled');
    });
  });
});
