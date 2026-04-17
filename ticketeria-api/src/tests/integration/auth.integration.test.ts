import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { createTestClient, createTestPrisma, createTestUser, cleanupTestData } from './helpers';

const hasDatabase = !!(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);

let prisma: PrismaClient;
let client: ReturnType<typeof createTestClient>;

describe.skipIf(!hasDatabase)('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Skip if no database configured
    const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('⚠️  Skipping auth integration tests - no database configured');
      return;
    }

    prisma = createTestPrisma();
    client = createTestClient();

    // Clean before tests start
    await cleanupTestData(prisma);
  });

  afterEach(async () => {
    if (!prisma) return;
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'ValidPassword123!',
          cpf: '12345678901',
          phone: '11999999999',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe('newuser@example.com');
      expect(response.body.data.user.name).toBe('New User');
      expect(response.body.data.user.role).toBe('consumer');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: 'newuser@example.com' },
      });
      expect(user).toBeDefined();
      expect(user?.name).toBe('New User');
    });

    it('should reject duplicate email', async () => {
      // Create first user
      await client.post('/api/v1/auth/register').send({
        email: 'duplicate@example.com',
        name: 'First User',
        password: 'ValidPassword123!',
        cpf: '12345678901',
        phone: '11999999999',
      });

      // Try to create user with same email
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'duplicate@example.com',
          name: 'Second User',
          password: 'ValidPassword123!',
          cpf: '12345678902',
          phone: '11988888888',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid email format', async () => {
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          name: 'Test User',
          password: 'ValidPassword123!',
          cpf: '12345678901',
          phone: '11999999999',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject weak password', async () => {
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          name: 'Test User',
          password: '123', // too weak
          cpf: '12345678901',
          phone: '11999999999',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      if (!prisma) return;
      // Create a test user
      await createTestUser(prisma, {
        email: 'login@example.com',
        name: 'Login Test User',
      });
    });

    it('should login with valid credentials and return tokens', async () => {
      const response = await client
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'TestPassword123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.user.email).toBe('login@example.com');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const response = await client
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const response = await client
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      if (!prisma) return;
      // Create a test user and login
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'refresh@example.com',
          name: 'Refresh Test User',
          password: 'ValidPassword123!',
          cpf: '12345678901',
          phone: '11999999999',
        });

      refreshToken = response.body.data.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await client
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await client
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      if (!prisma) return;
      // Create a test user and login
      const response = await client
        .post('/api/v1/auth/register')
        .send({
          email: 'me@example.com',
          name: 'Me Test User',
          password: 'ValidPassword123!',
          cpf: '12345678901',
          phone: '11999999999',
        });

      accessToken = response.body.data.tokens.accessToken;
    });

    it('should return authenticated user info', async () => {
      const response = await client
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('me@example.com');
      expect(response.body.data.user.name).toBe('Me Test User');
    });

    it('should reject request without token', async () => {
      const response = await client
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await client
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      if (!prisma) return;
      await createTestUser(prisma, {
        email: 'forgot@example.com',
        name: 'Forgot Test User',
      });
    });

    it('should accept forgot password request for existing email', async () => {
      const response = await client
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'forgot@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject forgot password request for non-existent email', async () => {
      const response = await client
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
