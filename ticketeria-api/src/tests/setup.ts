import { vi } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { User, UserRole, Event, EventStatus, Order, OrderStatus, Ticket, TicketStatus, TicketBatch } from '../generated/prisma/client';

// Generate test RSA keys for JWT RS256 tests
const testKeyPair = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const TEST_PRIVATE_KEY_BASE64 = Buffer.from(testKeyPair.privateKey).toString('base64');
const TEST_PUBLIC_KEY_BASE64 = Buffer.from(testKeyPair.publicKey).toString('base64');

/**
 * Mock Prisma Client
 */
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  event: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ticketBatch: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  order: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ticket: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ticketTransfer: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(mockPrisma)),
};

/**
 * Mock Redis Client
 */
export const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  del: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  sadd: vi.fn(),
  scard: vi.fn(),
  smembers: vi.fn(),
  sismember: vi.fn(),
  srem: vi.fn(),
  lpush: vi.fn(),
  rpush: vi.fn(),
  lpop: vi.fn(),
  rpop: vi.fn(),
  lrange: vi.fn(),
  llen: vi.fn(),
  zadd: vi.fn(),
  zrange: vi.fn(),
  zrangebyscore: vi.fn(),
  zrem: vi.fn(),
  zremrangebyscore: vi.fn(),
  zcard: vi.fn(),
  zscore: vi.fn(),
  pipeline: vi.fn(() => ({
    exec: vi.fn().mockResolvedValue([]),
  })),
};

/**
 * Mock Logger
 */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

/**
 * Mock environment variables for tests
 */
export const mockEnv = {
  NODE_ENV: 'test',
  PORT: 3333,
  API_VERSION: 'v1',
  API_BASE_URL: 'http://localhost:3333',
  FRONTEND_URL: 'http://localhost:5173',
  ADMIN_URL: 'http://localhost:5174',
  CHECKIN_URL: 'http://localhost:5175',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/ticketeria_test',
  REDIS_HOST: 'localhost',
  REDIS_PORT: 6379,
  REDIS_PASSWORD: undefined,
  JWT_PRIVATE_KEY_BASE64: TEST_PRIVATE_KEY_BASE64,
  JWT_PUBLIC_KEY_BASE64: TEST_PUBLIC_KEY_BASE64,
  JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-characters-length-here',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  PLATFORM_SECRET: 'test-platform-secret-minimum-32-characters-length-here',
  ASAAS_API_URL: 'https://api.asaas.com',
  ASAAS_API_KEY: 'test-api-key',
  ASAAS_WEBHOOK_SECRET: 'test-webhook-secret',
  ASAAS_WALLET_ID: 'test-wallet-id',
  R2_BUCKET_NAME: 'ticketeria',
};

/**
 * Setup mocks before all tests
 */
vi.mock('../config/database', () => ({
  prisma: mockPrisma,
}));

vi.mock('../config/redis', () => ({
  redis: mockRedis,
}));

vi.mock('../config/env', () => ({
  env: mockEnv,
}));

vi.mock('../config/jwt', () => ({
  jwtKeys: {
    privateKey: testKeyPair.privateKey,
    publicKey: testKeyPair.publicKey,
  },
  decodeJwtKeys: vi.fn((priv: string, pub: string) => ({
    privateKey: Buffer.from(priv, 'base64').toString('utf-8'),
    publicKey: Buffer.from(pub, 'base64').toString('utf-8'),
  })),
}));

vi.mock('../shared/logger', () => ({
  logger: mockLogger,
}));

vi.mock('bcryptjs', async () => {
  const actual = await vi.importActual('bcryptjs');
  return {
    default: {
      hash: vi.fn(async (password: string) => `hashed_${password}`),
      compare: vi.fn(async (password: string, hash: string) => hash === `hashed_${password}`),
      ...actual,
    },
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn((payload: any, secret: string, options?: any) => {
      return `token_${JSON.stringify(payload)}`;
    }),
    verify: vi.fn((token: string, secret: string) => {
      if (token.includes('invalid') || token.includes('expired')) {
        throw new Error('Invalid token');
      }
      return JSON.parse(token.replace('token_', ''));
    }),
    TokenExpiredError: class TokenExpiredError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'TokenExpiredError';
      }
    },
  },
}));

vi.mock('otplib', () => ({
  authenticator: {
    generateSecret: vi.fn(() => 'test-secret'),
    check: vi.fn((code: string, secret: string) => code === '123456'),
    keyuri: vi.fn((accountName: string, issuer: string, secret: string) =>
      `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`
    ),
  },
}));

vi.mock('../shared/audit', () => ({
  logAudit: vi.fn(),
  AuditActions: {
    USER_REGISTERED: 'USER_REGISTERED',
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
    EVENT_CREATED: 'EVENT_CREATED',
    EVENT_PUBLISHED: 'EVENT_PUBLISHED',
    ORDER_CREATED: 'ORDER_CREATED',
    ORDER_CANCELLED: 'ORDER_CANCELLED',
    TICKET_TRANSFERRED: 'TICKET_TRANSFERRED',
    TICKET_CHECKED_IN: 'TICKET_CHECKED_IN',
  },
}));

/**
 * Reset all mocks before each test
 */
beforeEach(() => {
  vi.clearAllMocks();
});
