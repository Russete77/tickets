# @ticketeria/types - Complete Export Reference

This document lists all exports from the `@ticketeria/types` package.

## Enums (16 total)

### User & Auth
- `UserRole` - consumer | producer | admin
- `CompanyType` - MEI | ME | EPP | LTDA | SA | INDIVIDUAL
- `AsaasAccountStatus` - pending | approved | rejected | suspended
- `DocumentsStatus` - pending | sent | approved | rejected

### Events & Batches
- `EventStatus` - draft | published | cancelled | finished
- `EventCategory` - show | festival | esporte | teatro | museu | curso | outro
- `BatchType` - regular | vip | backstage | camarote
- `GuestListType` - free | vip | backstage | press
- `MediaType` - image | video

### Orders & Payments
- `OrderStatus` - pending | paid | cancelled | refunded
- `PaymentMethod` - pix | credit_card | boleto
- `DiscountType` - percentage | fixed

### Tickets & Transfers
- `TicketStatus` - active | used | transferred | cancelled | refunded
- `TransferStatus` - pending | confirmed | cancelled | expired
- `CheckinResult` - valid | invalid_hash | invalid_totp | already_used | wrong_event | ticket_cancelled | offline_valid | offline_conflict

### Notifications
- `NotificationType` - email | push | in_app
- `NotificationChannel` - email | push | in_app

## DTOs

### Authentication (auth.dto.ts)
- `UserProfile` - Core user information
- `LoginResponse` - Login result with tokens
- `RegisterResponse` - Registration result
- `RefreshTokenResponse` - Token refresh result
- `VerifyEmailResponse` - Email verification result
- `EnableTotpResponse` - TOTP setup result
- `VerifyTotpResponse` - TOTP verification result
- `DisableTotpResponse` - TOTP disable result

### User Management (user.dto.ts)
- `UserProfile` - User details
- `UpdateProfileRequest` - Profile update input
- `UpdateProfileResponse` - Profile update result
- `ChangePasswordRequest` - Password change input
- `ChangePasswordResponse` - Password change result
- `UserSummary` - Minimal user info
- `UserListItem` - User in list context

### Events (event.dto.ts)
- `LineupItem` - Event performer
- `BatchSummary` - Ticket batch info
- `ProducerPublicInfo` - Public producer info
- `EventReviews` - Review statistics
- `EventSummary` - Event overview
- `EventDetail` - Full event details
- `CreateEventRequest` - Event creation input
- `UpdateEventRequest` - Event update input
- `PublishEventResponse` - Publish result
- `CancelEventResponse` - Cancel result
- `EventListResponse` - Event in list

### Tickets (ticket.dto.ts)
- `TicketDetail` - Full ticket information
- `TicketQR` - QR code data
- `TicketSummary` - Minimal ticket info
- `TransferTicketRequest` - Transfer input
- `TransferTicketResponse` - Transfer result
- `TransferOffer` - Pending transfer
- `AcceptTransferResponse` - Accept result
- `DeclineTransferResponse` - Decline result
- `CancelTransferResponse` - Cancel transfer result

### Orders (order.dto.ts)
- `OrderTicketItem` - Ticket in order
- `OrderSummary` - Order overview
- `OrderDetail` - Full order details
- `CreateOrderRequest` - Order creation input
- `CreateOrderResponse` - Order creation result
- `CheckoutResponse` - Checkout result
- `OrderListResponse` - Order in list
- `CancelOrderResponse` - Cancel result
- `OrderConfirmationEmail` - Confirmation email data

### Payments (payment.dto.ts)
- `PixQRData` - PIX QR code data
- `CardTokenRequest` - Card token input
- `BoletoData` - Boleto payment data
- `CheckoutResponse` - Payment checkout result
- `PaymentConfirmation` - Payment confirmation
- `PaymentWebhook` - Webhook payload
- `RefundRequest` - Refund input
- `RefundResponse` - Refund result
- `PaymentMethodInfo` - Payment method details
- `AsaasWebhook` - Asaas webhook payload

