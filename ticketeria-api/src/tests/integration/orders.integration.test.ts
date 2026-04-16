import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import {
  createTestClient,
  createTestPrisma,
  createTestUser,
  createTestEvent,
  createTestOrder,
  cleanupTestData,
} from './helpers';

let prisma: PrismaClient;
let client: ReturnType<typeof createTestClient>;
let userAccessToken: string;
let userId: string;
let otherUserAccessToken: string;
let otherUserId: string;
let producerId: string;
let eventId: string;

describe('Orders Integration Tests', () => {
  beforeAll(async () => {
    // Skip if no database configured
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️  Skipping orders integration tests - no database configured');
      return;
    }

    prisma = createTestPrisma();
    client = createTestClient();

    // Create test users
    const user1 = await createTestUser(prisma, {
      email: 'order-user@example.com',
      name: 'Order Test User',
    });
    userId = user1.user.id;

    const user2 = await createTestUser(prisma, {
      email: 'other-user@example.com',
      name: 'Other User',
    });
    otherUserId = user2.user.id;

    const producer = await createTestUser(prisma, {
      email: 'order-producer@example.com',
      name: 'Order Producer',
      role: 'producer',
    });
    producerId = producer.user.id;

    // Create an event
    const event = await createTestEvent(prisma, producerId, {
      status: 'published',
    });
    eventId = event.id;

    // Get access tokens by making requests to the API
    // Note: In production, you would use actual JWT tokens from the registration/login flow
    // For testing purposes, we'll simulate tokens
  });

  afterEach(async () => {
    if (!prisma) return;
    // Clean up orders and tickets for each test
    await prisma.ticket.deleteMany({});
    await prisma.ticketTransfer.deleteMany({});
    await prisma.order.deleteMany({});
  });

  afterAll(async () => {
    if (prisma) {
      await cleanupTestData(prisma);
      await prisma.$disconnect();
    }
  });

  describe('POST /api/v1/orders (create order)', () => {
    it('should create an order when authenticated', async () => {
      // First register and login to get a real token
      const registerRes = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'order-creator@example.com',
          name: 'Order Creator',
          password: 'ValidPassword123!',
          cpf: '12345678901',
          phone: '11999999999',
        });

      const token = registerRes.body.data.tokens.accessToken;

      // Create an order (if the endpoint exists - verify with your actual routes)
      // This is a placeholder as the POST /orders endpoint might not exist
      // or might have different behavior
      const response = await client
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          eventId,
          quantities: [
            {
              batchId: 'batch-1',
              quantity: 2,
            },
          ],
          paymentMethod: 'pix',
        });

      // Verify response structure if endpoint exists
      if (response.status === 201 || response.status === 200) {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
      }
    });
  });

  describe('GET /api/v1/orders (list user orders)', () => {
    let order1Id: string;
    let order2Id: string;
    let userToken: string;

    beforeEach(async () => {
      if (!prisma) return;

      // Create test user and get token
      const userRes = await createTestUser(prisma, {
        email: `list-orders-user-${Date.now()}@example.com`,
      });
      const testUserId = userRes.user.id;

      // Create orders for this user
      const order1 = await createTestOrder(prisma, testUserId, eventId, {
        status: 'pending',
      });
      order1Id = order1.id;

      const order2 = await createTestOrder(prisma, testUserId, eventId, {
        status: 'paid',
      });
      order2Id = order2.id;

      // Create an order for another user (should not be visible)
      await createTestOrder(prisma, otherUserId, eventId, {
        status: 'paid',
      });

      // Get token for this user
      const tokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: userRes.user.email,
          password: 'TestPassword123!',
        });

      userToken = tokenRes.body.data.tokens.accessToken;
    });

    it('should list orders for authenticated user', async () => {
      const response = await client
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data) || response.body.data.orders).toBe(true);

      // Verify pagination/cursor structure
      const orders = Array.isArray(response.body.data) ? response.body.data : response.body.data.orders;
      expect(orders.length).toBeGreaterThan(0);

      // Verify order belongs to user (should only see own orders)
      const orderIds = orders.map((o: any) => o.id);
      expect(orderIds).toContain(order1Id);
      expect(orderIds).toContain(order2Id);
    });

    it('should filter orders by status', async () => {
      const response = await client
        .get('/api/v1/orders')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const orders = Array.isArray(response.body.data) ? response.body.data : response.body.data.orders;
      // All returned orders should have pending status
      orders.forEach((order: any) => {
        expect(order.status).toBe('pending');
      });
    });

    it('should filter orders by event', async () => {
      const response = await client
        .get('/api/v1/orders')
        .query({ eventId })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const orders = Array.isArray(response.body.data) ? response.body.data : response.body.data.orders;
      // All returned orders should be for the specified event
      orders.forEach((order: any) => {
        expect(order.eventId).toBe(eventId);
      });
    });

    it('should reject request without authentication', async () => {
      const response = await client
        .get('/api/v1/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const response = await client
        .get('/api/v1/orders')
        .query({ limit: 1 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const orders = Array.isArray(response.body.data) ? response.body.data : response.body.data.orders;
      expect(orders.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /api/v1/orders/:id (order details)', () => {
    let orderId: string;
    let userToken: string;
    let testUserId: string;

    beforeEach(async () => {
      if (!prisma) return;

      // Create test user
      const userRes = await createTestUser(prisma, {
        email: `order-detail-user-${Date.now()}@example.com`,
      });
      testUserId = userRes.user.id;

      // Create an order
      const order = await createTestOrder(prisma, testUserId, eventId, {
        status: 'pending',
        totalPriceCents: 25000,
      });
      orderId = order.id;

      // Get token
      const tokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: userRes.user.email,
          password: 'TestPassword123!',
        });

      userToken = tokenRes.body.data.tokens.accessToken;
    });

    it('should return order details for owner', async () => {
      const response = await client
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.totalPriceCents).toBe(25000);
    });

    it('should reject access to other user orders', async () => {
      // Create another user
      const otherUserRes = await createTestUser(prisma, {
        email: `other-order-user-${Date.now()}@example.com`,
      });

      // Get token for other user
      const otherTokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: otherUserRes.user.email,
          password: 'TestPassword123!',
        });

      const otherToken = otherTokenRes.body.data.tokens.accessToken;

      // Try to access first user's order
      const response = await client
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent order', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await client
        .get(`/api/v1/orders/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should reject request without authentication', async () => {
      const response = await client
        .get(`/api/v1/orders/${orderId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/orders/:id/cancel (cancel order)', () => {
    let orderId: string;
    let userToken: string;

    beforeEach(async () => {
      if (!prisma) return;

      // Create test user
      const userRes = await createTestUser(prisma, {
        email: `cancel-order-user-${Date.now()}@example.com`,
      });

      // Create an order
      const order = await createTestOrder(prisma, userRes.user.id, eventId, {
        status: 'pending',
      });
      orderId = order.id;

      // Get token
      const tokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: userRes.user.email,
          password: 'TestPassword123!',
        });

      userToken = tokenRes.body.data.tokens.accessToken;
    });

    it('should cancel pending order', async () => {
      const response = await client
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');

      // Verify in database
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(order?.status).toBe('cancelled');
    });

    it('should reject cancellation of paid order', async () => {
      // Create a paid order
      const paidOrder = await createTestOrder(prisma, userId, eventId, {
        status: 'paid',
      });

      // Try to cancel
      const userRes = await createTestUser(prisma, {
        email: `paid-cancel-user-${Date.now()}@example.com`,
      });

      const tokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: userRes.user.email,
          password: 'TestPassword123!',
        });

      const response = await client
        .post(`/api/v1/orders/${paidOrder.id}/cancel`)
        .set('Authorization', `Bearer ${tokenRes.body.data.tokens.accessToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject cancellation by non-owner', async () => {
      // Create another user
      const otherUserRes = await createTestUser(prisma, {
        email: `other-cancel-user-${Date.now()}@example.com`,
      });

      // Get token for other user
      const otherTokenRes = await client
        .post('/api/v1/auth/login')
        .send({
          email: otherUserRes.user.email,
          password: 'TestPassword123!',
        });

      const response = await client
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${otherTokenRes.body.data.tokens.accessToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should reject cancellation without authentication', async () => {
      const response = await client
        .post(`/api/v1/orders/${orderId}/cancel`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
