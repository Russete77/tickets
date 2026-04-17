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

  // Certificates
  CERTIFICATE_ISSUED: 'certificate.issued',

  // Credentials
  CREDENTIAL_CREATED: 'credential.created',
  CREDENTIAL_CHECKED_IN: 'credential.checked_in',
  CREDENTIAL_BULK_CREATED: 'credential.bulk_created',
} as const;