### Producer (producer.dto.ts)
- `ProducerPublicInfo` - Public producer info
- `ProducerProfile` - Full producer profile
- `CompanyInfo` - Company details
- `BankingInfo` - Banking information
- `DocumentUpload` - Uploaded document
- `FinancialSummary` - Financial overview
- `StatementEntry` - Financial statement line
- `UpdateProducerRequest` - Profile update input
- `UpdateProducerResponse` - Profile update result
- `VerifyProducerRequest` - Verification input
- `VerifyProducerResponse` - Verification result
- `PayoutResponse` - Payout result
- `ProducerStats` - Producer statistics

### Check-in (checkin.dto.ts)
- `CheckinRequest` - Check-in input
- `CheckinResponse` - Check-in result
- `CapacityInfo` - Event capacity info
- `EventCheckinStats` - Check-in statistics
- `CheckinHistory` - Check-in history entry
- `BulkCheckinRequest` - Bulk check-in input
- `BulkCheckinResponse` - Bulk check-in result
- `CheckinReportResponse` - Check-in report
- `OfflineCheckinSync` - Offline sync data

### Affiliate (affiliate.dto.ts)
- `AffiliateLinkInfo` - Affiliate link details
- `AffiliateStats` - Performance statistics
- `CreateAffiliateRequest` - Creation input
- `CreateAffiliateResponse` - Creation result
- `AffiliateListResponse` - Link in list
- `AffiliatePerformance` - Overall performance
- `PauseAffiliateResponse` - Pause result
- `ResumeAffiliateResponse` - Resume result
- `DeleteAffiliateResponse` - Delete result

### Reports (report.dto.ts)
- `SalesReportEntry` - Sales report line
- `SalesReport` - Sales report
- `CheckinReportEntry` - Check-in report line
- `CheckinReport` - Check-in report
- `RevenueByCategory` - Category breakdown
- `RevenueByPaymentMethod` - Payment method breakdown
- `DetailedSalesReport` - Detailed sales report
- `ExportReportRequest` - Export input
- `ExportReportResponse` - Export result

### Admin (admin.dto.ts)
- `DashboardStats` - Platform statistics
- `UserManagementItem` - User for management
- `SuspendUserRequest` - Suspend input
- `SuspendUserResponse` - Suspend result
- `UnsuspendUserResponse` - Unsuspend result
- `EventModeration` - Event for moderation
- `ApproveEventResponse` - Approval result
- `RejectEventRequest` - Rejection input
- `RejectEventResponse` - Rejection result
- `DisputeCase` - Dispute information
- `ResoluteDisputeRequest` - Resolution input
- `ResolveDisputeResponse` - Resolution result
- `SystemHealthCheck` - System health status
- `AuditLogEntry` - Audit log entry

### Favorite (favorite.dto.ts)
- `FavoriteItem` - Favorited event
- `AddFavoriteRequest` - Add favorite input
- `AddFavoriteResponse` - Add result
- `RemoveFavoriteResponse` - Remove result
- `FavoriteListResponse` - Favorite in list
- `CheckFavoriteResponse` - Check favorite status
- `FavoritesStats` - Favorite statistics

### Live (live.dto.ts)
- `LiveStats` - Live event statistics
- `SocialProofEntry` - Social proof notification
- `StreamMetrics` - Stream metrics
- `ChatMessage` - Chat message
- `LiveNotification` - Live notification
- `StreamState` - Current stream state

### Notifications (notification.dto.ts)
- `NotificationItem` - Single notification
- `CreateNotificationRequest` - Creation input
- `NotificationPreferences` - User preferences
- `UpdateNotificationPreferencesRequest` - Preferences update
- `MarkAsReadRequest` - Mark read input
- `MarkAsReadResponse` - Mark read result
- `ClearNotificationsRequest` - Clear input
- `ClearNotificationsResponse` - Clear result
- `NotificationDigest` - Digest/summary
- `SubscribePushRequest` - Push subscription input
- `SubscribePushResponse` - Push subscription result

## Validators (Zod Schemas)

### Auth Validators (auth.validators.ts)
- `LoginSchema` + `LoginInput`
- `RegisterSchema` + `RegisterInput`
- `VerifyEmailSchema` + `VerifyEmailInput`
- `RefreshTokenSchema` + `RefreshTokenInput`
- `EnableTotpSchema` + `EnableTotpInput`
- `VerifyTotpSchema` + `VerifyTotpInput`
- `DisableTotpSchema` + `DisableTotpInput`
- `ForgotPasswordSchema` + `ForgotPasswordInput`
- `ResetPasswordSchema` + `ResetPasswordInput`

