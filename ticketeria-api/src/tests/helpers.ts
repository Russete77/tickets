import { User, UserRole, Event, EventStatus, Order, OrderStatus, Ticket, TicketStatus, TicketBatch } from '../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Factory function to create a mock user
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: uuidv4(),
    email: 'test@example.com',
    cpf: '12345678901',
    name: 'Test User',
    phone: '11999999999',
    passwordHash: 'hashed_password123',
    emailVerified: true,
    totpEnabled: false,
    totpSecret: null,
    role: UserRole.consumer,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory function to create a mock event
 */
export function createMockEvent(overrides?: Partial<Event>): Event {
  return {
    id: uuidv4(),
    producerId: uuidv4(),
    title: 'Test Event',
    slug: 'test-event-abc123',
    description: 'A test event',
    shortDescription: 'Test event',
    category: 'Music',
    venueName: 'Test Venue',
    venueAddress: '123 Test Street',
    venueLat: new Decimal('23.5505'),
    venueLng: new Decimal('-46.6333'),
    venueCapacity: 1000,
    coverImageUrl: 'https://example.com/image.jpg',
    startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
    doorsOpenAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: EventStatus.draft,
    tags: ['music', 'party'],
    ageRating: 'Livre',
    dressCode: null,
    isOpenBar: false,
    lineup: ['DJ XYZ'],
    rules: 'No outside drinks',
    maxTicketsPerCpf: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory function to create a mock ticket batch
 */
export function createMockTicketBatch(overrides?: Partial<TicketBatch>): TicketBatch {
  return {
    id: uuidv4(),
    eventId: uuidv4(),
    name: 'Lote 1',
    priceCents: 10000, // R$ 100.00
    quantity: 100,
    type: 'regular',
    startsAt: new Date(),
    endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    autoSwitch: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory function to create a mock order
 */
export function createMockOrder(overrides?: Partial<Order>): Order {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    eventId: uuidv4(),
    status: OrderStatus.pending,
    totalPriceCents: 10000,
    paymentMethod: 'pix',
    externalPaymentId: null,
    pixQrCode: null,
    pixCopyPaste: null,
    cardLastDigits: null,
    cardExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory function to create a mock ticket
 */
export function createMockTicket(overrides?: Partial<Ticket>): Ticket {
  return {
    id: uuidv4(),
    orderId: uuidv4(),
    eventId: uuidv4(),
    batchId: uuidv4(),
    holderId: uuidv4(),
    status: TicketStatus.active,
    holderName: 'John Doe',
    holderCpf: '12345678901',
    holderEmail: 'john@example.com',
    priceCents: 10000,
    ticketHash: 'abc123def456',
    totpSecret: null,
    checkedInAt: null,
    transferredAt: null,
    transferredFromUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Factory function to create a mock producer user
 */
export function createMockProducer(overrides?: Partial<User>): User {
  return createMockUser({
    role: UserRole.producer,
    email: 'producer@example.com',
    ...overrides,
  });
}
