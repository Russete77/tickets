# Integration Test Examples

This file contains practical examples for writing and extending integration tests.

## Example 1: Simple GET Endpoint Test

```typescript
describe('GET /api/v1/health', () => {
  let client: ReturnType<typeof createTestClient>;
  
  beforeAll(() => {
    client = createTestClient();
  });
  
  it('should return health status', async () => {
    const response = await client
      .get('/api/v1/health')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });
});
```

## Example 2: Creating Test Data

```typescript
describe('Event Creation', () => {
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    prisma = createTestPrisma();
  });
  
  afterEach(async () => {
    await cleanupTestData(prisma);
  });
  
  it('should create event with custom data', async () => {
    // Create a producer user
    const { user: producer } = await createTestUser(prisma, {
      email: 'producer@example.com',
      role: 'producer'
    });
    
    // Create an event with specific fields
    const event = await createTestEvent(prisma, producer.id, {
      title: 'Premium Concert',
      venueCapacity: 5000,
      category: 'show'
    });
    
    expect(event.title).toBe('Premium Concert');
    expect(event.venueCapacity).toBe(5000);
  });
});
```

## Example 3: Testing Authenticated Endpoints

```typescript
describe('User Profile', () => {
  let client: ReturnType<typeof createTestClient>;
  let prisma: PrismaClient;
  let userToken: string;
  
  beforeAll(async () => {
    client = createTestClient();
    prisma = createTestPrisma();
    
    // Create and login a user
    const response = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'user@example.com',
        name: 'Test User',
        password: 'SecurePassword123!',
        cpf: '12345678901',
        phone: '11999999999'
      });
    
    userToken = response.body.data.tokens.accessToken;
  });
  
  it('should get user profile when authenticated', async () => {
    const response = await client
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(response.body.data.email).toBe('user@example.com');
  });
  
  it('should reject request without token', async () => {
    const response = await client
      .get('/api/v1/users/profile')
      .expect(401);
    
    expect(response.body.success).toBe(false);
  });
});
```

## Example 4: Testing Authorization (Role-Based)

