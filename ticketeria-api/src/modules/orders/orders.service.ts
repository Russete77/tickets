import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { buildCursorPagination, formatPaginatedResponse, PaginatedResponse } from '../../shared/pagination';
import { Order, OrderStatus } from '../../generated/prisma/client';

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface GetOrdersFilters {
  status?: OrderStatus;
  eventId?: string;
}

export class OrdersService {
  /**
   * Obtém pedidos do usuário com paginação por cursor
   */
  static async getMyOrders(
    userId: string,
    pagination: PaginationParams,
    filters?: GetOrdersFilters,
  ): Promise<PaginatedResponse<Order>> {
    const cursorParams = buildCursorPagination({
      cursor: pagination.cursor,
      limit: pagination.limit || 20,
      direction: pagination.direction || 'forward',
    });

    const where: GetOrdersFilters & { userId: string } = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.eventId) {
      where.eventId = filters.eventId;
    }

    const orders = await prisma.order.findMany({
      where,
      ...cursorParams,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            startsAt: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
            holderName: true,
            priceCents: true,
          },
        },
      },
    });

    const limit = pagination.limit || 20;
    return formatPaginatedResponse(orders, limit);
  }

  /**
   * Obtém um pedido específico por ID
   * Garante que o usuário só possa ver seus próprios pedidos
   */
  static async getOrderById(orderId: string, userId: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImageUrl: true,
            startsAt: true,
          },
        },
        tickets: {
          select: {
            id: true,
            status: true,
            holderName: true,
            holderCpf: true,
            holderEmail: true,
            priceCents: true,
            checkedInAt: true,
            ticketHash: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Pedido não encontrado');
    }

    if (order.userId !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar este pedido');
    }

    return order;
  }

  /**
   * Cancela um pedido (apenas se estiver pendente)
   */
  static async cancelOrder(orderId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<Order> {
    // Busca o pedido
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Pedido não encontrado');
    }

    // Valida propriedade
    if (order.userId !== userId) {
      throw new ForbiddenError('Você não tem permissão para cancelar este pedido');
    }

    // Valida status
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestError(
        `Pedido com status '${order.status}' não pode ser cancelado. Apenas pedidos pendentes podem ser cancelados.`,
      );
    }

    // Cancela o pedido em transação
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // Atualiza status do pedido
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.cancelled,
        },
        include: {
          tickets: true,
        },
      });

      // Cancela todos os tickets associados
      await tx.ticket.updateMany({
        where: { orderId },
        data: {
          status: 'cancelled',
        },
      });

      return updated;
    });

    // Log de auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.ORDER_CANCELLED,
      entityType: 'Order',
      entityId: orderId,
      metadata: {
        reason: 'User cancelled',
        ticketCount: cancelledOrder.tickets.length,
      },
      ipAddress,
      userAgent,
    });

    return cancelledOrder;
  }

  /**
   * Atualiza status de um pedido (uso interno, ex: webhook de pagamento)
   */
  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    metadata?: Record<string, any>,
  ): Promise<Order> {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        ...(newStatus === OrderStatus.paid && { paidAt: new Date() }),
      },
    });

    return order;
  }

  /**
   * Obtém total de tickets vendidos para um evento
   */
  static async getEventSalesStats(eventId: string): Promise<{
    totalOrders: number;
    paidOrders: number;
    totalRevenueCents: number;
    ticketsSold: number;
  }> {
    const [orderStats, ticketStats] = await Promise.all([
      prisma.order.aggregate({
        where: { eventId },
        _count: true,
        _sum: { totalCents: true },
      }),
      prisma.order.aggregate({
        where: {
          eventId,
          status: OrderStatus.paid,
        },
        _count: true,
        _sum: { totalCents: true },
      }),
      prisma.ticket.count({
        where: {
          eventId,
          status: {
            in: ['active', 'used', 'transferred'],
          },
        },
      }),
    ]);

    const ticketCount = await prisma.ticket.count({
      where: {
        eventId,
        status: {
          in: ['active', 'used', 'transferred'],
        },
      },
    });

    return {
      totalOrders: orderStats._count,
      paidOrders: ticketStats._count,
      totalRevenueCents: ticketStats._sum.totalCents || 0,
      ticketsSold: ticketCount,
    };
  }
}
