import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { buildCursorPagination, formatPaginatedResponse, PaginatedResponse } from '../../shared/pagination';
import { UpdateProfileInput, ChangePasswordInput, PaginationInput, ConsentInput } from './users.validators';
import { User, Order, Ticket } from '../../generated/prisma/client';

interface UserProfileResponse {
  id: string;
  email: string;
  cpf: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  totpEnabled: boolean;
  role: string;
  createdAt: Date;
}

interface UserDataExport {
  user: UserProfileResponse;
  orders: Order[];
  tickets: Ticket[];
  exportedAt: Date;
}

/**
 * Serviço de gerenciamento de usuários
 * Inclui operações de LGPD (GDPR equivalente brasileiro)
 */
export class UsersService {
  /**
   * Obter perfil do usuário
   */
  async getProfile(userId: string): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      cpf: user.cpf,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      totpEnabled: user.totpEnabled,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Atualizar perfil do usuário
   */
  async updateProfile(userId: string, data: UpdateProfileInput): Promise<UserProfileResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.phone !== undefined) {
      updateData.phone = data.phone || null;
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    await logAudit({
      actorId: userId,
      action: 'user.profile_updated',
      entityType: 'user',
      entityId: userId,
      metadata: { changedFields: Object.keys(data) },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      cpf: updatedUser.cpf,
      name: updatedUser.name,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
      emailVerified: updatedUser.emailVerified,
      totpEnabled: updatedUser.totpEnabled,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    };
  }

  /**
   * Alterar senha do usuário
   */
  async changePassword(
    userId: string,
    data: ChangePasswordInput
  ): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Senha atual inválida');
    }

    // Hash da nova senha
    const newPasswordHash = await bcrypt.hash(data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    await logAudit({
      actorId: userId,
      action: 'user.password_changed',
      entityType: 'user',
      entityId: userId,
    });

    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Obter histórico de pedidos do usuário
   */
  async getOrderHistory(
    userId: string,
    pagination: PaginationInput
  ): Promise<PaginatedResponse<Order>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const paginationParams = buildCursorPagination(pagination);

    const orders = await prisma.order.findMany({
      where: { userId },
      ...paginationParams,
      select: {
        id: true,
        userId: true,
        eventId: true,
        status: true,
        totalCents: true,
        platformFeeCents: true,
        paymentMethod: true,
        asaasPaymentId: true,
        asaasInvoiceUrl: true,
        pixQrCode: true,
        pixCopyPaste: true,
        paidAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
        deviceFingerprint: true,
        riskScore: true,
        createdAt: true,
      },
    });

    const total = await prisma.order.count({
      where: { userId },
    });

    // Converter select em Order[]
    const formattedOrders = orders.map((order) => ({
      ...order,
      id: order.id,
      userId: order.userId,
      eventId: order.eventId,
    })) as Order[];

    return formatPaginatedResponse(formattedOrders, pagination.limit, total);
  }

  /**
   * Exportar dados do usuário (LGPD compliance)
   * Retorna todas as informações associadas ao usuário
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    const [orders, tickets] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
      }),
      prisma.ticket.findMany({
        where: {
          OR: [{ holderId: userId }, { originalBuyerId: userId }],
        },
      }),
    ]);

    await logAudit({
      actorId: userId,
      action: 'user.data_exported',
      entityType: 'user',
      entityId: userId,
      metadata: { ordersCount: orders.length, ticketsCount: tickets.length },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        cpf: user.cpf,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        totpEnabled: user.totpEnabled,
        role: user.role,
        createdAt: user.createdAt,
      },
      orders,
      tickets,
      exportedAt: new Date(),
    };
  }

  /**
   * Deletar conta do usuário (LGPD compliance)
   * Anonimiza dados pessoais ao invés de deletar completamente
   */
  async deleteAccount(userId: string, password: string): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    // Verificar senha para confirmar
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Senha inválida');
    }

    // Gerar email anônimo
    const anonymousEmail = `deleted_${userId}@invalid.local`;
    const anonymousName = 'Usuário Deletado';

    // Anonimizar dados do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: anonymousEmail,
        cpf: 'deleted',
        name: anonymousName,
        phone: null,
        avatarUrl: null,
        passwordHash: 'deleted',
        totpSecret: null,
        totpEnabled: false,
      },
    });

    // Remover dados sensíveis de ordens
    await prisma.order.updateMany({
      where: { userId },
      data: {
        ipAddress: '0.0.0.0',
        userAgent: 'deleted',
        deviceFingerprint: 'deleted',
      },
    });

    // Remover dados sensíveis de tickets
    await prisma.ticket.updateMany({
      where: {
        OR: [{ holderId: userId }, { originalBuyerId: userId }],
      },
      data: {
        holderName: anonymousName,
        holderCpf: 'deleted',
        holderEmail: anonymousEmail,
      },
    });

    await logAudit({
      actorId: userId,
      action: 'user.account_deleted',
      entityType: 'user',
      entityId: userId,
      metadata: { anonymized: true },
    });

    return { message: 'Conta deletada com sucesso. Seus dados foram anonimizados.' };
  }

  /**
   * Registrar consentimento do usuário
   */
  async recordConsent(userId: string, data: ConsentInput): Promise<{ message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    await logAudit({
      actorId: userId,
      action: 'user.consent_recorded',
      entityType: 'user',
      entityId: userId,
      metadata: {
        consentType: data.consentType,
        given: data.given,
      },
    });

    return { message: 'Consentimento registrado com sucesso' };
  }

  /**
   * Salvar Expo push token do usuário
   */
  async updatePushToken(userId: string, pushToken: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Usuário não encontrado');
    }

    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: pushToken },
    });
  }
}

export const usersService = new UsersService();
