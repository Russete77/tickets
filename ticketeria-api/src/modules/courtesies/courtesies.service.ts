import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { RequestCourtesyInput, ListCourtesiesInput } from './courtesies.validators';
import crypto from 'crypto';

interface CourtesyResponse {
  id: string;
  eventId: string;
  batchId: string | null;
  requestedBy: string;
  approvedBy: string | null;
  recipientName: string;
  recipientCpf: string | null;
  recipientEmail: string | null;
  reason: string | null;
  status: string;
  ticketId: string | null;
  maxQuantity: number;
  issuedAt: Date | null;
  createdAt: Date;
}

interface CourtesyReport {
  total: number;
  pending: number;
  approved: number;
  issued: number;
  expired: number;
  revoked: number;
  byRequester: Array<{
    requestedBy: string;
    count: number;
  }>;
  totalIssued: number;
}

/**
 * Serviço de gerenciamento de cortesias
 */
export class CourtesiesService {
  /**
   * Solicita uma cortesia para um evento
   */
  async requestCourtesy(
    eventId: string,
    userId: string,
    userRole: string,
    input: RequestCourtesyInput,
  ): Promise<CourtesyResponse> {
    // Verificar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, producerId: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Validar permissão: apenas produtor do evento ou admin
    if (userRole !== 'admin' && event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para solicitar cortesias neste evento');
    }

    // Se batchId fornecido, validar que existe
    if (input.batchId) {
      const batch = await prisma.ticketBatch.findUnique({
        where: { id: input.batchId },
        select: { eventId: true },
      });

      if (!batch || batch.eventId !== eventId) {
        throw new NotFoundError('Lote não encontrado neste evento');
      }
    }

    // Criar courtesy com status courtesy_pending
    const courtesy = await prisma.courtesy.create({
      data: {
        eventId,
        batchId: input.batchId || null,
        requestedBy: userId,
        recipientName: input.recipientName,
        recipientCpf: input.recipientCpf || null,
        recipientEmail: input.recipientEmail || null,
        reason: input.reason || null,
        maxQuantity: input.maxQuantity,
        status: 'courtesy_pending',
      },
    });

    return this.formatCourtesy(courtesy);
  }

  /**
   * Lista cortesias com paginação e filtros
   */
  async listCourtesies(
    eventId: string,
    userId: string,
    userRole: string,
    filters: ListCourtesiesInput,
  ): Promise<PaginatedResponse<CourtesyResponse>> {
    // Validar que produtor só pode acessar seus eventos
    if (userRole !== 'admin') {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { producerId: true },
      });

