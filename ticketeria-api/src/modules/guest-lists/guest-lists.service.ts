import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../shared/errors';
import { buildCursorPagination, formatPaginatedResponse, type PaginatedResponse } from '../../shared/pagination';
import { ListEntriesInput } from './guest-lists.validators';
import crypto from 'crypto';

interface GuestListConfigData {
  id: string;
  eventId: string;
  maxGuestsTotal: number;
  maxGuestsPerPromoter: number | null;
  maxPlusOnes: number;
  requiresCpf: boolean;
  requiresPhone: boolean;
  autoApprove: boolean;
  closesAt: Date | null;
  freeUntilHour: string | null;
  discountPercent: number | null;
  discountUntilHour: string | null;
  welcomeMessage: string | null;
  status: string;
  createdAt: Date;
  totalEntries: number;
  checkedInCount: number;
  pendingCount: number;
}

interface GuestEntryData {
  id: string;
  guestListId: string;
  promoterId: string | null;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  plusOnes: number;
  plusOnesChecked: number;
  listType: string;
  status: string;
  checkedInAt: Date | null;
  checkedInBy: string | null;
  createdAt: Date;
}

interface GuestListStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPromoter: Record<string, number>;
  checkedInToday: number;
  conversionRate: number;
}

/**
 * Serviço de gerenciamento de guest lists
 */
export class GuestListsService {
  /**
   * Criar ou atualizar configuração de guest list
   */
  async createOrUpdateConfig(
    eventId: string,
    data: {
      maxGuestsTotal: number;
      maxGuestsPerPromoter?: number | null;
      maxPlusOnes?: number;
      requiresCpf?: boolean;
      requiresPhone?: boolean;
      autoApprove?: boolean;
      closesAt?: string | null;
      freeUntilHour?: string | null;
      discountPercent?: number | null;
      discountUntilHour?: string | null;
      welcomeMessage?: string | null;
    },
  ): Promise<GuestListConfigData> {
    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Upsert config
    const config = await prisma.guestListConfig.upsert({
      where: { eventId },
      create: {
        eventId,
        maxGuestsTotal: data.maxGuestsTotal,
        maxGuestsPerPromoter: data.maxGuestsPerPromoter || null,
        maxPlusOnes: data.maxPlusOnes || 1,
        requiresCpf: data.requiresCpf !== false,
        requiresPhone: data.requiresPhone || false,
        autoApprove: data.autoApprove !== false,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        freeUntilHour: data.freeUntilHour || null,
        discountPercent: data.discountPercent || null,
        discountUntilHour: data.discountUntilHour || null,
        welcomeMessage: data.welcomeMessage || null,
      },
      update: {
        maxGuestsTotal: data.maxGuestsTotal,
        maxGuestsPerPromoter: data.maxGuestsPerPromoter || null,
        maxPlusOnes: data.maxPlusOnes || 1,
        requiresCpf: data.requiresCpf !== false,
        requiresPhone: data.requiresPhone || false,
        autoApprove: data.autoApprove !== false,
        closesAt: data.closesAt ? new Date(data.closesAt) : null,
        freeUntilHour: data.freeUntilHour || null,
        discountPercent: data.discountPercent || null,
        discountUntilHour: data.discountUntilHour || null,
        welcomeMessage: data.welcomeMessage || null,
      },
    });

    return this.formatConfigWithStats(config, eventId);
  }

  /**
   * Obter configuração de guest list
   */
  async getConfig(eventId: string): Promise<GuestListConfigData> {
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada');
    }

