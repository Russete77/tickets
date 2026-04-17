import { prisma } from '../../config/database';
import { NotFoundError, ForbiddenError, BadRequestError, ConflictError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { BoxOfficeSession, Ticket } from '../../generated/prisma/client';
import { OpenSessionInput, CloseSessionInput, SellTicketInput } from './box-office.validators';

/**
 * Serviço de gerenciamento de caixa (box-office)
 * Operações de abertura/fechamento de caixa e venda de ingressos na porta
 */
export class BoxOfficeService {
  /**
   * Abre uma nova sessão de caixa para um evento
   */
  async openSession(
    eventId: string,
    userId: string,
    data: OpenSessionInput,
  ): Promise<BoxOfficeSession> {
    // Verificar se evento existe e se usuário é produtor
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para abrir caixa neste evento');
    }

    // Verificar se já existe sessão aberta
    const existingSession = await prisma.boxOfficeSession.findFirst({
      where: {
        eventId,
        closedAt: null,
      },
    });

    if (existingSession) {
      throw new ConflictError('Já existe uma sessão de caixa aberta para este evento');
    }

    // Criar nova sessão
    const session = await prisma.boxOfficeSession.create({
      data: {
        eventId,
        operatorId: userId,
      },
    });

    // Log de auditoria
    await logAudit({
      userId,
      action: AuditActions.BOX_OFFICE_OPEN,
      resourceType: 'BoxOfficeSession',
      resourceId: session.id,
      details: {
        eventId,
        operatorName: data.operatorName,
      },
    });

    return session;
  }

  /**
   * Fecha uma sessão de caixa e reconcilia valores
   */
  async closeSession(
    sessionId: string,
    userId: string,
    data: CloseSessionInput,
  ): Promise<BoxOfficeSession> {
    // Buscar sessão
    const session = await prisma.boxOfficeSession.findUnique({
      where: { id: sessionId },
      include: {
        event: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Sessão de caixa não encontrada');
    }

    if (session.closedAt) {
      throw new ConflictError('Esta sessão de caixa já foi fechada');
    }

    // Verificar permissão
    if (session.event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para fechar esta sessão de caixa');
    }

    // Atualizar sessão
    const closedSession = await prisma.boxOfficeSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        finalCash: data.cashCount,
        notes: data.notes,
      },
    });

    // Log de auditoria
    await logAudit({
      userId,
      action: AuditActions.BOX_OFFICE_CLOSE,
      resourceType: 'BoxOfficeSession',
      resourceId: sessionId,
      details: {
        eventId: session.eventId,
        cashCount: data.cashCount,
        totalSales: closedSession.totalSales,
      },
    });

    return closedSession;
  }

  /**
   * Vende ingresso na porta
   */
  async sellTicket(
    eventId: string,
    userId: string,
    data: SellTicketInput,
  ): Promise<Ticket[]> {
    // Verificar se evento existe e se usuário é produtor
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para vender ingressos neste evento');
    }

    // Verificar se existe sessão de caixa aberta
    const session = await prisma.boxOfficeSession.findFirst({
      where: {
        eventId,
        closedAt: null,
      },
    });

    if (!session) {
      throw new ConflictError('Não existe uma sessão de caixa aberta para este evento');
    }

    // Verificar disponibilidade do lote
    const batch = await prisma.ticketBatch.findUnique({
      where: { id: data.batchId },
    });

    if (!batch) {
      throw new NotFoundError('Lote de ingressos não encontrado');
    }

    if (batch.eventId !== eventId) {
      throw new BadRequestError('Lote não pertence a este evento');
    }

    const availableTickets = batch.quantity - batch.soldCount;
    if (availableTickets < data.quantity) {
      throw new BadRequestError(
        `Apenas ${availableTickets} ingresso(s) disponível(is) neste lote`,
      );
    }

    // Criar usuário temporário para cliente se necessário
    let customerId = null;
    if (data.customerCpf) {
      // Buscar ou criar usuário com CPF
      let customer = await prisma.user.findUnique({
        where: { cpf: data.customerCpf },
      });

      if (!customer) {
        // Criar usuário temporário para venda na porta
        customer = await prisma.user.create({
          data: {
            email: `door-sale-${Date.now()}@ticketeria.local`,
            cpf: data.customerCpf || `000${Date.now()}`,
            name: data.customerName,
            role: 'consumer',
            passwordHash: '',
          },
        });
      }

      customerId = customer.id;
    }

    // Criar ingressos em transação
    const tickets = await prisma.$transaction(async (tx) => {
      const createdTickets: Ticket[] = [];

      for (let i = 0; i < data.quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            batchId: data.batchId,
            eventId,
            orderId: session.id, // Usar sessionId como orderId para rastreabilidade
            holderId: customerId || userId,
            originalBuyerId: userId,
            holderName: data.customerName,
            holderCpf: data.customerCpf || '',
            holderEmail: `door-sale-${Date.now()}-${i}@ticketeria.local`,
            priceCents: batch.priceCents,
            ticketHash: this.generateTicketHash(),
            totpSecret: this.generateTotpSecret(),
            status: 'active',
          },
        });

        createdTickets.push(ticket);
      }

      // Atualizar contador de vendas do lote
      await tx.ticketBatch.update({
        where: { id: data.batchId },
        data: {
          soldCount: {
            increment: data.quantity,
          },
        },
      });

      // Atualizar session de caixa
      await tx.boxOfficeSession.update({
        where: { id: session.id },
        data: {
          totalSales: {
            increment: batch.priceCents * data.quantity,
          },
          totalTickets: {
            increment: data.quantity,
          },
        },
      });

      return createdTickets;
    });

    // Log de auditoria
    await logAudit({
      userId,
      action: AuditActions.TICKET_SOLD,
      resourceType: 'Ticket',
      resourceId: tickets[0].id,
      details: {
        eventId,
        batchId: data.batchId,
        quantity: data.quantity,
        paymentMethod: data.paymentMethod,
        customerName: data.customerName,
        totalValue: batch.priceCents * data.quantity,
      },
    });

    return tickets;
  }

  /**
   * Gera relatório de vendas do evento
   */
  async getReport(eventId: string) {
    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        batches: true,
        boxOfficeSessions: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Buscar todas as sessões de caixa
    const sessions = await prisma.boxOfficeSession.findMany({
      where: { eventId },
      include: {
        operator: true,
      },
    });

    // Calcular totais
    let totalTicketsSold = 0;
    let totalRevenue = 0;
    let totalCashCount = 0;

    for (const session of sessions) {
      totalTicketsSold += session.totalTickets;
      totalRevenue += session.totalSales;
      if (session.finalCash !== null) {
        totalCashCount += session.finalCash;
      }
    }

    return {
      eventId,
      eventTitle: event.title,
      sessions,
      summary: {
        totalSessions: sessions.length,
        totalTicketsSold,
        totalRevenue,
        averageRevenuePerSession: sessions.length > 0 ? Math.round(totalRevenue / sessions.length) : 0,
        totalCashCount,
      },
    };
  }

  /**
   * Gera dados de impressão para um ingresso
   */
  async printTicket(ticketId: string) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        batch: true,
        event: true,
        holder: true,
      },
    });

    if (!ticket) {
      throw new NotFoundError('Ingresso não encontrado');
    }

    return {
      ticketId: ticket.id,
      ticketHash: ticket.ticketHash,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.startsAt,
      eventVenue: ticket.event.venueName,
      batchName: ticket.batch.name,
      priceCents: ticket.priceCents,
      holderName: ticket.holderName,
      holderCpf: ticket.holderCpf,
      status: ticket.status,
      checkedIn: ticket.checkedInAt ? true : false,
      createdAt: ticket.createdAt,
    };
  }

  /**
   * Gera hash único para ingresso
   */
  private generateTicketHash(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Gera segredo TOTP para ingresso
   */
  private generateTotpSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