### User Validators (user.validators.ts)
- `UpdateProfileSchema` + `UpdateProfileInput`
- `ChangePasswordSchema` + `ChangePasswordInput`
- `GetUserByIdSchema` + `GetUserByIdInput`
- `ListUsersSchema` + `ListUsersInput`
- `VerifyEmailSchema` + `VerifyEmailInput`
- `ResendVerificationEmailSchema` + `ResendVerificationEmailInput`

### Event Validators (event.validators.ts)
- `EventCategoryEnum` (Zod native enum)
- `EventStatusEnum` (Zod native enum)
- `BatchTypeEnum` (Zod native enum)
- `LineupItemSchema`
- `CreateEventSchema` + `CreateEventInput`
- `UpdateEventSchema` + `UpdateEventInput`
- `GetEventSchema` + `GetEventInput`
- `ListEventsSchema` + `ListEventsInput`
- `PublishEventSchema` + `PublishEventInput`
- `CancelEventSchema` + `CancelEventInput`

### Ticket Validators (ticket.validators.ts)
- `TicketStatusEnum` (Zod native enum)
- `BatchTypeEnum` (Zod native enum)
- `TransferStatusEnum` (Zod native enum)
- `TransferTicketSchema` + `TransferTicketInput`
- `AcceptTransferSchema` + `AcceptTransferInput`
- `DeclineTransferSchema` + `DeclineTransferInput`
- `CancelTransferSchema` + `CancelTransferInput`
- `GetTicketSchema` + `GetTicketInput`
- `ListUserTicketsSchema` + `ListUserTicketsInput`
- `GetTicketQRSchema` + `GetTicketQRInput`
- `ValidateTicketCodeSchema` + `ValidateTicketCodeInput`
- `GetTransfersSchema` + `GetTransfersInput`

### Order Validators (order.validators.ts)
- `OrderStatusEnum` (Zod native enum)
- `PaymentMethodEnum` (Zod native enum)
- `AttendeeSchema`
- `OrderItemSchema`
- `CreateOrderSchema` + `CreateOrderInput`
- `GetOrderSchema` + `GetOrderInput`
- `ListOrdersSchema` + `ListOrdersInput`
- `CancelOrderSchema` + `CancelOrderInput`
- `ApplyDiscountSchema` + `ApplyDiscountInput`
- `CheckoutSchema` + `CheckoutInput`
- `PaymentConfirmationSchema` + `PaymentConfirmationInput`

### Payment Validators (payment.validators.ts)
- `PaymentMethodEnum` (Zod native enum)
- `CardTokenSchema` + `CardTokenInput`
- `CheckoutSchema` + `CheckoutInput`
- `RefundRequestSchema` + `RefundRequestInput`
- `PixWebhookSchema`
- `BoletoWebhookSchema`
- `CardWebhookSchema`
- `WebhookPayloadSchema` + `WebhookPayloadInput`
- `InitiateRefundSchema` + `InitiateRefundInput`
- `ConfirmPaymentSchema` + `ConfirmPaymentInput`

### Producer Validators (producer.validators.ts)
- `CompanyTypeEnum` (Zod native enum)
- `UpdateProducerSchema` + `UpdateProducerInput`
- `CompanyInfoSchema`
- `BankingInfoSchema`
- `DocumentUploadSchema`
- `VerifyProducerSchema` + `VerifyProducerInput`
- `GetProducerSchema` + `GetProducerInput`
- `ListProducersSchema` + `ListProducersInput`
- `GetFinancialSummarySchema` + `GetFinancialSummaryInput`
- `GetStatementSchema` + `GetStatementInput`
- `RequestPayoutSchema` + `RequestPayoutInput`

### Checkin Validators (checkin.validators.ts)
- `CheckinResultEnum` (Zod native enum)
- `CheckinRequestSchema` + `CheckinRequestInput`
- `BulkCheckinSchema` + `BulkCheckinInput`
- `GetCheckinStatsSchema` + `GetCheckinStatsInput`
- `GetCheckinHistorySchema` + `GetCheckinHistoryInput`
- `SyncOfflineCheckinsSchema` + `SyncOfflineCheckinsInput`
- `ValidateCheckinSchema` + `ValidateCheckinInput`
- `ExportCheckinReportSchema` + `ExportCheckinReportInput`

