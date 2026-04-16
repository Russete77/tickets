# Integration Tests for Ticketeria API

This directory contains integration tests for the Ticketeria API. These tests use a real database connection (PostgreSQL) to verify the API endpoints work correctly with actual data persistence.

## Overview

Integration tests are different from unit tests:
- **Unit tests** mock external dependencies (database, Redis, external APIs)
- **Integration tests** use real services where possible (actual PostgreSQL database)
- Integration tests verify that multiple components work together correctly

## Test Files

### `auth.integration.test.ts`
Tests for authentication endpoints:
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `GET /api/v1/auth/me` - Get authenticated user
- `POST /api/v1/auth/forgot-password` - Password reset request

### `events.integration.test.ts`
Tests for event management endpoints:
- `POST /api/v1/events` - Create event (producer only)
- `GET /api/v1/events/:id` - Get event by ID (public)
- `GET /api/v1/events/slug/:slug` - Get event by slug (public)
- `GET /api/v1/events/search` - Search events with filters
- `GET /api/v1/events/weekend` - Get weekend events
- `PATCH /api/v1/events/:id` - Update event (producer only)
- `POST /api/v1/events/:id/publish` - Publish event
- `POST /api/v1/events/:id/cancel` - Cancel event

### `orders.integration.test.ts`
Tests for order management endpoints:
- `GET /api/v1/orders` - List user's orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders/:id/cancel` - Cancel order

### `helpers.ts`
Utility functions for integration tests:
- `createTestClient()` - Create HTTP test client
- `createTestPrisma()` - Create Prisma client for tests
- `createTestUser()` - Create a test user with optional overrides
- `createTestEvent()` - Create a test event
- `createTestBatch()` - Create a ticket batch
- `createTestOrder()` - Create an order
- `createTestTicket()` - Create a ticket
- `cleanupTestData()` - Clean up database after tests

### `setup.ts`
Global test setup:
- Initializes database connection
- Sets up beforeAll/afterEach hooks
- Handles database cleanup
- Provides test database initialization

## Running Integration Tests

### Prerequisites

1. A PostgreSQL database for testing
2. Environment variables configured:
   ```bash
   # Use a separate test database
   TEST_DATABASE_URL=postgresql://user:password@localhost:5432/ticketeria_test
   
   # Or use the same as development
   DATABASE_URL=postgresql://user:password@localhost:5432/ticketeria_dev
   ```

3. Database migrations applied:
   ```bash
   npm run db:migrate
   ```

### Commands

Run all integration tests:
```bash
npm run test:integration
```

Run integration tests in watch mode (rerun on file changes):
```bash
npm run test:integration:watch
```

Run a specific test file:
```bash
npm run test:integration -- auth.integration.test.ts
```

Run tests matching a pattern:
```bash
npm run test:integration -- --grep "POST /api/v1/auth/register"
```

Run with verbose output:
```bash
npm run test:integration -- --reporter=verbose
```

## Test Structure

Each test file follows this pattern:

```typescript
describe('Feature Name', () => {
  let prisma: PrismaClient;
  let client: ReturnType<typeof createTestClient>;
  
  beforeAll(async () => {
    // Initialize database and HTTP client
  });
  
  afterEach(async () => {
    // Clean up test data after each test
  });
  
  afterAll(async () => {
    // Close database connection
  });
  
  describe('Endpoint Name', () => {
    it('should do something when condition is met', async () => {
      // Arrange - set up test data
      const user = await createTestUser(prisma);
      
      // Act - make request
      const response = await client
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password });
      
      // Assert - verify response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- One assertion per test when possible (for clarity)
- Use descriptive test names that explain the scenario

### 2. Setup and Cleanup
- Use `beforeEach` to set up test data for each test
- Use `afterEach` to clean up (already done in setup.ts)
- Minimize shared state between tests

### 3. Test Data
- Use helper functions to create test data consistently
- Use `overrides` parameter to customize test data
- Clean up data that might interfere with other tests

```typescript
// Good - specific overrides
const user = await createTestUser(prisma, {
  email: 'specific@example.com',
  role: 'producer'
});

