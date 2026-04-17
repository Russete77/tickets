import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { logAudit, AuditActions } from '../../shared/audit';
import { ListEventsInput, ListUsersInput } from './admin.validators';
import { EventStatus, UserRole } from '../../generated/prisma/client';
import { logger } from '../../shared/logger';

interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenueCents: number;
  pendingModerations: number;
}

interface EventData {
  id: string;
  title: string;
  producerId: string;
  status: EventStatus;
  startsAt: Date;
  createdAt: Date;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * Serviço administrativo
 */
export class AdminService {
  /**
   * Obtém estatísticas do dashboard admin
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // Total de usuários
    const totalUsers = await prisma.user.count();

    // Total de eventos
    const totalEvents = await prisma.event.count();

    // Total de ingressos vendidos
    const ticketStats = await prisma.ticket.aggregate({
      _count: { id: true },
    });
    const totalTicketsSold = ticketStats._count.id;

    // Total de receita
    const orderStats = await prisma.order.aggregate({
      where: { status: 'paid' },
      _sum: { totalCents: true },
    });
    const totalRevenueCents = orderStats._sum.totalCents || 0;

    // Eventos pendentes de moderação (draft)
    const pendingModerations = await prisma.event.count({
      where: { status: 'draft' },
    });

    return {
      totalUsers,
      totalEvents,
      totalTicketsSold,
      totalRevenueCents,
      pendingModerations,
    };
  }

  /**
   * Lista eventos com filtros e paginação
   */
  async listEvents(
    filters?: { status?: EventStatus },
    pagination?: ListEventsInput,
  ): Promise<PaginatedResponse<EventData>> {
    const paginationParams = pagination
      ? buildCursorPagination(pagination)
      : buildCursorPagination({ limit: 20, direction: 'forward' });

    const events = await prisma.event.findMany({
      where: filters?.status ? { status: filters.status } : {},
      select: {
        id: true,
        title: true,
        producerId: true,
        status: true,
        startsAt: true,
        createdAt: true,
      },
      ...paginationParams,
    });

    return formatPaginatedResponse(
      events as EventData[],
      pagination?.limit || 20,
    );
  }

  /**
   * Moderates an event
   */
  async moderateEvent(
    eventId: string,
    action: 'approve' | 'reject' | 'suspend',
    reason?: string,
    adminId?: string,
  ): Promise<EventData> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        producerId: true,
        status: true,
        startsAt: true,
        createdAt: true,
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    let newStatus: EventStatus;

    if (action === 'approve') {
      newStatus = 'published';
    } else if (action === 'reject') {
      newStatus = 'cancelled';
    } else if (action === 'suspend') {
      newStatus = 'cancelled';
    } else {
      throw new BadRequestError('Ação de moderação inválida');
    }

    // Atualizar evento
    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: newStatus },
      select: {
        id: true,
        title: true,
        producerId: true,
        status: true,
        startsAt: true,
        createdAt: true,
      },
    });

    // Log de auditoria
    await logAudit({
      actorId: adminId,
      action: AuditActions.EVENT_MODERATED,
      entityType: 'event',
      entityId: eventId,
      metadata: { action, reason, newStatus },
    });

    return updatedEvent as EventData;
  }

  /**
   * Lista usuários com filtros e paginação
   */
  async listUsers(
    filters?: { role?: UserRole },
    pagination?: ListUsersInput,
  ): Promise<PaginatedResponse<UserData>> {
    const paginationParams = pagination
      ? buildCursorPagination(pagination)
      : buildCursorPagination({ limit: 20, direction: 'forward' });

    const users = await prisma.user.findMany({
      where: filters?.role ? { role: filters.role } : {},
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      ...paginationParams,
    });

    return formatPaginatedResponse(
      users as UserData[],
      pagination?.limit || 20,
    );
  }

  /**
   * Gerencia um usuário (bloquear/desbloquear)
   */
  async manageUser(
    userId: string,
    action: 'block' | 'unblock',
    reason?: string,
    adminId?: string,
  ): Promise<UserData> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Nota: Seria necessário adicionar um campo "blocked" no modelo User
    // Para agora, apenas logar a ação
    logger.info({ action, userId, reason }, '[ADMIN] User action');

    // Log de auditoria
    await logAudit({
      actorId: adminId,
      action: action === 'block' ? AuditActions.USER_BLOCKED : 'admin.user_unblocked',
      entityType: 'user',
      entityId: userId,
      metadata: { action, reason },
    });

    return user as UserData;
  }
}

export const adminService = new AdminService();