      if (!event || event.producerId !== userId) {
        throw new ForbiddenError('Você não tem permissão para visualizar cortesias deste evento');
      }
    }

    const paginationParams = buildCursorPagination(filters);

    const where: any = { eventId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.requestedBy) {
      where.requestedBy = filters.requestedBy;
    }

    const courtesies = await prisma.courtesy.findMany({
      where,
      ...paginationParams,
    });

    const formatted = courtesies.map((c) => this.formatCourtesy(c));

    return formatPaginatedResponse(formatted, filters.limit);
  }

  /**
   * Aprova uma cortesia e gera um ingresso gratuito
   */
  async approveCourtesy(
    courtesyId: string,
    userId: string,
    userRole: string,
  ): Promise<CourtesyResponse> {
    // Buscar cortesia com evento
    const courtesy = await prisma.courtesy.findUnique({
      where: { id: courtesyId },
      include: { event: { select: { producerId: true } } },
    });

    if (!courtesy) {
      throw new NotFoundError('Cortesia não encontrada');
    }

    // Validar permissão
    if (userRole !== 'admin' && courtesy.event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para aprovar esta cortesia');
    }

    // Validar status
    if (courtesy.status !== 'courtesy_pending') {
      throw new BadRequestError('Apenas cortesias pendentes podem ser aprovadas');
    }

    // Usar transação para garantir atomicidade
    const updated = await prisma.$transaction(async (tx) => {
      // Atualizar para approved
      const approvedCourtesy = await tx.courtesy.update({
        where: { id: courtesyId },
        data: {
          status: 'approved',
          approvedBy: userId,
        },
      });

      // Determinar qual batch usar
      let batchId = courtesy.batchId;
      if (!batchId) {
        // Buscar primeiro batch disponível do evento
        const batch = await tx.ticketBatch.findFirst({
          where: {
            eventId: courtesy.eventId,
            isVisible: true,
          },
          orderBy: { sortOrder: 'asc' },
        });

        if (!batch) {
          throw new NotFoundError('Nenhum lote disponível para este evento');
        }

        batchId = batch.id;
      }

      // Criar ordem fictícia para o ingresso gratuito
      const order = await tx.order.create({
        data: {
          userId: userId, // Usar o aprovador como "comprador" temporário
          eventId: courtesy.eventId,
          status: 'paid',
          totalCents: 0,
          platformFeeCents: 0,
          paymentMethod: 'pix',
          paidAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
          ipAddress: '127.0.0.1',
          userAgent: 'system',
          deviceFingerprint: 'courtesy',
        },
      });

      // Gerar hash do ingresso
      const ticketHash = crypto
        .createHash('sha256')
        .update(`${courtesyId}-${Date.now()}-${Math.random()}`)
        .digest('hex');

      // Gerar TOTP secret
      const totpSecret = crypto.randomBytes(20).toString('hex');

      // Criar ingresso com priceCents = 0
      const ticket = await tx.ticket.create({
        data: {
          orderId: order.id,
          batchId,
          eventId: courtesy.eventId,
          holderId: userId,
          originalBuyerId: userId,
          status: 'active',
          ticketHash,
          totpSecret,
          holderName: courtesy.recipientName,
          holderCpf: courtesy.recipientCpf || '',
          holderEmail: courtesy.recipientEmail || '',
          priceCents: 0,
        },
      });

      // Atualizar courtesy com ticketId e status issued
      return await tx.courtesy.update({
        where: { id: courtesyId },
        data: {
          ticketId: ticket.id,
          status: 'issued',
          issuedAt: new Date(),
        },
      });
    });

    return this.formatCourtesy(updated);
  }

  /**
   * Rejeita uma cortesia se ainda estiver pendente
   */
  async rejectCourtesy(
    courtesyId: string,
    userId: string,
    userRole: string,
  ): Promise<CourtesyResponse> {
    // Buscar cortesia com evento
    const courtesy = await prisma.courtesy.findUnique({
      where: { id: courtesyId },
      include: { event: { select: { producerId: true } } },
    });

    if (!courtesy) {
      throw new NotFoundError('Cortesia não encontrada');
    }

    // Validar permissão
    if (userRole !== 'admin' && courtesy.event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para rejeitar esta cortesia');
    }

    // Validar status
    if (courtesy.status !== 'courtesy_pending') {
      throw new BadRequestError('Apenas cortesias pendentes podem ser rejeitadas');
    }

    // Atualizar para rejected
    const updated = await prisma.courtesy.update({
      where: { id: courtesyId },
      data: {
        status: 'courtesy_expired', // Usar courtesy_expired como rejected
        approvedBy: userId,
      },
    });

    return this.formatCourtesy(updated);
  }

  /**
   * Revoga uma cortesia e cancela o ingresso gerado
   */
  async revokeCourtesy(
    courtesyId: string,
    userId: string,
    userRole: string,
  ): Promise<CourtesyResponse> {
    // Buscar cortesia com evento e ingresso
    const courtesy = await prisma.courtesy.findUnique({
      where: { id: courtesyId },
      include: {
        event: { select: { producerId: true } },
      },
    });

    if (!courtesy) {
      throw new NotFoundError('Cortesia não encontrada');
    }

    // Validar permissão
    if (userRole !== 'admin' && courtesy.event.producerId !== userId) {
      throw new ForbiddenError('Você não tem permissão para revogar esta cortesia');
    }

    // Validar status
    if (courtesy.status !== 'issued') {
      throw new BadRequestError('Apenas cortesias já emitidas podem ser revogadas');
    }

    // Usar transação para garantir atomicidade
    const updated = await prisma.$transaction(async (tx) => {
      // Se houver ticket, cancelar
      if (courtesy.ticketId) {
        await tx.ticket.update({
          where: { id: courtesy.ticketId },
          data: { status: 'cancelled' },
        });
      }

      // Atualizar courtesy para revoked
      return await tx.courtesy.update({
        where: { id: courtesyId },
        data: {
          status: 'revoked',
        },
      });
    });

    return this.formatCourtesy(updated);
  }

  /**
   * Gera relatório de cortesias do evento
   */
  async getReport(
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<CourtesyReport> {
    // Validar que produtor só pode acessar seus eventos
    if (userRole !== 'admin') {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { producerId: true },
      });

      if (!event || event.producerId !== userId) {
        throw new ForbiddenError('Você não tem permissão para acessar este relatório');
      }
    }

    // Contar por status
    const courtesies = await prisma.courtesy.findMany({
      where: { eventId },
      select: { id: true, status: true, requestedBy: true },
    });

    const statusCounts = {
      total: courtesies.length,
      pending: courtesies.filter((c) => c.status === 'courtesy_pending').length,
      approved: courtesies.filter((c) => c.status === 'approved').length,
      issued: courtesies.filter((c) => c.status === 'issued').length,
      expired: courtesies.filter((c) => c.status === 'courtesy_expired').length,
      revoked: courtesies.filter((c) => c.status === 'revoked').length,
    };

    // Contar por solicitante
    const byRequester: { [key: string]: number } = {};
    courtesies.forEach((c) => {
      byRequester[c.requestedBy] = (byRequester[c.requestedBy] || 0) + 1;
    });

    const byRequesterArray = Object.entries(byRequester).map(([requestedBy, count]) => ({
      requestedBy,
      count,
    }));

    const totalIssued = courtesies.filter((c) => c.status === 'issued').length;

    return {
      ...statusCounts,
      byRequester: byRequesterArray,
      totalIssued,
    };
  }

  /**
   * Formata uma cortesia para resposta
   */
  private formatCourtesy(courtesy: any): CourtesyResponse {
    return {
      id: courtesy.id,
      eventId: courtesy.eventId,
      batchId: courtesy.batchId,
      requestedBy: courtesy.requestedBy,
      approvedBy: courtesy.approvedBy,
      recipientName: courtesy.recipientName,
      recipientCpf: courtesy.recipientCpf,
      recipientEmail: courtesy.recipientEmail,
      reason: courtesy.reason,
      status: courtesy.status,
      ticketId: courtesy.ticketId,
      maxQuantity: courtesy.maxQuantity,
      issuedAt: courtesy.issuedAt,
      createdAt: courtesy.createdAt,
    };
  }
}

export const courtesiesService = new CourtesiesService();