```typescript
describe('Producer-Only Endpoints', () => {
  let client: ReturnType<typeof createTestClient>;
  let producerToken: string;
  let consumerToken: string;
  
  beforeAll(async () => {
    client = createTestClient();
    
    // Register producer
    const producerRes = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'producer@example.com',
        name: 'Producer',
        password: 'Pass123!',
        cpf: '11111111111',
        phone: '11999999999'
      });
    
    producerToken = producerRes.body.data.tokens.accessToken;
    
    // Update to producer role
    // (In real scenario, this would be done during registration or through admin)
    
    // Register consumer
    const consumerRes = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'consumer@example.com',
        name: 'Consumer',
        password: 'Pass123!',
        cpf: '22222222222',
        phone: '11988888888'
      });
    
    consumerToken = consumerRes.body.data.tokens.accessToken;
  });
  
  it('should allow producer to create event', async () => {
    const response = await client
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${producerToken}`)
      .send({
        title: 'Producer Event',
        slug: 'producer-event',
        category: 'show',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: '23.5505',
        venueLng: '-46.6333',
        venueCapacity: 1000,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
  });
  
  it('should reject consumer creating event', async () => {
    const response = await client
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${consumerToken}`)
      .send({
        title: 'Consumer Event',
        slug: 'consumer-event',
        category: 'show',
        venueName: 'Venue',
        venueAddress: 'Address',
        venueLat: '23.5505',
        venueLng: '-46.6333',
        venueCapacity: 1000,
        startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
        doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .expect(403);
    
    expect(response.body.success).toBe(false);
  });
});
```

## Example 5: Testing Data Validation

```typescript
describe('User Registration Validation', () => {
  let client: ReturnType<typeof createTestClient>;
  
  beforeAll(() => {
    client = createTestClient();
  });
  
  it('should reject registration with invalid email', async () => {
    const response = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'not-an-email',
        name: 'Test User',
        password: 'ValidPass123!',
        cpf: '12345678901',
        phone: '11999999999'
      })
      .expect(400);
    
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  
  it('should reject registration with weak password', async () => {
    const response = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        password: '123', // Too weak
        cpf: '12345678901',
        phone: '11999999999'
      })
      .expect(400);
    
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
  
  it('should reject registration with missing fields', async () => {
    const response = await client
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com'
        // Missing: name, password, cpf, phone
      })
      .expect(400);
    
    expect(response.body.success).toBe(false);
  });
});
```

## Example 6: Testing Complex Workflows

```typescript
describe('Order Creation and Cancellation Workflow', () => {
  let client: ReturnType<typeof createTestClient>;
  let prisma: PrismaClient;
  let userId: string;
  let eventId: string;
  let userToken: string;
  
  beforeAll(async () => {
    client = createTestClient();
    prisma = createTestPrisma();
    
    // Create user
    const { user: producer } = await createTestUser(prisma, {
      email: 'producer@example.com',
      role: 'producer'
    });
    
    // Create event
    const event = await createTestEvent(prisma, producer.id, {
      status: 'published'
    });
    eventId = event.id;
    
    // Create consumer
    const { user } = await createTestUser(prisma, {
      email: 'consumer@example.com'
    });
    userId = user.id;
    
    // Login consumer
    const loginRes = await client
      .post('/api/v1/auth/login')
      .send({
        email: 'consumer@example.com',
        password: 'TestPassword123!'
      });
    
    userToken = loginRes.body.data.tokens.accessToken;
  });
  
  it('should complete full order workflow', async () => {
    // 1. Create order
    const orderRes = await client
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventId,
        quantities: [{ batchId: 'batch-1', quantity: 2 }],
        paymentMethod: 'pix'
      })
      .expect(201);
    
    const orderId = orderRes.body.data.id;
    expect(orderRes.body.data.status).toBe('pending');
    
    // 2. Retrieve order
    const getRes = await client
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(getRes.body.data.id).toBe(orderId);
    expect(getRes.body.data.eventId).toBe(eventId);
    
    // 3. Cancel order
    const cancelRes = await client
      .post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(cancelRes.body.data.status).toBe('cancelled');
    
    // 4. Verify in database
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });
    expect(order?.status).toBe('cancelled');
  });
});
```

## Example 7: Testing Pagination

```typescript
describe('Pagination', () => {
  let client: ReturnType<typeof createTestClient>;
  let prisma: PrismaClient;
  let userToken: string;
  let eventId: string;
  
  beforeAll(async () => {
    client = createTestClient();
    prisma = createTestPrisma();
    
    // Create test user and get token
    const { user } = await createTestUser(prisma, {
      email: 'paginate@example.com'
    });
    
    const loginRes = await client
      .post('/api/v1/auth/login')
      .send({
        email: 'paginate@example.com',
        password: 'TestPassword123!'
      });
    
    userToken = loginRes.body.data.tokens.accessToken;
    
    // Create event
    const { user: producer } = await createTestUser(prisma, {
      role: 'producer'
    });
    const event = await createTestEvent(prisma, producer.id);
    eventId = event.id;
    
    // Create multiple orders
    for (let i = 0; i < 5; i++) {
      await createTestOrder(prisma, user.id, eventId, {
        status: 'pending'
      });
    }
  });
  
  it('should paginate through orders', async () => {
    // First page
    const page1 = await client
      .get('/api/v1/orders')
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    
    expect(page1.body.data.orders.length).toBeLessThanOrEqual(2);
    
    // Second page using cursor
    if (page1.body.data.nextCursor) {
      const page2 = await client
        .get('/api/v1/orders')
        .query({ limit: 2, cursor: page1.body.data.nextCursor })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      
      expect(page2.body.data.orders.length).toBeGreaterThan(0);
    }
  });
});
```

## Example 8: Testing Error Responses

```typescript
describe('Error Handling', () => {
  let client: ReturnType<typeof createTestClient>;
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    client = createTestClient();
    prisma = createTestPrisma();
  });
  
  afterEach(async () => {
    await cleanupTestData(prisma);
  });
  
  it('should return 404 for non-existent resource', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const response = await client
      .get(`/api/v1/events/${fakeId}`)
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.error.message).toBeDefined();
  });
  
  it('should return 401 for missing authentication', async () => {
    const response = await client
      .get('/api/v1/orders')
      .expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
  
  it('should return 403 for insufficient permissions', async () => {
    // Create two users
    const { user: user1 } = await createTestUser(prisma);
    const { user: user2 } = await createTestUser(prisma, {
      email: 'user2@example.com'
    });
    
    // User1 creates an order
    const event = await createTestEvent(prisma, user1.id);
    const order = await createTestOrder(prisma, user1.id, event.id);
    
    // User2 tries to access it
    const loginRes = await client
      .post('/api/v1/auth/login')
      .send({
        email: 'user2@example.com',
        password: 'TestPassword123!'
      });
    
    const response = await client
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', `Bearer ${loginRes.body.data.tokens.accessToken}`)
      .expect(403);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
```

## Example 9: Testing with Filters and Query Parameters

```typescript
describe('Event Search with Filters', () => {
  let client: ReturnType<typeof createTestClient>;
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    client = createTestClient();
    prisma = createTestPrisma();
    
    // Create producer
    const { user: producer } = await createTestUser(prisma, {
      role: 'producer'
    });
    
    // Create events with different properties
    await createTestEvent(prisma, producer.id, {
      title: 'Rock Concert',
      category: 'show',
      tags: ['music', 'rock'],
      status: 'published'
    });
    
    await createTestEvent(prisma, producer.id, {
      title: 'Jazz Festival',
      category: 'festival',
      tags: ['music', 'jazz'],
      status: 'published'
    });
    
    await createTestEvent(prisma, producer.id, {
      title: 'Theater Play',
      category: 'teatro',
      tags: ['arts'],
      status: 'draft'
    });
  });
  
  it('should filter events by category', async () => {
    const response = await client
      .get('/api/v1/events/search')
      .query({ category: 'show' })
      .expect(200);
    
    const events = response.body.data;
    expect(events.some((e: any) => e.category === 'show')).toBe(true);
  });
  
  it('should search events by title', async () => {
    const response = await client
      .get('/api/v1/events/search')
      .query({ q: 'Rock' })
      .expect(200);
    
    const events = response.body.data;
    expect(events.some((e: any) => e.title.includes('Rock'))).toBe(true);
  });
  
  it('should filter by multiple parameters', async () => {
    const response = await client
      .get('/api/v1/events/search')
      .query({ category: 'show', status: 'published' })
      .expect(200);
    
    const events = response.body.data;
    expect(events.every((e: any) => e.category === 'show' && e.status === 'published')).toBe(true);
  });
});
```

## Tips for Writing Tests

1. **Use Descriptive Names**: `it('should reject login with wrong password')` is better than `it('test login')`

2. **One Assertion Focus**: While multiple assertions are OK, focus on testing one behavior per test

3. **Use beforeEach for Setup**: Reset state between tests to avoid interference

4. **Clean Up After Tests**: Always use `afterEach` with `cleanupTestData()`

5. **Test Error Paths**: Don't just test the happy path, test errors too

6. **Use Helpers**: Use `createTestUser()`, `createTestEvent()` instead of raw queries

7. **Test Both Request and Database**: Verify response AND that data was persisted

8. **Group Related Tests**: Use `describe` blocks to organize tests logically

## Running Your New Tests

```bash
# Run all tests including new ones
npm run test:integration

# Run only your new tests
npm run test:integration -- your-feature.integration.test.ts

# Run with specific pattern
npm run test:integration -- --grep "your test name"

# Watch mode
npm run test:integration:watch
```

## Debugging

Add `console.log` statements in your tests:

```typescript
it('should work', async () => {
  const user = await createTestUser(prisma);
  console.log('Created user:', user);
  
  const response = await client.get('/api/v1/user');
  console.log('Response:', response.body);
  
  expect(response.status).toBe(200);
});
```

Then run with:
```bash
npm run test:integration:watch
```

Output will show in the console.