    return this.formatConfigWithStats(config, eventId);
  }

  /**
   * Adicionar entrada manualmente
   */
  async addEntry(
    eventId: string,
    data: {
      name: string;
      cpf?: string | null;
      phone?: string | null;
      email?: string | null;
      plusOnes?: number;
      listType: string;
      promoterId?: string;
    },
  ): Promise<GuestEntryData> {
    // Verificar config existe
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada');
    }

    if (config.status === 'closed') {
      throw new BadRequestError('Guest list está fechada');
    }

    // Validar limites
    const totalEntries = await prisma.guestEntry.count({
      where: { guestListId: config.id },
    });

    if (totalEntries >= config.maxGuestsTotal) {
      throw new ConflictError('Limite máximo de convidados atingido');
    }

    if (config.maxGuestsPerPromoter && data.promoterId) {
      const promoterEntries = await prisma.guestEntry.count({
        where: {
          guestListId: config.id,
          promoterId: data.promoterId,
        },
      });

      if (promoterEntries >= config.maxGuestsPerPromoter) {
        throw new ConflictError('Limite de convidados por promotor atingido');
      }
    }

    const plusOnes = Math.min(data.plusOnes || 0, config.maxPlusOnes);

    // Criar entry
    const entry = await prisma.guestEntry.create({
      data: {
        guestListId: config.id,
        promoterId: data.promoterId || null,
        name: data.name,
        cpf: data.cpf || null,
        phone: data.phone || null,
        email: data.email || null,
        plusOnes,
        listType: data.listType as any,
        status: (config.autoApprove ? 'confirmed' : 'pending') as any,
      },
    });

    return entry as GuestEntryData;
  }

  /**
   * Listar entradas com filtros e paginação cursor
   */
  async listEntries(
    eventId: string,
    pagination: ListEntriesInput,
  ): Promise<PaginatedResponse<GuestEntryData>> {
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada');
    }

    const paginationParams = buildCursorPagination(pagination);

    const where: any = { guestListId: config.id };

    if (pagination.status) {
      where.status = pagination.status;
    }

    if (pagination.listType) {
      where.listType = pagination.listType;
    }

    if (pagination.promoterId) {
      where.promoterId = pagination.promoterId;
    }

    if (pagination.search) {
      where.OR = [
        { name: { contains: pagination.search, mode: 'insensitive' } },
        { cpf: { contains: pagination.search } },
        { email: { contains: pagination.search, mode: 'insensitive' } },
      ];
    }

    const entries = await prisma.guestEntry.findMany({
      where,
      ...paginationParams,
    });

    return formatPaginatedResponse(entries as GuestEntryData[], pagination.limit);
  }

  /**
   * Atualizar entrada
   */
  async updateEntry(
    entryId: string,
    eventId: string,
    data: {
      status?: string;
      plusOnes?: number;
      phone?: string | null;
      email?: string | null;
    },
  ): Promise<GuestEntryData> {
    const entry = await prisma.guestEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Entrada não encontrada');
    }

    // Verificar permissão
    const config = await prisma.guestListConfig.findUnique({
      where: { id: entry.guestListId },
    });

    if (!config || config.eventId !== eventId) {
      throw new ForbiddenError('Sem permissão para atualizar esta entrada');
    }

    const updated = await prisma.guestEntry.update({
      where: { id: entryId },
      data: {
        status: (data.status || entry.status) as any,
        plusOnes: data.plusOnes !== undefined ? data.plusOnes : entry.plusOnes,
        phone: data.phone !== undefined ? data.phone : entry.phone,
        email: data.email !== undefined ? data.email : entry.email,
      },
    });

    return updated as GuestEntryData;
  }

  /**
   * Remover entrada
   */
  async removeEntry(entryId: string, eventId: string): Promise<void> {
    const entry = await prisma.guestEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundError('Entrada não encontrada');
    }

    const config = await prisma.guestListConfig.findUnique({
      where: { id: entry.guestListId },
    });

    if (!config || config.eventId !== eventId) {
      throw new ForbiddenError('Sem permissão para remover esta entrada');
    }

    await prisma.guestEntry.delete({
      where: { id: entryId },
    });
  }

  /**
   * Busca rápida por nome ou CPF para check-in
   */
  async searchEntries(eventId: string, query: string, limit: number = 20): Promise<GuestEntryData[]> {
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada');
    }

    const entries = await prisma.guestEntry.findMany({
      where: {
        guestListId: config.id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { cpf: { contains: query } },
        ],
      },
      take: limit,
    });

    return entries as GuestEntryData[];
  }

  /**
   * Check-in de um convidado
   */
  async checkinGuest(
    guestId: string,
    eventId: string,
    operatorId: string,
    plusOnesCount: number = 0,
  ): Promise<GuestEntryData> {
    const entry = await prisma.guestEntry.findUnique({
      where: { id: guestId },
    });

    if (!entry) {
      throw new NotFoundError('Convidado não encontrado');
    }

    const config = await prisma.guestListConfig.findUnique({
      where: { id: entry.guestListId },
    });

    if (!config || config.eventId !== eventId) {
      throw new ForbiddenError('Sem permissão para fazer check-in deste convidado');
    }

    const validated = Math.min(plusOnesCount, entry.plusOnes);

    const updated = await prisma.guestEntry.update({
      where: { id: guestId },
      data: {
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: operatorId,
        plusOnesChecked: validated,
      },
    });

    return updated as GuestEntryData;
  }

  /**
   * Obter estatísticas de guest list
   */
  async getStats(eventId: string): Promise<GuestListStats> {
    const config = await prisma.guestListConfig.findUnique({
      where: { eventId },
    });

    if (!config) {
      throw new NotFoundError('Configuração de guest list não encontrada');
    }

    const allEntries = await prisma.guestEntry.findMany({
      where: { guestListId: config.id },
    });

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPromoter: Record<string, number> = {};
    let checkedInToday = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const entry of allEntries) {
      // By status
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;

      // By type
      byType[entry.listType] = (byType[entry.listType] || 0) + 1;

      // By promoter
      if (entry.promoterId) {
        byPromoter[entry.promoterId] = (byPromoter[entry.promoterId] || 0) + 1;
      }

      // Checked in today
      if (
        entry.checkedInAt &&
        new Date(entry.checkedInAt) >= today &&
        entry.status === 'checked_in'
      ) {
        checkedInToday++;
      }
    }

    const checkedIn = byStatus['checked_in'] || 0;
    const conversionRate = allEntries.length > 0 ? (checkedIn / allEntries.length) * 100 : 0;

    return {
      total: allEntries.length,
      byStatus,
      byType,
      byPromoter,
      checkedInToday,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  /**
   * Obter relatório completo
   */
  async getReport(eventId: string): Promise<{
    config: GuestListConfigData;
    stats: GuestListStats;
    entries: GuestEntryData[];
  }> {
    const config = await this.getConfig(eventId);
    const stats = await this.getStats(eventId);

    const entries = await prisma.guestEntry.findMany({
      where: { guestListId: config.id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      config,
      stats,
      entries: entries as GuestEntryData[],
    };
  }

  /**
   * Helper: formatar config com stats
   */
  private async formatConfigWithStats(config: any, eventId: string): Promise<GuestListConfigData> {
    const totalEntries = await prisma.guestEntry.count({
      where: { guestListId: config.id },
    });

    const checkedInCount = await prisma.guestEntry.count({
      where: {
        guestListId: config.id,
        status: 'checked_in',
      },
    });

    const pendingCount = await prisma.guestEntry.count({
      where: {
        guestListId: config.id,
        status: 'pending',
      },
    });

    return {
      id: config.id,
      eventId: config.eventId,
      maxGuestsTotal: config.maxGuestsTotal,
      maxGuestsPerPromoter: config.maxGuestsPerPromoter,
      maxPlusOnes: config.maxPlusOnes,
      requiresCpf: config.requiresCpf,
      requiresPhone: config.requiresPhone,
      autoApprove: config.autoApprove,
      closesAt: config.closesAt,
      freeUntilHour: config.freeUntilHour,
      discountPercent: config.discountPercent ? Number(config.discountPercent) : null,
      discountUntilHour: config.discountUntilHour,
      welcomeMessage: config.welcomeMessage,
      status: config.status,
      createdAt: config.createdAt,
      totalEntries,
      checkedInCount,
      pendingCount,
    };
  }
}

export const guestListsService = new GuestListsService();
