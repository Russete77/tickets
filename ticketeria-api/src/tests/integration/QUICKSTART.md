# Integration Tests - Quick Start

## Setup (First Time Only)

### 1. Install Dependencies
Supertest should already be installed:
```bash
npm install -D supertest @types/supertest
```

### 2. Configure Database
Set one of these environment variables:

```bash
# Option A: Separate test database (recommended)
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/ticketeria_test"

# Option B: Use existing database
export DATABASE_URL="postgresql://user:password@localhost:5432/ticketeria_dev"
```

### 3. Apply Migrations
```bash
npm run db:migrate
```

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run in Watch Mode (auto-reload on changes)
```bash
npm run test:integration:watch
```

### Run Specific Test File
```bash
npm run test:integration -- auth.integration.test.ts
```

### Run Tests Matching Pattern
```bash
npm run test:integration -- --grep "register"
```

### Run with Verbose Output
```bash
npm run test:integration -- --reporter=verbose
```

## Common Commands Cheat Sheet

```bash
# Setup
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/test"
npm run db:migrate

# Run tests
npm run test:integration                    # All tests once
npm run test:integration:watch              # Watch mode
npm run test:integration -- auth            # Auth tests only
npm run test:integration -- --grep "login"  # Tests matching "login"

# Debugging
npm run test:integration -- --reporter=verbose  # Detailed output
npm run test:integration -- auth.integration.test.ts --inspect-brk  # Debug mode
```

## Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `auth.integration.test.ts` | 11 | Register, Login, Refresh, Me, Forgot Password |
| `events.integration.test.ts` | 14 | Create, Read, Search, Update, Publish, Cancel |
| `orders.integration.test.ts` | 11 | List, Get, Cancel |

## Example: Writing a New Test

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  createTestClient,
  createTestPrisma,
  createTestUser,
  cleanupTestData,
} from './helpers';

describe('My Feature', () => {
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
    it('should return data', async () => {
      // Arrange
      const user = await createTestUser(prisma);
      
      // Act
      const response = await client
        .get('/api/v1/feature')
        .set('Authorization', `Bearer ${token}`);
      
      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
```

## Available Helper Functions

```typescript
// Create test users
const { user, password } = await createTestUser(prisma, {
  email: 'custom@example.com',
  role: 'producer'
});

// Create test events
const event = await createTestEvent(prisma, producerId, {
  title: 'My Event',
  status: 'published'
});

// Create test orders
const order = await createTestOrder(prisma, userId, eventId, {
  status: 'pending'
});

// Make HTTP requests
const response = await client
  .get('/api/v1/events')
  .set('Authorization', `Bearer ${token}`);

// Assertions
expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.data.id).toBe(eventId);
```

## Debugging Tips

### Check Database State During Test
```typescript
it('should create user', async () => {
  const response = await client
    .post('/api/v1/auth/register')
    .send({ email: 'test@example.com', name: 'Test', password: 'Pass123!' });
  
  // Pause and check database manually
  const user = await prisma.user.findUnique({
    where: { email: 'test@example.com' }
  });
  console.log('User in DB:', user);
  
  expect(user).toBeDefined();
});
```

### Run Single Test
```bash
npm run test:integration -- --grep "should create user"
```

### Verbose Logging
```bash
npm run test:integration -- --reporter=verbose
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No database URL" | Set `TEST_DATABASE_URL` or `DATABASE_URL` env var |
| Tests timeout | Ensure PostgreSQL is running |
| Port already in use | Not using a port - tests use in-process Express |
| Foreign key errors | Tests handle cleanup order - shouldn't happen |
| Rate limit errors | Expected during rapid test runs - tests handle it |

## File Locations

```
src/tests/integration/
├── README.md                      ← Full documentation
├── QUICKSTART.md                  ← This file
├── setup.ts                       ← Global setup
├── helpers.ts                     ← Utility functions
├── vitest.integration.config.ts   ← Vitest config
├── auth.integration.test.ts       ← Auth tests
├── events.integration.test.ts     ← Event tests
└── orders.integration.test.ts     ← Order tests
```

## Performance

- Single test: ~10-50ms
- Full suite: ~2-5 seconds
- Setup/teardown: ~500ms

## Next Steps

1. Run `npm run test:integration` to verify setup
2. Check test output for any errors
3. Review `README.md` for detailed documentation
4. Create new test files following examples
5. Add tests for any new endpoints

## Getting Help

- Read `README.md` for comprehensive documentation
- Check existing test files for patterns
- Use `--grep` to run specific tests
- Use `--reporter=verbose` for detailed output
