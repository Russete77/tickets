import { PrismaClient } from '../../generated/prisma/client';
import supertest from 'supertest';
import { createApp } from '../../app';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

/**
 * Create a test HTTP client
 */
export function createTestClient() {
  const app = createApp();
  return supertest(app);
}

/**
 * Create a Prisma client for integration tests
 */
export function createTestPrisma() {
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('No database URL configured for integration tests');
  }
  return new PrismaClient({
    datasources: { db: { url: databaseUrl } }
  });
}

/**
 * Create a test user with optional overrides
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {}
) {
  const email = overrides.email || `user-${uuidv4()}@test.com`;
  const password = 'TestPassword123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name: overrides.name || 'Test User',
      cpf: overrides.cpf || '12345678901',
      phone: overrides.phone || '11999999999',
      passwordHash,
      emailVerified: overrides.emailVerified ?? true,
      totpEnabled: false,
      role: overrides.role || 'consumer',
      ...overrides,
    },
  });

  return { user, password };
}

/**
 * Create a test event with optional overrides
 */
export async function createTestEvent(
  prisma: PrismaClient,
  producerId: string,
  overrides: Partial<Parameters<typeof prisma.event.create>[0]['data']> = {}
) {
  const slug = overrides.slug || `event-${uuidv4().slice(0, 8)}`;

  const event = await prisma.event.create({
    data: {
      producerId,
      title: overrides.title || 'Test Event',
      slug,
      description: overrides.description || 'A test event',
      shortDescription: overrides.shortDescription || 'Test event',
      category: overrides.category || 'show',
      venueName: overrides.venueName || 'Test Venue',
      venueAddress: overrides.venueAddress || '123 Test Street',
      venueLat: overrides.venueLat || '23.5505',
      venueLng: overrides.venueLng || '-46.6333',
      venueCapacity: overrides.venueCapacity || 1000,
      coverImageUrl: overrides.coverImageUrl || 'https://example.com/image.jpg',
      startsAt: overrides.startsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endsAt: overrides.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      doorsOpenAt: overrides.doorsOpenAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: overrides.status || 'draft',
      tags: overrides.tags || ['music', 'party'],
      ageRating: overrides.ageRating || 'Livre',
      maxTicketsPerCpf: overrides.maxTicketsPerCpf || 4,
      ...overrides,
    },
  });

  return event;
}

/**
 * Create a test ticket batch with optional overrides
 */
export async function createTestBatch(
  prisma: PrismaClient,
  eventId: string,
  overrides: Partial<Parameters<typeof prisma.ticketBatch.create>[0]['data']> = {}
) {
  const batch = await prisma.ticketBatch.create({
    data: {
      eventId,
      name: overrides.name || 'Lote 1',
      priceCents: overrides.priceCents || 10000,
      quantity: overrides.quantity || 100,
      type: overrides.type || 'regular',
      startsAt: overrides.startsAt || new Date(),
      endsAt: overrides.endsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      autoSwitch: overrides.autoSwitch ?? true,
      sortOrder: overrides.sortOrder ?? 0,
      ...overrides,
    },
  });

  return batch;
}

/**
 * Create a test order with optional overrides
 */
export async function createTestOrder(
  prisma: PrismaClient,
  userId: string,
  eventId: string,
  overrides: Partial<Parameters<typeof prisma.order.create>[0]['data']> = {}
) {
  const order = await prisma.order.create({
    data: {
      userId,
      eventId,
      status: overrides.status || 'pending',
      totalPriceCents: overrides.totalPriceCents || 10000,
      paymentMethod: overrides.paymentMethod || 'pix',
      ...overrides,
    },
  });

  return order;
}

/**
 * Create a test ticket with optional overrides
 */
export async function createTestTicket(
  prisma: PrismaClient,
  orderId: string,
  eventId: string,
  batchId: string,
  holderId: string,
  overrides: Partial<Parameters<typeof prisma.ticket.create>[0]['data']> = {}
) {
  const ticket = await prisma.ticket.create({
    data: {
      orderId,
      eventId,
      batchId,
      holderId,
      status: overrides.status || 'active',
      holderName: overrides.holderName || 'John Doe',
      holderCpf: overrides.holderCpf || '12345678901',
      holderEmail: overrides.holderEmail || 'john@example.com',
      priceCents: overrides.priceCents || 10000,
      ticketHash: overrides.ticketHash || `hash-${uuidv4()}`,
      ...overrides,
    },
  });

  return ticket;
}

/**
 * Clean up test data from database (em ordem de FK).
 *
 * Tables com FK precisam ser apagadas ANTES do parent.
 * Cashless e checkin foram adicionados em sessão de hardening 2026-04-28.
 */
export async function cleanupTestData(prisma: PrismaClient) {
  try {
    // Cashless / POS — depende de event/user
    await prisma.cashlessTransaction.deleteMany({});
    await prisma.cashlessWallet.deleteMany({});

    // Check-in logs — depende de ticket/event/user
    await prisma.checkinLog.deleteMany({});

    // Tickets / orders — depende de event/user/batch
    await prisma.ticket.deleteMany({});
    await prisma.ticketTransfer.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.ticketBatch.deleteMany({});

    // Favoritos
    await prisma.favorite.deleteMany({});

    // Eventos / usuários / audit
    await prisma.event.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.auditLog.deleteMany({});
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  }
}

/**
 * Generate a valid JWT token for testing
 * This is a helper for integration tests - in real tests, use the actual auth endpoints
 */
export async function generateTestJWT(
  userId: string,
  secret: string = 'test-access-secret-minimum-32-characters-length-here'
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId, iat: Math.floor(Date.now() / 1000) },
    secret,
    { expiresIn: '1h' }
  );
}
