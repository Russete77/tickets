import { prisma } from '../config/database';

interface AuditEntry {
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
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
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata || undefined,
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
} as const;
