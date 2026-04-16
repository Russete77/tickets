import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { JoinWaitlistInput, ListWaitlistInput } from './waitlist.validators';

interface WaitlistEntry {
  id: string;
  eventId: string;
  batchId: string | null;
  userId: string;
  email: string;
  quantity: number;
  notified: boolean;
  notifiedAt: Date | null;
  createdAt: Date;
}

interface WaitlistCountResponse {
  eventId: string;
  count: number;
  unnotified: number;
}

interface NotificationData {
  userId: string;
  email: string;
  quantity: number;
  eventTitle: string;
}

/**
 * Serviço de gerenciamento de waitlist
 */
export class WaitlistService {
  /**
   * Adiciona usuário à waitlist
   */
  async joinWaitlist(
    eventId: string,
    userId: string,
    userEmail: string,
    input: JoinWaitlistInput,
  ): Promise<WaitlistEntry> {
    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Verificar se já está na waitlist
    const existing = await prisma.waitlist.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Você já está na waitlist deste evento');
    }

    // Verificar se evento está lotado (todos os batches sold out)
    const batches = await prisma.ticketBatch.findMany({
      where: { eventId },
      select: { id: true, quantity: true, soldCount: true },
    });

    if (batches.length === 0) {
      throw new BadRequestError('Evento sem batches de ingressos');
    }

    // Contar ingressos disponíveis
    const totalAvailable = batches.reduce((sum, batch) => sum + (batch.quantity - batch.soldCount), 0);

    if (totalAvailable > 0) {
      throw new BadRequestError('Ainda há ingressos disponíveis para este evento');
    }

    // Validar batchId se fornecido
    if (input.batchId) {
      const batch = await prisma.ticketBatch.findUnique({
        where: { id: input.batchId },
        select: { eventId: true },
      });

      if (!batch || batch.eventId !== eventId) {
        throw new NotFoundError('Lote não encontrado neste evento');
      }
    }

    // Criar entrada na waitlist
    const waitlist = await prisma.waitlist.create({
      data: {
        eventId,
        userId,
        email: userEmail,
        quantity: input.quantity,
        batchId: input.batchId || null,
        notified: false,
      },
    });

    // Cache count em Redis
    await this.invalidateWaitlistCache(eventId);

    return this.formatWaitlist(waitlist);
  }

  /**
   * Remove usuário da waitlist
   */
  async leaveWaitlist(
    eventId: string,
    userId: string,
  ): Promise<void> {
    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Verificar se está na waitlist
    const waitlist = await prisma.waitlist.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });

    if (!waitlist) {
      throw new NotFoundError('Você não está na waitlist deste evento');
    }

    // Deletar entrada
    await prisma.waitlist.delete({
      where: { id: waitlist.id },
    });

    // Invalidar cache
    await this.invalidateWaitlistCache(eventId);
  }

  /**
   * Lista waitlist com paginação (apenas para produtor)
   */
  async getWaitlist(
    eventId: string,
    userId: string,
    userRole: string,
    filters: ListWaitlistInput,
  ): Promise<PaginatedResponse<WaitlistEntry>> {
    // Validar que produtor só pode acessar seus eventos
    if (userRole !== 'admin') {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { producerId: true },
      });

      if (!event || event.producerId !== userId) {
        throw new ForbiddenError('Você não tem permissão para visualizar a waitlist deste evento');
      }
    }

    const paginationParams = buildCursorPagination(filters);

    const where: any = { eventId };
    if (filters.notified !== undefined) {
      where.notified = filters.notified;
    }

    const entries = await prisma.waitlist.findMany({
      where,
      ...paginationParams,
    });

    const formatted = entries.map((e) => this.formatWaitlist(e));

    return formatPaginatedResponse(formatted, filters.limit);
  }

  /**
   * Obtém contagem pública de pessoas na waitlist
   */
  async getCount(eventId: string): Promise<WaitlistCountResponse> {
    // Verificar cache primeiro
    const cacheKey = `waitlist:count:${eventId}`;
    const cached = await redis.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      return data;
    }

    // Contar do banco de dados
    const count = await prisma.waitlist.count({
      where: { eventId },
    });

    const unnotified = await prisma.waitlist.count({
      where: {
        eventId,
        notified: false,
      },
    });

    const result: WaitlistCountResponse = {
      eventId,
      count,
      unnotified,
    };

    // Cache por 5 minutos
    await redis.setex(cacheKey, 300, JSON.stringify(result));

    return result;
  }

  /**
   * Notifica pessoas na waitlist (chamado por worker)
   * Retorna lista de pessoas a notificar
   */
  async notifyWaitlist(eventId: string): Promise<NotificationData[]> {
    // Buscar evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Buscar pessoas não notificadas
    const unnotified = await prisma.waitlist.findMany({
      where: {
        eventId,
        notified: false,
      },
      select: {
        id: true,
        userId: true,
        email: true,
        quantity: true,
      },
    });

    if (unnotified.length === 0) {
      return [];
    }

    // Marcar como notificadas em transação
    const ids = unnotified.map((w) => w.id);
    await prisma.waitlist.updateMany({
      where: { id: { in: ids } },
      data: {
        notified: true,
        notifiedAt: new Date(),
      },
    });

    // Invalidar cache
    await this.invalidateWaitlistCache(eventId);

    // Retornar dados para notificação
    return unnotified.map((w) => ({
      userId: w.userId,
      email: w.email,
      quantity: w.quantity,
      eventTitle: event.title,
    }));
  }

  /**
   * Obtém entrada da waitlist por ID
   */
  async getById(id: string): Promise<WaitlistEntry | null> {
    const entry = await prisma.waitlist.findUnique({
      where: { id },
    });

    return entry ? this.formatWaitlist(entry) : null;
  }

  /**
   * Invalida cache da waitlist
   */
  private async invalidateWaitlistCache(eventId: string): Promise<void> {
    await redis.del(`waitlist:count:${eventId}`);
  }

  /**
   * Formata entrada da waitlist
   */
  private formatWaitlist(entry: any): WaitlistEntry {
    return {
      id: entry.id,
      eventId: entry.eventId,
      batchId: entry.batchId,
      userId: entry.userId,
      email: entry.email,
      quantity: entry.quantity,
      notified: entry.notified,
      notifiedAt: entry.notifiedAt,
      createdAt: entry.createdAt,
    };
  }
}

export const waitlistService = new WaitlistService();
