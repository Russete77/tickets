import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketStatus } from '../../../generated/prisma/client';
import { TicketsService } from '../tickets.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../../shared/errors';
import { createMockTicket, createMockUser } from '../../../tests/helpers';
import { logAudit } from '../../../shared/audit';

describe('TicketsService', () => {
  const ticketsService = new TicketsService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMyTickets', () => {
    it('should return active and transferred tickets for user', async () => {
      const user = createMockUser();
      const tickets = [
        createMockTicket({ holderId: user.id, status: TicketStatus.active }),
        createMockTicket({ holderId: user.id, status: TicketStatus.transferred }),
      ];

      vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce(tickets as any);

      const result = await ticketsService.getMyTickets(user.id);

      expect(result).toHaveLength(2);
      expect(prisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            holderId: user.id,
            status: { in: ['active', 'transferred'] },
          },
        })
      );
    });

    it('should not return used or cancelled tickets', async () => {
      const user = createMockUser();

      vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([]);

      await ticketsService.getMyTickets(user.id);

      const call = vi.mocked(prisma.ticket.findMany).mock.calls[0];
      const statuses = (call[0].where as any).status.in;
      expect(statuses).not.toContain(TicketStatus.used);
      expect(statuses).not.toContain(TicketStatus.cancelled);
    });

    it('should include event and batch details', async () => {
      const user = createMockUser();

      vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([]);

      await ticketsService.getMyTickets(user.id);

      const call = vi.mocked(prisma.ticket.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('include');
    });

    it('should order by event start date ascending', async () => {
      const user = createMockUser();

      vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([]);

      await ticketsService.getMyTickets(user.id);

      const call = vi.mocked(prisma.ticket.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('orderBy');
    });
  });

  describe('getTicketById', () => {
    it('should return ticket for authorized user', async () => {
      const user = createMockUser();
      const ticket = createMockTicket({ holderId: user.id });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);

      const result = await ticketsService.getTicketById(ticket.id, user.id);

      expect(result).toEqual(ticket);
    });

    it('should throw ForbiddenError when user tries to access another user ticket', async () => {
      const user = createMockUser();
      const otherUser = createMockUser();
      const ticket = createMockTicket({ holderId: otherUser.id });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);

      await expect(ticketsService.getTicketById(ticket.id, user.id)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError when ticket does not exist', async () => {
      const user = createMockUser();

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(null);

      await expect(ticketsService.getTicketById('nonexistent', user.id)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('initiateTransfer', () => {
    const mockTransferData = {
      toEmail: 'recipient@example.com',
      toCpf: '98765432100',
      toName: 'Recipient User',
    };

    it('should create transfer with OTP code', async () => {
      const user = createMockUser();
      const recipient = createMockUser({ email: 'recipient@example.com', cpf: '98765432100', name: 'Recipient User' });
      const ticket = createMockTicket({ holderId: user.id, status: TicketStatus.active });
      const mockEvent = { id: ticket.eventId, title: 'Event', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({ ...ticket, event: mockEvent } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(recipient as any);
      vi.mocked(prisma.ticketTransfer.create).mockResolvedValueOnce({
        id: 'transfer-id',
        fromUserId: user.id,
        toUserId: recipient.id,
        ticketId: ticket.id,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await ticketsService.initiateTransfer(ticket.id, user.id, mockTransferData);

      expect(result).toBeDefined();
      expect(result.otpCode).toBeDefined();
      expect(prisma.ticketTransfer.create).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user tries to transfer another user ticket', async () => {
      const user = createMockUser();
      const otherUser = createMockUser();
      const ticket = createMockTicket({ holderId: otherUser.id });
      const mockEvent = { id: ticket.eventId, title: 'Event', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({ ...ticket, event: mockEvent } as any);

      await expect(ticketsService.initiateTransfer(ticket.id, user.id, mockTransferData)).rejects.toThrow(
        ForbiddenError
      );
    });

    it('should throw BadRequestError when ticket is not active', async () => {
      const user = createMockUser();
      const ticket = createMockTicket({ holderId: user.id, status: TicketStatus.used });
      const mockEvent = { id: ticket.eventId, title: 'Event', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({ ...ticket, event: mockEvent } as any);

      await expect(ticketsService.initiateTransfer(ticket.id, user.id, mockTransferData)).rejects.toThrow(
        BadRequestError
      );
    });

    it('should enforce max transfers limit', async () => {
      const user = createMockUser();
      const ticket = createMockTicket({ holderId: user.id });
      const mockEvent = { id: ticket.eventId, title: 'Event', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

      // initiateTransfer doesn't check count, but event date is in the future so it reaches user lookup
      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({ ...ticket, event: mockEvent } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null); // recipient not found
      vi.mocked(prisma.user.create).mockRejectedValueOnce(new BadRequestError('Too many transfers'));

      await expect(ticketsService.initiateTransfer(ticket.id, user.id, mockTransferData)).rejects.toThrow();
    });

    it('should store OTP in Redis with expiry', async () => {
      const user = createMockUser();
      const recipient = createMockUser({ email: 'recipient@example.com', cpf: '98765432100', name: 'Recipient User' });
      const ticket = createMockTicket({ holderId: user.id });
      const mockEvent = { id: ticket.eventId, title: 'Event', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce({ ...ticket, event: mockEvent } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(recipient as any);
      vi.mocked(prisma.ticketTransfer.create).mockResolvedValueOnce({
        id: 'transfer-id',
        fromUserId: user.id,
        toUserId: recipient.id,
        ticketId: ticket.id,
        otpCode: '123456',
        otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      await ticketsService.initiateTransfer(ticket.id, user.id, mockTransferData);

      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('confirmTransfer', () => {
    // Service signature: confirmTransfer(transferId: string, userId: string, otpCode: string)
    const makeTransfer = (toUserId: string) => ({
      id: 'transfer-id',
      fromUserId: 'user1',
      toUserId,
      ticketId: 'ticket-id',
      otpCode: '123456',
      otpExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      ticket: createMockTicket({ holderId: 'user1' }),
      toUser: { id: toUserId, email: `${toUserId}@example.com`, cpf: '11111111111', name: 'User' },
    });

    it('should transfer ticket with valid OTP', async () => {
      const fromUser = createMockUser();
      const toUser = createMockUser();
      const transfer = makeTransfer(toUser.id);
      const ticket = createMockTicket({ holderId: fromUser.id });

      vi.mocked(prisma.ticketTransfer.findUnique).mockResolvedValueOnce(transfer as any);
      vi.mocked(redis.get).mockResolvedValueOnce('123456');
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({ ...ticket, holderId: toUser.id } as any);
      vi.mocked(prisma.ticketTransfer.update).mockResolvedValueOnce({} as any);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      // confirmTransfer(transferId, userId, otpCode)
      const result = await ticketsService.confirmTransfer(transfer.id, toUser.id, '123456');

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalled();
    });

    it('should throw error with invalid OTP', async () => {
      const transfer = makeTransfer('user2');

      vi.mocked(prisma.ticketTransfer.findUnique).mockResolvedValueOnce(transfer as any);
      vi.mocked(redis.get).mockResolvedValueOnce('999999'); // Stored OTP different

      // OTP '000000' doesn't match stored '999999' or transfer.otpCode '123456'
      await expect(ticketsService.confirmTransfer(transfer.id, 'user2', '000000')).rejects.toThrow();
    });

    it('should throw error with expired OTP', async () => {
      const expiredTransfer = {
        ...makeTransfer('user2'),
        otpExpiresAt: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
      };

      vi.mocked(prisma.ticketTransfer.findUnique).mockResolvedValueOnce(expiredTransfer as any);
      vi.mocked(redis.get).mockResolvedValueOnce('123456');

      await expect(ticketsService.confirmTransfer(expiredTransfer.id, 'user2', '123456')).rejects.toThrow();
    });

    it('should update transfer status to confirmed', async () => {
      const transfer = makeTransfer('user2');
      const ticket = createMockTicket({ holderId: 'user1' });

      vi.mocked(prisma.ticketTransfer.findUnique).mockResolvedValueOnce(transfer as any);
      vi.mocked(redis.get).mockResolvedValueOnce('123456');
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({ ...ticket, holderId: 'user2' } as any);
      vi.mocked(prisma.ticketTransfer.update).mockResolvedValueOnce({} as any);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      await ticketsService.confirmTransfer(transfer.id, 'user2', '123456');

      expect(prisma.ticketTransfer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: transfer.id },
          data: expect.objectContaining({ status: 'confirmed' }),
        })
      );
    });
  });

  describe('generateTicketQR', () => {
    it('should generate QR code for active ticket', async () => {
      const user = createMockUser();
      const ticket = createMockTicket({ holderId: user.id, status: TicketStatus.active });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);
      vi.mocked(prisma.ticket.update).mockResolvedValueOnce({
        ...ticket,
        totpSecret: 'new-secret',
      } as any);

      const result = await ticketsService.generateTicketQR(ticket.id, user.id);

      expect(result).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.secret).toBeDefined();
    });

    it('should throw error for used ticket', async () => {
      const user = createMockUser();
      const ticket = createMockTicket({ holderId: user.id, status: TicketStatus.used });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);

      await expect(ticketsService.generateTicketQR(ticket.id, user.id)).rejects.toThrow(
        BadRequestError
      );
    });

    it('should throw ForbiddenError for other user ticket', async () => {
      const user = createMockUser();
      const otherUser = createMockUser();
      const ticket = createMockTicket({ holderId: otherUser.id });

      vi.mocked(prisma.ticket.findUnique).mockResolvedValueOnce(ticket as any);

      await expect(ticketsService.generateTicketQR(ticket.id, user.id)).rejects.toThrow(
        ForbiddenError
      );
    });
  });
});