// Avoid - relying on defaults
const user = await createTestUser(prisma);
```

### 4. Assertions
- Test both success and error cases
- Verify response structure (status, success flag, data)
- Verify side effects (data persisted in database)

```typescript
// Good - verify multiple aspects
const response = await client.post('/api/v1/auth/register').send(...);
expect(response.status).toBe(201);
expect(response.body.success).toBe(true);
expect(response.body.data.user.email).toBe('test@example.com');

// Verify in database
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' }
});
expect(user).toBeDefined();
```

### 5. Authentication Testing
- Always verify that endpoints that require auth reject unauthenticated requests
- Test both valid and invalid tokens
- Test role-based access control (producer vs consumer)

```typescript
// Test with authentication
const response = await client
  .get('/api/v1/orders')
  .set('Authorization', `Bearer ${accessToken}`);

// Test without authentication
const response = await client
  .get('/api/v1/orders')
  .expect(401);
```

## Database Cleanup

The test setup automatically cleans up test data:
1. After each test (`afterEach`)
2. Before and after the entire test suite

Cleanup order respects foreign key constraints:
```typescript
// Deleted in this order to avoid constraint violations
await prisma.ticket.deleteMany({});
await prisma.ticketTransfer.deleteMany({});
await prisma.order.deleteMany({});
await prisma.ticketBatch.deleteMany({});
await prisma.event.deleteMany({});
await prisma.user.deleteMany({});
```

## Troubleshooting

### Database Connection Issues
```
Error: Failed to connect to integration test database
```
Solution: Check that `TEST_DATABASE_URL` or `DATABASE_URL` is set and the database is running.

### Timeout Errors
```
Test timeout of 30000ms exceeded
```
Solutions:
- Check if database is responsive
- Reduce number of parallel tests: use `singleThread: true` in config
- Increase timeout in vitest.integration.config.ts

### Foreign Key Constraint Errors
Make sure cleanup happens in the correct order (already handled in `cleanupTestData`).

### Port Already in Use
Integration tests don't require starting a server - they use the Express app directly via supertest, so port conflicts shouldn't occur.

## Adding New Integration Tests

1. Create a new test file: `src/tests/integration/feature.integration.test.ts`
2. Use the same structure as existing tests
3. Import helpers from `helpers.ts`
4. Use `describe` and `it` from `vitest`
5. Make sure to clean up test data with `afterEach`

Example:
```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createTestClient, createTestPrisma, cleanupTestData } from './helpers';

describe('New Feature', () => {
  let prisma: PrismaClient;
  let client: ReturnType<typeof createTestClient>;
  
  beforeAll(async () => {
    prisma = createTestPrisma();
    client = createTestClient();
  });
  
  afterEach(async () => {
    await cleanupTestData(prisma);
  });
  
  afterAll(async () => {
    await prisma.$disconnect();
  });
  
  describe('GET /api/v1/feature', () => {
    it('should return feature data', async () => {
      const response = await client
        .get('/api/v1/feature')
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
  });
});
```

## CI/CD Integration

To run integration tests in CI/CD:

1. Ensure PostgreSQL is running (use Docker or cloud database)
2. Set `TEST_DATABASE_URL` environment variable
3. Run migrations: `npm run db:migrate`
4. Run tests: `npm run test:integration`

Example GitHub Actions workflow:
```yaml
- name: Run integration tests
  env:
    TEST_DATABASE_URL: postgresql://user:pass@localhost:5432/test
  run: npm run test:integration
```

## Performance Considerations

- Tests run serially (`singleThread: true`) to avoid database locks
- Each test cleans up after itself
- Typical test execution: ~5-10ms per test
- Full suite: ~1-2 seconds for auth, events, orders tests

## Debugging Integration Tests

### Verbose Output
```bash
npm run test:integration -- --reporter=verbose
```

### Debug Specific Test
```bash
npm run test:integration -- --grep "specific test name"
```

### Check Database State
Add a breakpoint or pause in your test:
```typescript
it('should work', async () => {
  const user = await createTestUser(prisma);
  // Check database manually at this point
  await new Promise(resolve => setTimeout(resolve, 5000));
});
```

## Related Documentation

- [Unit Tests](../README.md) - Unit testing setup and patterns
- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing](https://www.prisma.io/docs/orm/prisma-client/testing)
