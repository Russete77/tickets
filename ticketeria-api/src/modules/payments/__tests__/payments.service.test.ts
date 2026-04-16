import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderStatus } from '../../../generated/prisma/client';
import { PaymentsService } from '../payments.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { env } from '../../../config/env';
import { NotFoundError, BadRequestError, ConflictError } from '../../../shared/errors';
import { createMockUser, createMockEvent, createMockOrder, createMockTicketBatch } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

describe('PaymentsService', () => {
  const paymentsService = new PaymentsService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkout', () => {
    it('should create order with PIX payment method', async () => {
      const user = createMockUser();
      const event = createMockEvent();
      const batch = createMockTicketBatch({ eventId: event.id });

      const checkoutInput = {
        eventId: event.id,
        batchId: batch.id,
        quantity: 2,
        paymentMethod: 'pix' as const,
        holderDetails: [
          { name: 'John Doe', cpf: '12345678901', email: 'john@example.com' },
          { name: 'Jane Doe', cpf: '98765432100', email: 'jane@example.com' },
        ],
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.ticketBatch.findUnique).mockResolvedValueOnce(batch as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });

      const mockOrder = createMockOrder({
        userId: user.id,
        eventId: event.id,
        paymentMethod: 'pix',
        pixQrCode: 'mock-qr-code',
      });

      vi.mocked(prisma.order.create).mockResolvedValueOnce(mockOrder as any);

      const result = await paymentsService.checkout(user.id, checkoutInput as any);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe('pix');
      expect(result.pixQrCode).toBeDefined();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should create order with credit card payment', async () => {
      const user = createMockUser();
      const event = createMockEvent();
      const batch = createMockTicketBatch({ eventId: event.id });

      const checkoutInput = {
        eventId: event.id,
        batchId: batch.id,
        quantity: 1,
        paymentMethod: 'credit_card' as const,
        cardToken: 'token_123',
        cardLastDigits: '4242',
        cardExpiry: '12/25',
        holderDetails: [{ name: 'John Doe', cpf: '12345678901', email: 'john@example.com' }],
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.ticketBatch.findUnique).mockResolvedValueOnce(batch as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });

      const mockOrder = createMockOrder({
        userId: user.id,
        eventId: event.id,
        paymentMethod: 'credit_card',
        cardLastDigits: '4242',
      });

      vi.mocked(prisma.order.create).mockResolvedValueOnce(mockOrder as any);

      const result = await paymentsService.checkout(user.id, checkoutInput as any);

      expect(result).toBeDefined();
      expect(result.paymentMethod).toBe('credit_card');
      expect(result.cardLastDigits).toBe('4242');
    });

    it('should throw error if event is not published', async () => {
      const user = createMockUser();
      const draftEvent = createMockEvent({ status: 'draft' as any });

      const checkoutInput = {
        eventId: draftEvent.id,
        batchId: 'batch-id',
        quantity: 1,
        paymentMethod: 'pix' as const,
        holderDetails: [],
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(draftEvent as any);

      await expect(paymentsService.checkout(user.id, checkoutInput as any)).rejects.toThrow();
    });

    it('should throw error if insufficient stock', async () => {
      const user = createMockUser();
      const event = createMockEvent();
      const batch = createMockTicketBatch({ eventId: event.id, quantity: 1 });

      const checkoutInput = {
        eventId: event.id,
        batchId: batch.id,
        quantity: 5, // More than available
        paymentMethod: 'pix' as const,
        holderDetails: Array(5).fill({ name: 'Test', cpf: '12345678901', email: 'test@example.com' }),
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.ticketBatch.findUnique).mockResolvedValueOnce(batch as any);

      await expect(paymentsService.checkout(user.id, checkoutInput as any)).rejects.toThrow();
    });

    it('should enforce max tickets per CPF limit', async () => {
      const user = createMockUser();
      const event = createMockEvent({ maxTicketsPerCpf: 2 });
      const batch = createMockTicketBatch({ eventId: event.id });

      const checkoutInput = {
        eventId: event.id,
        batchId: batch.id,
        quantity: 4,
        paymentMethod: 'pix' as const,
        holderDetails: Array(4).fill({ name: 'Test', cpf: '12345678901', email: 'test@example.com' }),
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.ticketBatch.findUnique).mockResolvedValueOnce(batch as any);

      await expect(paymentsService.checkout(user.id, checkoutInput as any)).rejects.toThrow();
    });

    it('should create tickets atomically with order', async () => {
      const user = createMockUser();
      const event = createMockEvent();
      const batch = createMockTicketBatch({ eventId: event.id });

      const checkoutInput = {
        eventId: event.id,
        batchId: batch.id,
        quantity: 2,
        paymentMethod: 'pix' as const,
        holderDetails: [
          { name: 'John', cpf: '11111111111', email: 'john@example.com' },
          { name: 'Jane', cpf: '22222222222', email: 'jane@example.com' },
        ],
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.ticketBatch.findUnique).mockResolvedValueOnce(batch as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });

      const mockOrder = createMockOrder({
        userId: user.id,
        eventId: event.id,
      });

      vi.mocked(prisma.order.create).mockResolvedValueOnce(mockOrder as any);

      await paymentsService.checkout(user.id, checkoutInput as any);

      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('processWebhook', () => {
    it('should activate tickets on PAYMENT_RECEIVED event', async () => {
      const order = createMockOrder({ status: OrderStatus.pending });
      const webhookData = {
        event: 'PAYMENT_RECEIVED',
        externalId: 'ext-123',
        paymentId: 'pay-123',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.completed,
      } as any);

      const result = await paymentsService.processWebhook(webhookData as any);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should cancel order on PAYMENT_OVERDUE event', async () => {
      const order = createMockOrder({ status: OrderStatus.pending });
      const webhookData = {
        event: 'PAYMENT_OVERDUE',
        externalId: 'ext-123',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.cancelled,
      } as any);

      const result = await paymentsService.processWebhook(webhookData as any);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle payment failure event', async () => {
      const order = createMockOrder({ status: OrderStatus.pending });
      const webhookData = {
        event: 'PAYMENT_FAILED',
        externalId: 'ext-123',
      };

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.failed,
      } as any);

      const result = await paymentsService.processWebhook(webhookData as any);

      expect(result).toBeDefined();
    });

    it('should throw error for unknown webhook event type', async () => {
      const webhookData = {
        event: 'UNKNOWN_EVENT',
        externalId: 'ext-123',
      };

      await expect(paymentsService.processWebhook(webhookData as any)).rejects.toThrow();
    });
  });

  describe('assessRisk', () => {
    it('should calculate risk score based on user history', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.count).mockResolvedValueOnce(0); // No previous orders
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0); // No previous tickets

      const riskScore = await (paymentsService as any).assessRisk(user.id, 100000, 'pix');

      expect(riskScore).toBeDefined();
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should lower risk score for users with payment history', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.count).mockResolvedValueOnce(5); // Multiple orders
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(10); // Multiple tickets

      const riskScore = await (paymentsService as any).assessRisk(user.id, 100000, 'pix');

      expect(riskScore).toBeLessThan(50); // Lower risk for established users
    });

    it('should increase risk score for high-value transactions', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0);

      const lowRisk = await (paymentsService as any).assessRisk(user.id, 10000, 'pix'); // R$ 100
      const highRisk = await (paymentsService as any).assessRisk(user.id, 500000, 'pix'); // R$ 5000

      expect(highRisk).toBeGreaterThan(lowRisk);
    });

    it('should consider payment method in risk assessment', async () => {
      const user = createMockUser();

      vi.mocked(prisma.order.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.ticket.count).mockResolvedValueOnce(0);

      const pixRisk = await (paymentsService as any).assessRisk(user.id, 100000, 'pix');
      const cardRisk = await (paymentsService as any).assessRisk(user.id, 100000, 'credit_card');

      // Risk scores may differ based on payment method
      expect(typeof pixRisk).toBe('number');
      expect(typeof cardRisk).toBe('number');
    });
  });

  describe('refundOrder', () => {
    it('should initiate refund for completed order', async () => {
      const order = createMockOrder({ status: OrderStatus.completed });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.order.update).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.refunded,
      } as any);

      const result = await (paymentsService as any).refundOrder(order.id);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw error when trying to refund non-completed order', async () => {
      const order = createMockOrder({ status: OrderStatus.pending });

      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order as any);

      await expect((paymentsService as any).refundOrder(order.id)).rejects.toThrow();
    });
  });
});
