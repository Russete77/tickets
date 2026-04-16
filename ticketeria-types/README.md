# @ticketeria/types

Shared TypeScript types for Ticketeria API and Web applications.

## Overview

This package provides a centralized type definition library for the Ticketeria platform, including:

- **Enums**: Framework-agnostic string enums for domain models
- **DTOs**: TypeScript interfaces for API responses
- **Validators**: Zod schemas for request validation
- **API Response Types**: Standardized response wrappers
- **Constants**: Application limits and configuration values

## Installation

```bash
npm install @ticketeria/types
# or with GitHub Packages
npm install @ticketeria/types@npm:@ticketeria/types
```

## Usage

### Importing Enums

```typescript
import { UserRole, EventStatus, OrderStatus } from '@ticketeria/types';

const userRole: UserRole = UserRole.CONSUMER;
const eventStatus: EventStatus = EventStatus.PUBLISHED;
```

### Importing DTOs

```typescript
import { EventDetail, UserProfile, OrderSummary } from '@ticketeria/types';

const event: EventDetail = {
  id: '123',
  title: 'Concert',
  status: EventStatus.PUBLISHED,
  // ... other fields
};
```

### Using Validators

```typescript
import { CreateEventSchema, type CreateEventInput } from '@ticketeria/types';

const input = {
  title: 'New Event',
  slug: 'new-event',
  // ... other fields
};

const result = CreateEventSchema.parse(input);
// or with error handling:
const parsed = CreateEventSchema.safeParse(input);
if (parsed.success) {
  // use parsed.data
}
```

### API Response Types

```typescript
import { ApiResponse, PaginatedResponse } from '@ticketeria/types';

// Single response
const response: ApiResponse<EventDetail> = {
  success: true,
  data: event,
};

// Paginated response
const paginated: PaginatedResponse<EventSummary> = {
  success: true,
  data: events,
  pagination: {
    nextCursor: 'abc123',
    hasMore: true,
    total: 100,
  },
};
```

### Using Constants

```typescript
import { LIMITS } from '@ticketeria/types';

const maxTickets = LIMITS.MAX_TICKETS_PER_CPF; // 4
const pixTimeout = LIMITS.ORDER_EXPIRY_PIX_MS; // 900000 (15 minutes)
```

## Package Structure

```
src/
├── index.ts                 # Re-exports all exports
├── enums.ts                 # All domain enums
├── constants/
│   └── limits.ts           # Application limits and constants
├── dto/                    # Data Transfer Objects
│   ├── auth.dto.ts
│   ├── user.dto.ts
│   ├── event.dto.ts
│   ├── ticket.dto.ts
│   ├── order.dto.ts
│   ├── payment.dto.ts
│   ├── producer.dto.ts
│   ├── checkin.dto.ts
│   ├── affiliate.dto.ts
│   ├── report.dto.ts
│   ├── admin.dto.ts
│   ├── favorite.dto.ts
│   ├── live.dto.ts
│   ├── notification.dto.ts
│   └── index.ts
├── validators/             # Zod validation schemas
│   ├── auth.validators.ts
│   ├── user.validators.ts
│   ├── event.validators.ts
│   ├── ticket.validators.ts
│   ├── order.validators.ts
│   ├── payment.validators.ts
│   ├── producer.validators.ts
│   ├── checkin.validators.ts
│   ├── affiliate.validators.ts
│   ├── report.validators.ts
│   ├── admin.validators.ts
│   └── index.ts
└── api/                    # API response types
    ├── response.ts         # ApiResponse, ApiErrorResponse, PaginatedResponse
    ├── pagination.ts       # Pagination utilities and schemas
    └── index.ts
```

## Enums

All enums mirror Prisma schema definitions but are framework-agnostic string enums:

### User Management
- `UserRole`: CONSUMER, PRODUCER, ADMIN

### Events
- `EventStatus`: DRAFT, PUBLISHED, CANCELLED, FINISHED
- `EventCategory`: SHOW, FESTIVAL, ESPORTE, TEATRO, MUSEU, CURSO, OUTRO
- `BatchType`: REGULAR, VIP, BACKSTAGE, CAMAROTE

### Orders & Payments
- `OrderStatus`: PENDING, PAID, CANCELLED, REFUNDED
- `PaymentMethod`: PIX, CREDIT_CARD, BOLETO

### Tickets
- `TicketStatus`: ACTIVE, USED, TRANSFERRED, CANCELLED, REFUNDED
- `TransferStatus`: PENDING, CONFIRMED, CANCELLED, EXPIRED

### Check-In
- `CheckinResult`: VALID, INVALID_HASH, INVALID_TOTP, ALREADY_USED, WRONG_EVENT, TICKET_CANCELLED, OFFLINE_VALID, OFFLINE_CONFLICT

### Discounts & Notifications
- `DiscountType`: PERCENTAGE, FIXED
- `NotificationType`: EMAIL, PUSH, IN_APP
- `NotificationChannel`: EMAIL, PUSH, IN_APP

### Producer Verification
- `CompanyType`: MEI, ME, EPP, LTDA, SA, INDIVIDUAL
- `AsaasAccountStatus`: PENDING, APPROVED, REJECTED, SUSPENDED
- `DocumentsStatus`: PENDING, SENT, APPROVED, REJECTED

### Events & Media
- `GuestListType`: FREE, VIP, BACKSTAGE, PRESS
- `MediaType`: IMAGE, VIDEO

## Validators

Each module has corresponding validators using Zod:

### Auth Validators
- `LoginSchema`: Email + password validation
- `RegisterSchema`: Registration with CPF validation
- `VerifyEmailSchema`, `RefreshTokenSchema`, `EnableTotpSchema`, etc.

### Event Validators
- `CreateEventSchema`: Full event creation with date validation
- `UpdateEventSchema`: Partial event updates
- `ListEventsSchema`: Filter and pagination support

### Order Validators
- `CreateOrderSchema`: Order with attendees and CPF validation
- `ApplyDiscountSchema`, `CheckoutSchema`, `PaymentConfirmationSchema`

### Payment Validators
- `CardTokenSchema`: Credit card token validation
- `RefundRequestSchema`, `WebhookPayloadSchema`

### All Module Validators
Each module (auth, user, event, ticket, order, payment, producer, checkin, affiliate, report, admin) has comprehensive validators for all operations.

## Build

```bash
npm run build
```

This generates TypeScript declaration files and compiled JavaScript in the `dist/` directory.

## Development

```bash
npm run dev
```

Runs TypeScript compiler in watch mode for development.

## Publishing

The package is configured for GitHub Packages. Set the `NPM_TOKEN` environment variable and publish:

```bash
npm publish
```

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Declaration files generated
- Source maps included

## Dependencies

- **Peer Dependency**: `zod ^3.22` (for validators)
- **Dev Dependencies**: `typescript ^5.3.3`, `zod ^3.22.4`

## License

MIT
