import { prisma } from '../../config/database';
import { decrypt, generateTicketHash, generateTotpSecret } from '../../shared/crypto';
import { logAudit, AuditActions } from '../../shared/audit';
import { Order, OrderStatus, Ticket, User } from '../../generated/prisma/client';
import { AsaasWebhookPayload } from '../../types/asaas.types';
import { logger } from '../../shared/logger';

type OrderWithRelations = Order & {
  tickets: Ticket[];
  user: User;
  event: {
    id: string;
    producer: unknown;
  };
};

/**
 * Gerencia o processamento de webhooks de pagamento do Asaas
 */
export class WebhookService {
  /**
   * Processa webhook de pagamento do Asaas
   * Fluxo por método:
   * PIX: PAYMENT_CREATED → PAYMENT_RECEIVED (sem PAYMENT_CONFIRMED)
   * Credit Card: PAYMENT_CREATED → PAYMENT_CONFIRMED → PAYMENT_RECEIVED
   * Boleto: PAYMENT_CREATED → PAYMENT_CONFIRMED → PAYMENT_RECEIVED
   *
   * Ativa tickets em PAYMENT_CONFIRMED (card/boleto) ou PAYMENT_RECEIVED (PIX)
   */
  static async processWebhook(
    event: string,
    payload: AsaasWebhookPayload,
  ): Promise<void> {
    const { payment } = payload;

    if (!payment) {
      logger.warn('Payload de webhook inválido: payment ausente');
      return;
    }

    // Encontra o pedido pelo externalReference (que é o orderId) ou asaasPaymentId
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { asaasPaymentId: payment.id },
          { id: payment.externalReference }, // fallback
        ],
      },
      include: {
        tickets: true,
        user: true,
        event: {
          include: {
            producer: true,
          },
        },
      },
    });

    if (!order) {
      logger.warn({ paymentId: payment.id }, 'Webhook: ordem não encontrada para payment');
      return;
    }

    // Processa de acordo com o tipo de evento
    switch (event) {
      case 'PAYMENT_CONFIRMED':
        // Credit Card e Boleto: confirmar (ainda não recebido)
        if (order.paymentMethod !== 'pix') {
          await this.handlePaymentConfirmed(order);
        }
        break;

      case 'PAYMENT_RECEIVED':
        // Todos os métodos: ativar tickets
        await this.handlePaymentReceived(order);
        break;

      case 'PAYMENT_OVERDUE':
        await this.handlePaymentOverdue(order);
        break;

      case 'PAYMENT_REFUNDED':
        await this.handlePaymentRefunded(order, payment);
        break;

      case 'PAYMENT_PARTIALLY_REFUNDED':
        await this.handlePaymentPartiallyRefunded(order, payment);
        break;

      case 'PAYMENT_CHARGEBACK_REQUESTED':
        await this.handleChargebackRequested(order);
        break;

      case 'PAYMENT_CREATED':
      case 'PAYMENT_AWAITING_RISK_ANALYSIS':
      case 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED':
      case 'PAYMENT_BANK_SLIP_VIEWED':
      default:
        // Log apenas
        logger.info({ event, orderId: order.id }, 'Evento de webhook não processado');
    }
  }

  /**
   * Processa confirmação de pagamento (Credit Card e Boleto)
   * Não ativa os tickets ainda - isso acontece em PAYMENT_RECEIVED
   */
  private static async handlePaymentConfirmed(order: OrderWithRelations): Promise<void> {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        // Marca como confirmado mas não "paid" ainda
        // Alguns sistemas usam um status intermediário aqui
      },
    });

    await logAudit({
      action: AuditActions.PAYMENT_CONFIRMED,
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        asaasPaymentId: order.asaasPaymentId,
        ticketCount: order.tickets.length,
        paymentMethod: order.paymentMethod,
      },
    });
  }

  /**
   * Processa recebimento de pagamento (ativa tickets)
   * Chamado em PAYMENT_RECEIVED (PIX/Card/Boleto)
   */
  private static async handlePaymentReceived(order: OrderWithRelations): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Atualizar status do pedido
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.paid,
          paidAt: new Date(),
        },
      });

      // Ativar todos os tickets com hash e TOTP
      await tx.ticket.updateMany({
        where: { orderId: order.id },
        data: {
          // Neste ponto, pode ser que o hash/totp já tenham sido gerados
          // Ou nós geramos aqui se ainda vazios
          status: 'active',
        },
      });

      // Atualizar tickets individuais com hash/totp se vazios
      const tickets = await tx.ticket.findMany({
        where: { orderId: order.id },
      });

      for (const ticket of tickets) {
        if (!ticket.ticketHash || !ticket.totpSecret) {
          const newHash = generateTicketHash(ticket.id, ticket.eventId, ticket.holderCpf);
          const newTotp = generateTotpSecret();

          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              ticketHash: newHash,
              totpSecret: newTotp,
            },
          });
        }
      }
    });

    await logAudit({
      action: AuditActions.PAYMENT_CONFIRMED,
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        asaasPaymentId: order.asaasPaymentId,
        ticketCount: order.tickets.length,
        paymentMethod: order.paymentMethod,
      },
    });

    // Enfileirar jobs de notificação por email (a implementar)
    // await emailQueue.add('payment-confirmed', { orderId: order.id });
  }

  /**
   * Processa pagamento em atraso
   */
  private static async handlePaymentOverdue(order: OrderWithRelations): Promise<void> {
    // Se não foi pago em 30 minutos, cancela
    const now = new Date();

    if (now > order.expiresAt) {
      await prisma.$transaction(async (tx) => {
        // Cancelar pedido
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.cancelled,
          },
        });

        // Cancelar tickets
        await tx.ticket.updateMany({
          where: { orderId: order.id },
          data: {
            status: 'cancelled',
          },
        });

        // Liberar estoque
        const batchToUpdate = new Map<string, number>();
        for (const ticket of order.tickets) {
          const count = batchToUpdate.get(ticket.batchId) || 0;
          batchToUpdate.set(ticket.batchId, count + 1);
        }

        for (const [batchId, count] of batchToUpdate.entries()) {
          await tx.ticketBatch.update({
            where: { id: batchId },
            data: {
              soldCount: {
                decrement: count,
              },
            },
          });
        }
      });

      // Log de auditoria
      await logAudit({
        action: AuditActions.ORDER_CANCELLED,
        entityType: 'Order',
        entityId: order.id,
        metadata: {
          reason: 'Payment overdue',
          asaasPaymentId: order.asaasPaymentId,
        },
      });
    }
  }

  /**
   * Processa reembolso total
   */
  private static async handlePaymentRefunded(order: OrderWithRelations, payment: Record<string, any>): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Atualizar status do pedido
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.refunded,
        },
      });

      // Marcar tickets como refunded
      await tx.ticket.updateMany({
        where: { orderId: order.id },
        data: {
          status: 'refunded',
        },
      });

      // Liberar estoque
      const batchToUpdate = new Map<string, number>();
      for (const ticket of order.tickets) {
        const count = batchToUpdate.get(ticket.batchId) || 0;
        batchToUpdate.set(ticket.batchId, count + 1);
      }

      for (const [batchId, count] of batchToUpdate.entries()) {
        await tx.ticketBatch.update({
          where: { id: batchId },
          data: {
            soldCount: {
              decrement: count,
            },
          },
        });
      }
    });

    await logAudit({
      action: AuditActions.PAYMENT_REFUNDED,
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        asaasPaymentId: order.asaasPaymentId,
        refundAmount: payment.value || order.totalCents / 100,
      },
    });
  }

  /**
   * Processa reembolso parcial
   */
  private static async handlePaymentPartiallyRefunded(order: OrderWithRelations, payment: Record<string, any>): Promise<void> {
    await logAudit({
      action: 'PAYMENT_PARTIALLY_REFUNDED',
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        asaasPaymentId: order.asaasPaymentId,
        refundAmount: payment.value || 0,
      },
    });
    // Não cancelar ordem nem tickets em reembolso parcial - isso fica a critério da lógica de negócio
  }

  /**
   * Processa requisição de chargeback
   */
  private static async handleChargebackRequested(order: OrderWithRelations): Promise<void> {
    await logAudit({
      action: 'PAYMENT_CHARGEBACK_REQUESTED',
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        asaasPaymentId: order.asaasPaymentId,
        message: 'Chargeback solicitado - verificação necessária',
      },
    });
    // Alertar time de suporte/fraud
  }
}