### Affiliate Validators (affiliate.validators.ts)
- `CreateAffiliateSchema` + `CreateAffiliateInput`
- `GetAffiliateLinkSchema` + `GetAffiliateLinkInput`
- `ListAffiliateLinksSchema` + `ListAffiliateLinksInput`
- `GetAffiliateStatsSchema` + `GetAffiliateStatsInput`
- `PauseAffiliateSchema` + `PauseAffiliateInput`
- `ResumeAffiliateSchema` + `ResumeAffiliateInput`
- `DeleteAffiliateSchema` + `DeleteAffiliateInput`
- `GetAffiliatePerformanceSchema` + `GetAffiliatePerformanceInput`

### Report Validators (report.validators.ts)
- `GetSalesReportSchema` + `GetSalesReportInput`
- `GetCheckinReportSchema` + `GetCheckinReportInput`
- `GetDetailedSalesReportSchema` + `GetDetailedSalesReportInput`
- `ExportReportSchema` + `ExportReportInput`
- `GetRevenueAnalyticsSchema` + `GetRevenueAnalyticsInput`
- `GetEventPerformanceSchema` + `GetEventPerformanceInput`
- `CompareEventsSchema` + `CompareEventsInput`

### Admin Validators (admin.validators.ts)
- `UserRoleEnum` (Zod native enum)
- `SuspendUserSchema` + `SuspendUserInput`
- `UnsuspendUserSchema` + `UnsuspendUserInput`
- `PromoteToProducerSchema` + `PromoteToProducerInput`
- `DemoteProducerSchema` + `DemoteProducerInput`
- `ApproveEventSchema` + `ApproveEventInput`
- `RejectEventSchema` + `RejectEventInput`
- `ListUsersSchema` + `ListUsersInput`
- `ListEventsForModerationSchema` + `ListEventsForModerationInput`
- `GetDashboardStatsSchema` + `GetDashboardStatsInput`
- `ResolveDisputeSchema` + `ResolveDisputeInput`
- `GetAuditLogsSchema` + `GetAuditLogsInput`

## API Response Types

### response.ts
- `ApiResponse<T>` - Successful response wrapper
- `ApiErrorResponse` - Error response with code and message
- `PaginatedResponse<T>` - Paginated response wrapper
- `ApiResult<T>` - Union type for success or error

### pagination.ts
- `CursorPaginationParams` - Pagination input parameters
- `CursorPaginationMeta` - Pagination metadata
- `CursorPaginationParamsSchema` - Zod schema for params
- `PaginationMetaSchema` - Zod schema for metadata

## Constants

### limits.ts
- `LIMITS` constant object with:
  - MAX_TICKETS_PER_CPF: 4
  - ORDER_EXPIRY_PIX_MS: 900000
  - ORDER_EXPIRY_CARD_MS: 600000
  - ORDER_EXPIRY_BOLETO_MS: 259200000
  - TOTP_WINDOW: 1
  - TOTP_STEP: 30
  - MAX_TRANSFER_COUNT: 3
  - FLASH_SALE_QUEUE_TTL: 300
  - PAGINATION_DEFAULT_LIMIT: 20
  - PAGINATION_MAX_LIMIT: 100

- `API_LIMITS` constant object with:
  - MAX_FILE_SIZE_MB: 10
  - MAX_IMAGE_SIZE_MB: 5
  - MAX_BULK_OPERATIONS: 100
  - MAX_BATCH_ITEMS: 50

- `TIME_LIMITS` constant object with:
  - EVENT_DESCRIPTION_MAX_CHARS: 5000
  - REVIEW_MAX_CHARS: 500
  - COMMENT_MAX_CHARS: 1000
  - BIO_MAX_CHARS: 500

## Imported From Index

All exports above are available via the main entry point:

```typescript
import {
  // Enums
  UserRole,
  EventStatus,
  
  // DTOs
  EventDetail,
  OrderSummary,
  
  // Validators
  CreateEventSchema,
  
  // API Types
  ApiResponse,
  PaginatedResponse,
  
  // Constants
  LIMITS,
} from '@ticketeria/types';
```

Or import by category:

```typescript
import { CreateEventSchema } from '@ticketeria/types/validators';
import { EventDetail } from '@ticketeria/types/dto';
import { ApiResponse } from '@ticketeria/types/api';
```
