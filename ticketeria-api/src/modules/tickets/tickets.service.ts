import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { generateOtpCode, generateTotpSecret } from '../../shared/crypto';
import { Ticket, TicketTransfer, TicketStatus } from '../../generated/prisma/client';
import { TransferTicketInput, ValidateQRInput } from './tickets.validators';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import { emailService } from '../notifications/email.service';
import { emitWebhookSafe } from '../webhooks-outbound/webhook-emit.helper';

/**
 * Serviço de gerenciamento de ingressos
 */
export class TicketsService {
  private readonly OTP_EXPIRY_MINUTES = 15;
  private readonly TOTP_WINDOW = 30;

  /**
   * Obtém ingressos ativos do usuário agrupados por evento
   */
  async getMyTickets(userId: string): Promise<Array<Ticket & {
    event: {
      id: string;
      title: string;
      slug: string;
      startsAt: Date;
      coverImageUrl: string | null;
      venueName: string | null;
    };
    batch: {
      id: string;
      name: string;
      type: string;
    };
  }>> {
    const tickets = await prisma.ticket.findMany({
      where: {
        holderId: userId,
        status: { in: ['active', 'transferred'] },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            coverImageUrl: true,
            venueName: true,
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        event: {
          startsAt: 'asc',
        },
      },
    });

    return tickets;
  }

