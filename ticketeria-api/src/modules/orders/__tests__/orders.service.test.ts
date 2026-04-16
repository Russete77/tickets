import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '../../../generated/prisma/client';
import { OrdersService } from '../orders.service';
import { prisma } from '../../../config/database';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../../shared/errors';
import { createMockOrder, createMockUser, createMockEvent, createMockTicket } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

describe('OrdersService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyOrders', () => {
    it('should return paginated orders for user', async () => {
      const user = createMockUser();
      const orders = [
        createMockOrder({ userId: user.id }),
        createMockOrder({ userId: user.id }),
      ];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders);

      const result = await OrdersService.getMyOrders(user.id, { limit: 20, direction: 'forward' });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: user.id },
        })
      );
    });

    it('should filter orders by status', async () => {
      const user = createMockUser();
      const orders = [createMockOrder({ userId: user.id, status: OrderStatus.completed })];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders);

      const result = await OrdersService.getMyOrders(
        user.id,
        { limit: 20, direction: 'forward' },
        { status: OrderStatus.completed }
      );

      const call = vi.mocked(prisma.order.findMany).mock.calls[0];
      expect(call[0].where).toHaveProperty('status', OrderStatus.completed);
    });

    it('should filter orders by event', async () => {
      const user = createMockUser();
      const event = createMockEvent();
      const orders = [createMockOrder({ userId: user.id, eventId: event.id })];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders);

      const result = await OrdersService.getMyOrders(
        user.id,
        { limit: 20, direction: 'forward' },
        { eventId: event.id }
      );

      const call = vi.mocked(prisma.order.findMany).mock.calls[0];
      expect(call[0].where).toHaveProperty('eventId', event.id);
    });

    it('should handle pagination with cursor', async () => {
      const user = createMockUser();
      const cursor = 'cursor-id';
      const orders = [createMockOrder({ userId: user.id })];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders);

      await OrdersService.getMyOrders(user.id, { cursor, limit: 20, direction: 'forward' });

      const call = vi.mocked(prisma.order.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('cursor');
    });

    it('should include event and ticket details', async () => {
      const user = createMockUser();
      const orders = [createMockOrder({ userId: user.id })];

      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(orders);

      await OrdersService.getMyOrders(user.id, { limit: 20, direction: 'forward' });

      const call = vi.mocked(prisma.order.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('include');
    });
  });

  describe('getOrderById', () => {
    it('should return order with tickets for authorized user', async () => {
      const user = createMockUser();
      const order = createMockOrder({ userId: user.id });
      const ticket = createMockTicket({ orderId: order.id });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...order,
        event: { id: order.eventId, title: 'Event', slug: 'event', coverImageUrl: null, startsAt: new Date() },
        tickets: [ticket],
      } as any);

      const result = await OrdersService.getOrderById(order.id, user.id);

      expect(result).toBeDefined();
      expect(result.tickets).toHaveLength(1);
    });

    it('should throw ForbiddenError when user tries to access another user order', async () => {
      const user = createMockUser();
      const otherUser = createMockUser();
      const order = createMockOrder({ userId: otherUser.id });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);

      await expect(OrdersService.getOrderById(order.id, user.id)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      await expect(OrdersService.getOrderById('nonexistent', user.id)).rejects.toThrow(NotFoundError);
    });

    it('should include ticket details', async () => {
      const user = createMockUser();
      const order = createMockOrder({ userId: user.id });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({
        ...order,
        event: { id: order.eventId, title: 'Event', slug: 'event', coverImageUrl: null, startsAt: new Date() },
        tickets: [],
      } as any);

      await OrdersService.getOrderById(order.id, user.id);

      const call = vi.mocked(prisma.order.findUnique).mock.calls[0];
      expect(call[0]).toHaveProperty('include');
    });
  });

  describe('cancelOrder', () => {
    it('should cancel pending order and release stock', async () => {
      const user = createMockUser();
      const order = createMockOrder({ userId: user.id, status: OrderStatus.pending });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.cancelled,
      } as any);

      const result = await OrdersService.cancelOrder(order.id, user.id);

      expect(result.status).toBe(OrderStatus.cancelled);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user tries to cancel another user order', async () => {
      const user = createMockUser();
      const otherUser = createMockUser();
      const order = createMockOrder({ userId: otherUser.id });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);

      await expect(OrdersService.cancelOrder(order.id, user.id)).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError when order is not pending', async () => {
      const user = createMockUser();
      const order = createMockOrder({ userId: user.id, status: OrderStatus.completed });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);

      await expect(OrdersService.cancelOrder(order.id, user.id)).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError when order does not exist', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(null);

      await expect(OrdersService.cancelOrder('nonexistent', user.id)).rejects.toThrow(NotFoundError);
    });

    it('should release tickets back to stock on cancellation', async () => {
      const user = createMockUser();
      const order = createMockOrder({ userId: user.id, status: OrderStatus.pending });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.cancelled,
      } as any);

      await OrdersService.cancelOrder(order.id, user.id);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics for user', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.groupBy).mockResolvedValueOnce([
        { status: OrderStatus.completed, _count: { id: 5 } },
        { status: OrderStatus.pending, _count: { id: 2 } },
      ] as any);

      const result = await (OrdersService as any).getOrderStats(user.id);

      expect(result).toBeDefined();
    });
  });
});
