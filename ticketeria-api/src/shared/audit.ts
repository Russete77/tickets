import { prisma } from '../config/database';

interface AuditEntry {
  actorId?: string;
  userId?: string; // Alias for actorId
  action: string;
  entityType?: string;
  entityId?: string;
  resourceType?: string; // Alias for entityType
  resourceId?: string; // Alias for entityId
  metadata?: Record<string, unknown>;
  details?: Record<string, unknown>; // Alias for metadata
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra uma ação no audit log imutável
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId || entry.userId,
        action: entry.action,
        entityType: entry.entityType || entry.resourceType || 'unknown',
        entityId: entry.entityId || entry.resourceId || 'unknown',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (entry.metadata || entry.details || undefined) as any,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  } catch (error) {
    // Audit log nunca deve derrubar a aplicação
    console.error('Failed to write audit log:', error);
  }
}

// Ações padronizadas
export const AuditActions = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_LOGOUT: 'user.logout',
  USER_2FA_ENABLED: 'user.2fa_enabled',
  USER_PASSWORD_RESET: 'user.password_reset',

  // Events
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_PUBLISHED: 'event.published',
  EVENT_CANCELLED: 'event.cancelled',

  // Orders
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_REFUNDED: 'order.refunded',

  // Tickets
  TICKET_EMITTED: 'ticket.emitted',
  TICKET_TRANSFERRED: 'ticket.transferred',
  TICKET_CHECKED_IN: 'ticket.checked_in',
  TICKET_CANCELLED: 'ticket.cancelled',
  TICKET_TOTP_SECRET_VIEWED: 'ticket.totp_secret_viewed',
  TICKET_TOTP_SECRET_ROTATED: 'ticket.totp_secret_rotated',
  TICKET_FRAUD_DUPLICATE_DETECTED: 'ticket.fraud_duplicate_detected',

  // Payments
  PAYMENT_CONFIRMED: 'payment.confirmed',
  PAYMENT_REFUNDED: 'payment.refunded',
  SPLIT_PROCESSED: 'payment.split_processed',

  // Producers
  PRODUCER_CREATED: 'producer.created',
  PRODUCER_APPROVED: 'producer.approved',
  PRODUCER_SUSPENDED: 'producer.suspended',

  // Admin
  USER_BLOCKED: 'admin.user_blocked',
  EVENT_MODERATED: 'admin.event_moderated',

  // Box Office
  BOX_OFFICE_OPEN: 'box_office.open',
  BOX_OFFICE_CLOSE: 'box_office.close',
  TICKET_SOLD: 'box_office.ticket_sold',

  // Staff
  STAFF_ADDED: 'staff.added',
  STAFF_UPDATED: 'staff.updated',
  STAFF_REMOVED: 'staff.removed',
  STAFF_CHECKED_IN: 'staff.checked_in',

  // Store
  STORE_ITEM_CREATED: 'store.item_created',
  STORE_ITEM_UPDATED: 'store.item_updated',
  STORE_ITEM_DELETED: 'store.item_deleted',
  STORE_ITEM_PURCHASED: 'store.item_purchased',

  // Areas
  AREA_CREATED: 'area.created',
  AREA_UPDATED: 'area.updated',
  AREA_DELETED: 'area.deleted',
  AREA_COUNT_UPDATED: 'area.count_updated',

  // Cashless
  CASHLESS_CONFIGURED: 'cashless.configured',
  CASHLESS_TOPUP: 'cashless.topup',
  CASHLESS_PURCHASE: 'cashless.purchase',
  CASHLESS_REFUND: 'cashless.refund',
  CASHLESS_WALLET_CREATED: 'cashless.wallet_created',

  // Cashless admin — Sub-projeto 1 CRUDs (2026-05)
  CASHLESS_CATEGORY_CREATED: 'cashless.category_created',
  CASHLESS_CATEGORY_UPDATED: 'cashless.category_updated',
  CASHLESS_CATEGORY_DELETED: 'cashless.category_deleted',
  CASHLESS_POS_CREATED: 'cashless.pos_created',
  CASHLESS_POS_UPDATED: 'cashless.pos_updated',
  CASHLESS_POS_ARCHIVED: 'cashless.pos_archived',
  CASHLESS_PRODUCT_CREATED: 'cashless.product_created',
  CASHLESS_PRODUCT_UPDATED: 'cashless.product_updated',
  CASHLESS_PRODUCT_ARCHIVED: 'cashless.product_archived',
  CASHLESS_PRODUCT_IMAGE_UPLOADED: 'cashless.product_image_uploaded',
  CASHLESS_CATALOG_CLONED: 'cashless.catalog_cloned',
  CASHLESS_OPERATOR_CREATED: 'cashless.operator_created',
  CASHLESS_OPERATOR_UPDATED: 'cashless.operator_updated',
  CASHLESS_OPERATOR_PIN_RESET: 'cashless.operator_pin_reset',
  CASHLESS_OPERATOR_ARCHIVED: 'cashless.operator_archived',
  CASHLESS_STOCK_MOVEMENT: 'cashless.stock_movement',

  // Certificates
  CERTIFICATE_ISSUED: 'certificate.issued',

  // Credentials
  CREDENTIAL_CREATED: 'credential.created',
  CREDENTIAL_CHECKED_IN: 'credential.checked_in',
  CREDENTIAL_BULK_CREATED: 'credential.bulk_created',

  // Auditoria CTO 2026-05 — multi-tenancy (gap 4.1)
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_MEMBER_INVITED: 'organization.member_invited',
  ORGANIZATION_MEMBER_ROLE_CHANGED: 'organization.member_role_changed',
  ORGANIZATION_MEMBER_REMOVED: 'organization.member_removed',
  ORGANIZATION_INVITE_ACCEPTED: 'organization.invite_accepted',

  // API keys (gap 4.10)
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',

  // Webhook outbound (gap 4.10)
  WEBHOOK_SUBSCRIPTION_CREATED: 'webhook_subscription.created',
  WEBHOOK_SUBSCRIPTION_DELETED: 'webhook_subscription.deleted',

  // Ledger (gap 4.5)
  LEDGER_EVENT_CLOSED: 'ledger.event_closed',

  // LGPD (Fase 2.5)
  LGPD_DATA_EXPORT_REQUESTED: 'lgpd.data_export_requested',
  LGPD_DATA_EXPORT_COMPLETED: 'lgpd.data_export_completed',
  LGPD_USER_ANONYMIZED: 'lgpd.user_anonymized',

  // POS devices (app kiosk)
  POS_DEVICE_PAIR_CODE_ISSUED: 'pos_device.pair_code_issued',
  POS_DEVICE_PAIRED: 'pos_device.paired',
  POS_DEVICE_REVOKED: 'pos_device.revoked',

  // Customer Orders — Engine 5 (2026-05)
  CUSTOMER_ORDER_CREATED: 'customer_order.created',
  CUSTOMER_ORDER_STATUS_CHANGED: 'customer_order.status_changed',
  CUSTOMER_ORDER_CANCELLED: 'customer_order.cancelled',
} as const;
