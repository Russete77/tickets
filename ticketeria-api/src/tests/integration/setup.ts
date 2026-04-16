import { beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client';
import { cleanupTestData, createTestPrisma } from './helpers';

let prisma: PrismaClient | null = null;

/**
 * Initialize Prisma for all integration tests
 */
export async function initializeTestDatabase() {
  try {
    prisma = createTestPrisma();

    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('Integration test database connected successfully');
  } catch (error) {
    console.error('Failed to connect to integration test database:', error);
    throw new Error(
      'Integration tests require a database. ' +
      'Please set TEST_DATABASE_URL or DATABASE_URL environment variable.'
    );
  }
}

/**
 * Get the current Prisma instance
 */
export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.');
  }
  return prisma;
}

/**
 * Global setup - runs once before all tests
 */
beforeAll(async () => {
  // Only run if we have a database URL
  const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('⚠️  No database URL configured. Integration tests will be skipped.');
    return;
  }

  await initializeTestDatabase();
  console.log('Integration test environment initialized');
});

/**
 * Cleanup after each test
 */
afterEach(async () => {
  if (!prisma) return;

  try {
    await cleanupTestData(prisma);
  } catch (error) {
    console.error('Error cleaning up test data:', error);
  }
});

/**
 * Global teardown - runs once after all tests
 */
afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('Integration test database connection closed');
  }
});
