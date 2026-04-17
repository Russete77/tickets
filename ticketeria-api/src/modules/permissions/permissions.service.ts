import { prisma } from '../../config/database';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
} from '../../shared/errors';

interface PermissionRecord {
  id: string;
  userId: string;
  eventId: string | null;
  resource: string;
  actions: string[];
  createdAt: Date;
}

interface GrantPermissionData {
  userId: string;
  eventId?: string;
  resource: string;
  actions: string[];
}

/**
 * Serviço de gerenciamento de permissões
 */
export class PermissionsService {
  /**
   * Concede uma permissão a um usuário para um recurso
   */
  async grantPermission(
    data: GrantPermissionData,
  ): Promise<PermissionRecord> {
    const { userId, eventId, resource, actions } = data;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Se eventId foi fornecido, verificar se o evento existe
    if (eventId) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundError('Evento não encontrado');
      }
    }

    // Verificar se já existe uma permissão idêntica
    const existingPermission = eventId
      ? await prisma.permission.findUnique({
          where: {
            userId_eventId_resource: {
              userId,
              eventId,
              resource,
            },
          },
        })
      : await prisma.permission.findFirst({
          where: { userId, eventId: null, resource },
        });

    if (existingPermission) {
      throw new ConflictError(
        'Este usuário já possui uma permissão para este recurso',
      );
    }

    // Criar a permissão
    const permission = await prisma.permission.create({
      data: {
        userId,
        eventId: eventId || null,
        resource,
        actions,
      },
    });

    return {
      id: permission.id,
      userId: permission.userId,
      eventId: permission.eventId,
      resource: permission.resource,
      actions: Array.isArray(permission.actions)
        ? permission.actions
        : JSON.parse(JSON.stringify(permission.actions)),
      createdAt: permission.createdAt,
    };
  }

  /**
   * Obtém todas as permissões de um usuário
   */
  async getUserPermissions(
    userId: string,
    currentUserId: string,
  ): Promise<PermissionRecord[]> {
    // Um usuário só pode visualizar suas próprias permissões ou um admin pode visualizar de qualquer um
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundError('Usuário atual não encontrado');
    }

    if (userId !== currentUserId && currentUser.role !== 'admin') {
      throw new ForbiddenError(
        'Você não tem permissão para visualizar permissões de outro usuário',
      );
    }

    // Verificar se o usuário existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const permissions = await prisma.permission.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return permissions.map((permission) => ({
      id: permission.id,
      userId: permission.userId,
      eventId: permission.eventId,
      resource: permission.resource,
      actions: Array.isArray(permission.actions)
        ? permission.actions
        : JSON.parse(JSON.stringify(permission.actions)),
      createdAt: permission.createdAt,
    }));
  }

  /**
   * Obtém todas as permissões de um evento
   */
  async getEventPermissions(
    eventId: string,
    userId: string,
  ): Promise<PermissionRecord[]> {
    // Verificar se o evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Verificar se o usuário é produtor do evento ou admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const isProducerOrAdmin =
      event.producerId === userId || user.role === 'admin';
    if (!isProducerOrAdmin) {
      throw new ForbiddenError(
        'Você não tem permissão para visualizar permissões deste evento',
      );
    }

    const permissions = await prisma.permission.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
    });

    return permissions.map((permission) => ({
      id: permission.id,
      userId: permission.userId,
      eventId: permission.eventId,
      resource: permission.resource,
      actions: Array.isArray(permission.actions)
        ? permission.actions
        : JSON.parse(JSON.stringify(permission.actions)),
      createdAt: permission.createdAt,
    }));
  }

  /**
   * Revoga uma permissão
   */
  async revokePermission(
    permissionId: string,
    currentUserId: string,
  ): Promise<void> {
    // Buscar a permissão
    const permission = await prisma.permission.findUnique({
      where: { id: permissionId },
      include: {
        event: true,
      },
    });

    if (!permission) {
      throw new NotFoundError('Permissão não encontrada');
    }

    // Verificar permissão do usuário atual
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundError('Usuário atual não encontrado');
    }

    // Um admin pode revogar qualquer permissão
    // Um produtor pode revogar permissões de seu próprio evento
    let hasPermission = currentUser.role === 'admin';

    if (!hasPermission && permission.eventId) {
      hasPermission = permission.event?.producerId === currentUserId;
    }

    if (!hasPermission) {
      throw new ForbiddenError(
        'Você não tem permissão para revogar esta permissão',
      );
    }

    // Deletar a permissão
    await prisma.permission.delete({
      where: { id: permissionId },
    });
  }

  /**
   * Verifica se um usuário tem uma permissão específica
   */
  async checkPermission(
    userId: string,
    eventId: string | undefined,
    resource: string,
    action: string,
  ): Promise<boolean> {
    // Buscar permissão global (sem evento) ou específica do evento
    const permission = eventId
      ? await prisma.permission.findUnique({
          where: {
            userId_eventId_resource: { userId, eventId, resource },
          },
        })
      : await prisma.permission.findFirst({
          where: { userId, eventId: null, resource },
        });

    if (!permission) {
      return false;
    }

    const actions = Array.isArray(permission.actions)
      ? permission.actions
      : JSON.parse(JSON.stringify(permission.actions));

    return actions.includes(action);
  }
}

export const permissionsService = new PermissionsService();