  /**
   * Obtém um ingresso específico
   */
  async getTicketById(ticketId: string, userId: string): Promise<Ticket & {
    event: unknown;
    batch: unknown;
  }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
        batch: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ingresso não encontrado');
    }

    if (ticket.holderId !== userId) {
      throw new ForbiddenError('Você não tem permissão para visualizar este ingresso');
    }

    return ticket;
  }

  /**
   * Gera QR code TOTP para o ingresso
   */
  async generateTicketQR(ticketId: string, userId: string): Promise<{ qrCode: string; secret: string }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundError('Ingresso não encontrado');
    }

    if (ticket.holderId !== userId) {
      throw new ForbiddenError('Você não tem permissão para gerar QR deste ingresso');
    }

    if (ticket.status === 'used') {
      throw new BadRequestError('Este ingresso já foi utilizado');
    }

    if (ticket.status === 'cancelled') {
      throw new BadRequestError('Este ingresso foi cancelado');
    }

    // Gerar TOTP para o ingresso
    const secret = ticket.totpSecret;

    // Gerar URL de autenticação para QR code
    const keyuri = authenticator.keyuri(ticket.holderName, 'Ticketeria', secret);

    // Cache TOTP atual por 2 minutos
    const token = authenticator.generate(secret);

    await redis.setex(`ticket:totp:${ticketId}`, 120, token);

    return {
      qrCode: keyuri,
      secret,
    };
  }

  /**
   * Inicia transferência de ingresso
   */
  async initiateTransfer(ticketId: string, holderId: string, data: TransferTicketInput): Promise<TicketTransfer> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) {
      throw new NotFoundError('Ingresso não encontrado');
    }

    if (ticket.holderId !== holderId) {
      throw new ForbiddenError('Você não tem permissão para transferir este ingresso');
    }

    if (ticket.status !== 'active') {
      throw new BadRequestError('Apenas ingressos ativos podem ser transferidos');
    }

    // Verificar se data de transferência ainda é válida
    if (new Date(ticket.event.startsAt) <= new Date()) {
      throw new BadRequestError('Não é possível transferir ingressos após o início do evento');
    }

    // Procurar ou criar usuário destinatário
    let toUser = await prisma.user.findUnique({
      where: { email: data.toEmail },
    });

    if (!toUser) {
      // Se não existir, criar um usuário temporário com status pendente
      toUser = await prisma.user.create({
        data: {
          email: data.toEmail,
          cpf: data.toCpf,
          name: data.toName,
          passwordHash: '', // Será necessário completar registro depois
          role: 'consumer',
        },
      });
    } else {
      // Validar se é o mesmo CPF e nome se o usuário já existe
      if (toUser.cpf !== data.toCpf || toUser.name !== data.toName) {
        throw new BadRequestError(
          'Usuário com este email já existe com dados diferentes. Entre em contato com o suporte.',
        );
      }
    }

    // Gerar OTP
    const otpCode = generateOtpCode();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    // Criar transferência
    const transfer = await prisma.ticketTransfer.create({
      data: {
        ticketId,
        fromUserId: holderId,
        toUserId: toUser.id,
        status: 'pending',
        otpCode,
        otpExpiresAt,
      },
    });

    // Armazenar OTP no Redis como backup
    await redis.setex(`transfer:otp:${transfer.id}`, this.OTP_EXPIRY_MINUTES * 60, otpCode);

    // Registrar no audit log
    await logAudit({
      actorId: holderId,
      action: AuditActions.TICKET_TRANSFERRED,
      entityType: 'ticket_transfer',
      entityId: transfer.id,
      metadata: {
        ticketId,
        toUserId: toUser.id,
      },
    });

    // Send OTP email to recipient asynchronously
    emailService.sendTransferRequest(transfer, otpCode).catch((err) => {
      console.error('Failed to send transfer request email:', err);
    });

    return transfer;
  }

  /**
   * Confirma transferência de ingresso
   */
  async confirmTransfer(transferId: string, userId: string, otpCode: string): Promise<Ticket> {
    const transfer = await prisma.ticketTransfer.findUnique({
      where: { id: transferId },
      include: { ticket: true, toUser: true },
    });

    if (!transfer) {
      throw new NotFoundError('Transferência não encontrada');
    }

    if (transfer.toUserId !== userId) {
      throw new ForbiddenError('Você não tem permissão para confirmar esta transferência');
    }

    if (transfer.status !== 'pending') {
      throw new BadRequestError('Esta transferência já foi processada ou cancelada');
    }

    // Validar OTP
    const storedOtp = await redis.get(`transfer:otp:${transferId}`);
    const isValidOtp = storedOtp === otpCode || transfer.otpCode === otpCode;

    if (!isValidOtp) {
      throw new BadRequestError('Código OTP inválido');
    }

    // Verificar expiração
    if (transfer.otpExpiresAt && new Date(transfer.otpExpiresAt) < new Date()) {
      throw new BadRequestError('Código OTP expirado');
    }

    // Atualizar transferência e ingresso em transação
    const updatedTicket = await prisma.$transaction(async (tx) => {
      // Gerar novo TOTP para o ingresso com novo holder
      const newTotpSecret = generateTotpSecret();

      // Atualizar ingresso
      const ticket = await tx.ticket.update({
        where: { id: transfer.ticketId },
        data: {
          holderId: userId,
          holderEmail: (transfer as any).toUser?.email,
          holderCpf: (transfer as any).toUser?.cpf,
          holderName: (transfer as any).toUser?.name,
          totpSecret: newTotpSecret,
          transferCount: { increment: 1 },
          status: 'transferred',
        },
      });

      // Atualizar transferência
      await tx.ticketTransfer.update({
        where: { id: transferId },
        data: { status: 'confirmed' },
      });

      return ticket;
    });

    // Limpar OTP do Redis
    await redis.del(`transfer:otp:${transferId}`);

    // Registrar no audit log
    await logAudit({
      actorId: userId,
      action: 'ticket.transfer_confirmed',
      entityType: 'ticket_transfer',
      entityId: transferId,
      metadata: {
        ticketId: transfer.ticketId,
      },
    });

    // Webhook outbound — Auditoria CTO 2026-05 (gap 4.10)
    await emitWebhookSafe(
      'ticket_transferred',
      {
        ticketId: transfer.ticketId,
        transferId,
        fromUserId: transfer.fromUserId,
        toUserId: transfer.toUserId,
        eventId: updatedTicket.eventId,
      },
      updatedTicket.eventId,
      `ticket_transferred:${transferId}`,
    );

    return updatedTicket;
  }

  /**
   * Obtém histórico de ingressos do usuário (usados/transferidos)
   */
  async getTicketHistory(userId: string): Promise<Ticket[]> {
    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { holderId: userId, status: { in: ['used', 'cancelled'] } },
          { originalBuyerId: userId, status: { in: ['transferred', 'used', 'cancelled'] } },
        ],
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startsAt: true,
            coverImageUrl: true,
          },
        },
        batch: {
          select: {
            name: true,
            type: true,
          },
        },
        transfers: {
          select: {
            id: true,
            toUser: {
              select: {
                id: true,
                name: true,
              },
            },
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return tickets;
  }

  /**
   * Valida ingresso no checkin
   */
  async validateQR(data: ValidateQRInput): Promise<{ isValid: boolean; result: string; ticket?: Ticket }> {
    try {
      // Decodificar dados do QR
      const qrParts = data.qrData.split(':');
      if (qrParts.length < 2) {
        return {
          isValid: false,
          result: 'invalid_hash',
        };
      }

      const [ticketId, ...hashParts] = qrParts;
      const qrHash = hashParts.join(':');

      // Buscar ingresso
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { event: true },
      });

      if (!ticket) {
        return {
          isValid: false,
          result: 'invalid_hash',
        };
      }

      // Verificar se é do evento correto
      if (ticket.eventId !== data.eventId) {
        return {
          isValid: false,
          result: 'wrong_event',
        };
      }

      // Verificar status
      if (ticket.status === 'used') {
        return {
          isValid: false,
          result: 'already_used',
          ticket,
        };
      }

      if (ticket.status === 'cancelled') {
        return {
          isValid: false,
          result: 'ticket_cancelled',
          ticket,
        };
      }

      // Validar hash do ingresso
      const expectedHash = crypto
        .createHash('sha256')
        .update(`${ticketId}:${ticket.eventId}:${ticket.holderCpf}`)
        .digest('hex');

      if (qrHash !== expectedHash.substring(0, 16)) {
        // Validação básica do hash
        return {
          isValid: false,
          result: 'invalid_hash',
          ticket,
        };
      }

      // Validar TOTP se presente
      if (data.qrData.includes(':totp:')) {
        const totpMatch = data.qrData.match(/:totp:([a-z0-9]+)$/);
        if (totpMatch) {
          const providedTotp = totpMatch[1];
          const isValidTotp = authenticator.check(providedTotp, ticket.totpSecret);

          if (!isValidTotp) {
            return {
              isValid: false,
              result: 'invalid_totp',
              ticket,
            };
          }
        }
      }

      // Atualizar ingresso como usado
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'used',
          checkedInAt: new Date(),
          checkedInBy: data.operatorId,
          checkedInDevice: data.deviceId,
        },
      });

      // Registrar log de checkin
      await prisma.checkinLog.create({
        data: {
          ticketId,
          eventId: data.eventId,
          operatorId: data.operatorId,
          deviceId: data.deviceId,
          result: 'valid',
        },
      });

      // Registrar no audit
      await logAudit({
        actorId: data.operatorId,
        action: AuditActions.TICKET_CHECKED_IN,
        entityType: 'ticket',
        entityId: ticketId,
        metadata: {
          eventId: data.eventId,
          deviceId: data.deviceId,
        },
      });

      return {
        isValid: true,
        result: 'valid',
        ticket: {
          ...ticket,
          status: 'used' as TicketStatus,
          checkedInAt: new Date(),
        },
      };
    } catch (error) {
      console.error('QR validation error:', error);
      return {
        isValid: false,
        result: 'invalid_hash',
      };
    }
  }
}
