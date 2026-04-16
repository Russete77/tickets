import { prisma } from '../../config/database';
import { NotFoundError, ConflictError, ForbiddenError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { ListPromotersInput } from './promoters.validators';
import crypto from 'crypto';

interface PromoterData {
  id: string;
  userId: string;
  displayName: string;
  slug: string;
  instagram: string | null;
  whatsapp: string | null;
  tier: string;
  totalGuests: number;
  totalCheckins: number;
  conversionRate: number;
  score: number;
  isActive: boolean;
  createdAt: Date;
}

interface PromoterWithStats extends PromoterData {
  assignmentsCount: number;
}

interface PromoterDashboard {
  id: string;
  displayName: string;
  tier: string;
  totalGuests: number;
  totalCheckins: number;
  conversionRate: number;
  assignedEventsCount: number;
  recentEvents: Array<{
    eventId: string;
    eventName: string;
    guestCount: number;
    checkinCount: number;
  }>;
}

interface EventStats {
  eventId: string;
  eventName: string;
  guestsAdded: number;
  checkedIn: number;
  conversionRate: number;
  rankingPosition: number;
}

/**
 * Serviço de gerenciamento de promoters
 */
export class PromotersService {
  /**
   * Registrar novo promoter
   */
  async register(
    userId: string,
    data: {
      displayName: string;
      instagram?: string | null;
      whatsapp?: string | null;
    },
  ): Promise<PromoterData> {
    // Verificar se usuário já é promoter
    const existing = await prisma.promoter.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictError('Usuário já é promoter');
    }

    // Gerar slug único
    const slug = await this.generateUniqueSlug(data.displayName);

    const promoter = await prisma.promoter.create({
      data: {
        userId,
        displayName: data.displayName,
        slug,
        instagram: data.instagram || null,
        whatsapp: data.whatsapp || null,
      },
    });

    return this.formatPromoterData(promoter);
  }

  /**
   * Listar promoters com paginação e busca
   */
  async list(
    pagination: ListPromotersInput,
  ): Promise<PaginatedResponse<PromoterWithStats>> {
    const paginationParams = buildCursorPagination(pagination);

    const where: any = { isActive: true };

    if (pagination.search) {
      where.OR = [
        { displayName: { contains: pagination.search, mode: 'insensitive' } },
        { slug: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const promoters = await prisma.promoter.findMany({
      where,
      include: {
        _count: {
          select: { assignments: true },
        },
      },
      ...paginationParams,
    });

    const formatted = promoters.map((p) => ({
      ...this.formatPromoterData(p),
      assignmentsCount: p._count.assignments,
    }));

    return formatPaginatedResponse(formatted, pagination.limit);
  }

  /**
   * Obter promoter por ID com stats
   */
  async getById(promoterId: string): Promise<PromoterWithStats> {
    const promoter = await prisma.promoter.findUnique({
      where: { id: promoterId },
      include: {
        _count: {
          select: { assignments: true },
        },
      },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    return {
      ...this.formatPromoterData(promoter),
      assignmentsCount: promoter._count.assignments,
    };
  }

  /**
   * Atualizar dados do promoter
   */
  async update(
    promoterId: string,
    userId: string,
    data: {
      displayName?: string;
      instagram?: string | null;
      whatsapp?: string | null;
    },
  ): Promise<PromoterData> {
    const promoter = await prisma.promoter.findUnique({
      where: { id: promoterId },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    // Validar permissão
    if (promoter.userId !== userId) {
      throw new ForbiddenError('Sem permissão para atualizar este promoter');
    }

    const updated = await prisma.promoter.update({
      where: { id: promoterId },
      data: {
        displayName: data.displayName || promoter.displayName,
        instagram: data.instagram !== undefined ? data.instagram : promoter.instagram,
        whatsapp: data.whatsapp !== undefined ? data.whatsapp : promoter.whatsapp,
      },
    });

    return this.formatPromoterData(updated);
  }

  /**
   * Atribuir promoter a um evento
   */
  async assignToEvent(
    promoterId: string,
    eventId: string,
    maxGuests?: number,
  ): Promise<{
    id: string;
    shareLink: string;
    qrCodeUrl: string | null;
  }> {
    // Verificar promoter existe
    const promoter = await prisma.promoter.findUnique({
      where: { id: promoterId },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    // Verificar guest list config existe
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada para este evento');
    }

    // Verificar se já foi atribuído
    const existing = await prisma.promoterAssignment.findUnique({
      where: {
        promoterId_guestListId: {
          promoterId,
          guestListId: config.id,
        },
      },
    });

    if (existing) {
      throw new ConflictError('Promoter já está atribuído a este evento');
    }

    // Gerar share link único
    const shareLink = await this.generateUniqueShareLink();

    const assignment = await prisma.promoterAssignment.create({
      data: {
        promoterId,
        guestListId: config.id,
        shareLink,
        maxGuests: maxGuests || null,
      },
    });

    return {
      id: assignment.id,
      shareLink: assignment.shareLink,
      qrCodeUrl: assignment.qrCodeUrl,
    };
  }

  /**
   * Obter eventos atribuídos ao promoter
   */
  async getAssignedEvents(promoterId: string): Promise<
    Array<{
      eventId: string;
      eventName: string;
      guestCount: number;
      checkinCount: number;
      conversionRate: number;
    }>
  > {
    const promoter = await prisma.promoter.findUnique({
      where: { id: promoterId },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    const assignments = await prisma.promoterAssignment.findMany({
      where: { promoterId },
      include: {
        guestList: {
          include: {
            event: true,
          },
        },
      },
    });

    const events = assignments.map((assignment) => {
      const checkinCount = assignment.checkinCount;
      const guestCount = assignment.guestCount;
      const conversionRate =
        guestCount > 0 ? (checkinCount / guestCount) * 100 : 0;

      return {
        eventId: assignment.guestList.event.id,
        eventName: assignment.guestList.event.name,
        guestCount,
        checkinCount,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    });

    return events;
  }

  /**
   * Obter dashboard do promoter
   */
  async getMyDashboard(userId: string): Promise<PromoterDashboard> {
    const promoter = await prisma.promoter.findUnique({
      where: { userId },
      include: {
        assignments: {
          include: {
            guestList: {
              include: {
                event: true,
              },
            },
          },
        },
      },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    // Calcular agregações
    let totalGuests = 0;
    let totalCheckins = 0;

    const recentEvents = promoter.assignments
      .map((assignment) => {
        totalGuests += assignment.guestCount;
        totalCheckins += assignment.checkinCount;

        return {
          eventId: assignment.guestList.event.id,
          eventName: assignment.guestList.event.name,
          guestCount: assignment.guestCount,
          checkinCount: assignment.checkinCount,
        };
      })
      .sort((a, b) => b.guestCount - a.guestCount)
      .slice(0, 5);

    const conversionRate =
      totalGuests > 0 ? (totalCheckins / totalGuests) * 100 : 0;

    return {
      id: promoter.id,
      displayName: promoter.displayName,
      tier: promoter.tier,
      totalGuests,
      totalCheckins,
      conversionRate: Math.round(conversionRate * 100) / 100,
      assignedEventsCount: promoter.assignments.length,
      recentEvents,
    };
  }

  /**
   * Obter estatísticas do promoter para um evento específico
   */
  async getEventStats(promoterId: string, eventId: string): Promise<EventStats> {
    const promoter = await prisma.promoter.findUnique({
      where: { id: promoterId },
    });

    if (!promoter) {
      throw new NotFoundError('Promoter não encontrado');
    }

    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
      include: {
        event: true,
      },
    });

    if (!config) {
      throw new NotFoundError('Evento não encontrado');
    }

    const assignment = await prisma.promoterAssignment.findUnique({
      where: {
        promoterId_guestListId: {
          promoterId,
          guestListId: config.id,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundError('Promoter não está atribuído a este evento');
    }

    // Calcular posição no ranking
    const allAssignments = await prisma.promoterAssignment.findMany({
      where: { guestListId: config.id },
      orderBy: { guestCount: 'desc' },
    });

    const rankingPosition =
      allAssignments.findIndex((a) => a.id === assignment.id) + 1;

    const conversionRate =
      assignment.guestCount > 0
        ? (assignment.checkinCount / assignment.guestCount) * 100
        : 0;

    return {
      eventId: config.event.id,
      eventName: config.event.name,
      guestsAdded: assignment.guestCount,
      checkedIn: assignment.checkinCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      rankingPosition,
    };
  }

  /**
   * Gerar slug único a partir do display name
   */
  private async generateUniqueSlug(displayName: string): Promise<string> {
    const baseSlug = displayName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);

    let slug = baseSlug;
    let attempts = 0;

    while (attempts < 100) {
      const existing = await prisma.promoter.findUnique({
        where: { slug },
      });

      if (!existing) {
        return slug;
      }

      const random = crypto.randomBytes(3).toString('hex');
      slug = `${baseSlug}-${random}`;
      attempts++;
    }

    throw new ConflictError('Erro ao gerar slug único para promoter');
  }

  /**
   * Gerar share link único
   */
  private async generateUniqueShareLink(): Promise<string> {
    let shareLink = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      shareLink = crypto.randomBytes(16).toString('base64url').substring(0, 32);
      const existing = await prisma.promoterAssignment.findUnique({
        where: { shareLink },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new ConflictError('Erro ao gerar share link único');
    }

    return shareLink;
  }

  /**
   * Helper: formatar dados do promoter
   */
  private formatPromoterData(promoter: any): PromoterData {
    return {
      id: promoter.id,
      userId: promoter.userId,
      displayName: promoter.displayName,
      slug: promoter.slug,
      instagram: promoter.instagram,
      whatsapp: promoter.whatsapp,
      tier: promoter.tier,
      totalGuests: promoter.totalGuests,
      totalCheckins: promoter.totalCheckins,
      conversionRate: Number(promoter.conversionRate),
      score: promoter.score,
      isActive: promoter.isActive,
      createdAt: promoter.createdAt,
    };
  }
}

export const promotersService = new PromotersService();
