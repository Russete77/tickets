import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { buildCursorPagination, formatPaginatedResponse, PaginatedResponse } from '../../shared/pagination';
import { CreateEventInput, UpdateEventInput, SearchEventsInput } from './events.validators';
import { PublishingService } from './publishing.service';
import { Event, EventStatus, TicketBatch } from '../../generated/prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import crypto from 'crypto';

/**
 * Serviço principal de gerenciamento de eventos
 * Orquestra operações CRUD e delegua publicação para PublishingService
 */
export class EventsService {
  /**
   * Gera slug a partir do título
   */
  private static generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const randomSuffix = crypto.randomBytes(4).toString('hex').slice(0, 6);
    return `${baseSlug}-${randomSuffix}`;
  }

  /**
   * Cria um novo evento com seus lotes
   */
  static async create(producerId: string, data: CreateEventInput): Promise<Event> {
    // Validações básicas
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      throw new BadRequestError('Data de término deve ser após a data de início');
    }

    if (data.doorsOpenAt && new Date(data.doorsOpenAt) > new Date(data.startsAt)) {
      throw new BadRequestError('Abertura de portas deve ser antes do início do evento');
    }

    // Verificar se produtor existe
    const producer = await prisma.user.findUnique({
      where: { id: producerId },
    });

    if (!producer) {
      throw new NotFoundError('Produtor não encontrado');
    }

    // Gerar slug único
    let slug = this.generateSlug(data.title);
    let slugExists = await prisma.event.findUnique({ where: { slug } });
    while (slugExists) {
      slug = this.generateSlug(data.title);
      slugExists = await prisma.event.findUnique({ where: { slug } });
    }

    // Criar evento com lotes em transação
    const event = await prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          producerId,
          title: data.title,
          slug,
          description: data.description,
          shortDescription: data.shortDescription,
          category: data.category,
          venueName: data.venueName,
          venueAddress: data.venueAddress,
          venueLat: data.venueLat ? new Decimal(data.venueLat) : undefined,
          venueLng: data.venueLng ? new Decimal(data.venueLng) : undefined,
          venueCapacity: data.venueCapacity,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
          doorsOpenAt: data.doorsOpenAt ? new Date(data.doorsOpenAt) : undefined,
          coverImageUrl: data.coverImageUrl,
          tags: data.tags || [],
          ageRating: data.ageRating || 'Livre',
          dressCode: data.dressCode,
          isOpenBar: data.isOpenBar || false,
          lineup: data.lineup || [],
          rules: data.rules,
          maxTicketsPerCpf: data.maxTicketsPerCpf || 4,
        },
      });

      // Criar lotes
      for (let i = 0; i < data.batches.length; i++) {
        const batch = data.batches[i];
        await tx.ticketBatch.create({
          data: {
            eventId: createdEvent.id,
            name: batch.name,
            priceCents: batch.priceCents,
            quantity: batch.quantity,
            type: batch.type || 'regular',
            startsAt: batch.startsAt ? new Date(batch.startsAt) : undefined,
            endsAt: batch.endsAt ? new Date(batch.endsAt) : undefined,
            autoSwitch: batch.autoSwitch ?? true,
            sortOrder: i,
          },
        });
      }

      return createdEvent;
    });

    // Registrar no audit log
    await logAudit({
      actorId: producerId,
      action: AuditActions.EVENT_CREATED,
      entityType: 'event',
      entityId: event.id,
      metadata: {
        title: event.title,
        category: event.category,
        batchCount: data.batches.length,
      },
    });

    // Invalidar cache de eventos trending
    await redis.del('events:trending');
    await redis.del('events:weekend');

    return event;
  }

  /**
   * Atualiza um evento existente
   */
  static async update(eventId: string, producerId: string, data: UpdateEventInput): Promise<Event> {
    // Verificar propriedade do evento
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para atualizar este evento');
    }

    if (event.status === 'published' || event.status === 'cancelled') {
      throw new BadRequestError('Não é possível editar um evento publicado ou cancelado');
    }

    // Validações de data
    if (data.endsAt && data.startsAt && new Date(data.endsAt) <= new Date(data.startsAt)) {
      throw new BadRequestError('Data de término deve ser após a data de início');
    }

    if (data.doorsOpenAt && data.startsAt && new Date(data.doorsOpenAt) > new Date(data.startsAt)) {
      throw new BadRequestError('Abertura de portas deve ser antes do início do evento');
    }

    const updateData: Record<string, any> = {};

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.shortDescription) updateData.shortDescription = data.shortDescription;
    if (data.category) updateData.category = data.category;
    if (data.venueName) updateData.venueName = data.venueName;
    if (data.venueAddress) updateData.venueAddress = data.venueAddress;
    if (data.venueLat !== undefined) {
      updateData.venueLat = data.venueLat ? new Decimal(data.venueLat) : null;
    }
    if (data.venueLng !== undefined) {
      updateData.venueLng = data.venueLng ? new Decimal(data.venueLng) : null;
    }
    if (data.venueCapacity) updateData.venueCapacity = data.venueCapacity;
    if (data.startsAt) updateData.startsAt = new Date(data.startsAt);
    if (data.endsAt) updateData.endsAt = new Date(data.endsAt);
    if (data.doorsOpenAt !== undefined) updateData.doorsOpenAt = data.doorsOpenAt ? new Date(data.doorsOpenAt) : null;
    if (data.coverImageUrl) updateData.coverImageUrl = data.coverImageUrl;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.ageRating) updateData.ageRating = data.ageRating;
    if (data.dressCode !== undefined) updateData.dressCode = data.dressCode;
    if (data.isOpenBar !== undefined) updateData.isOpenBar = data.isOpenBar;
    if (data.lineup !== undefined) updateData.lineup = data.lineup;
    if (data.rules !== undefined) updateData.rules = data.rules;
    if (data.maxTicketsPerCpf) updateData.maxTicketsPerCpf = data.maxTicketsPerCpf;

    const updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    // Registrar no audit log
    await logAudit({
      actorId: producerId,
      action: AuditActions.EVENT_UPDATED,
      entityType: 'event',
      entityId: eventId,
      metadata: Object.keys(updateData),
    });

    // Invalidar cache
    await redis.del(`event:${eventId}`);
    await redis.del(`event:slug:${event.slug}`);

    return updatedEvent;
  }

  /**
   * Obtém evento pela slug (página pública)
   */
  static async getBySlug(slug: string): Promise<Event & { batches: TicketBatch[]; reviewCount: number }> {
    const cached = await redis.get(`event:slug:${slug}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const event = await prisma.event.findUnique({
      where: { slug },
      include: {
        batches: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    const reviewCount = await prisma.eventReview.count({
      where: { eventId: event.id },
    });

    const result = { ...event, reviewCount };

    // Cache por 1 hora
    await redis.setex(`event:slug:${slug}`, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * Obtém evento completo por ID
   */
  static async getById(eventId: string): Promise<Event & { batches: TicketBatch[] }> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        batches: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    return event;
  }

  /**
   * Busca eventos com filtros e paginação por cursor
   */
  static async search(filters: SearchEventsInput): Promise<PaginatedResponse<Event>> {
    const pagination = buildCursorPagination({
      cursor: filters.cursor,
      limit: filters.limit,
    });

    const where: Record<string, any> = {
      status: 'published',
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.dateFrom) {
      where.startsAt = { gte: new Date(filters.dateFrom) };
    }

    if (filters.dateTo) {
      where.endsAt = { lte: new Date(filters.dateTo) };
    }

    if (filters.isOpenBar !== undefined) {
      where.isOpenBar = filters.isOpenBar;
    }

    if (filters.query) {
      where.OR = [
        { title: { contains: filters.query, mode: 'insensitive' } },
        { description: { contains: filters.query, mode: 'insensitive' } },
        { venueName: { contains: filters.query, mode: 'insensitive' } },
      ];
    }

    // Filtro de preço por batch mínimo
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.batches = {
        some: {
          ...(filters.priceMin !== undefined && { priceCents: { gte: filters.priceMin * 100 } }),
          ...(filters.priceMax !== undefined && { priceCents: { lte: filters.priceMax * 100 } }),
        },
      };
    }

    const events = await prisma.event.findMany({
      ...pagination,
      where,
      include: {
        batches: {
          where: { isVisible: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
      },
    });

    return formatPaginatedResponse(events, filters.limit);
  }

  /**
   * Publica um evento delegando para PublishingService
   */
  static async publish(eventId: string, producerId: string): Promise<Event> {
    return PublishingService.publish(eventId, producerId);
  }

  /**
   * Cancela um evento delegando para PublishingService
   */
  static async cancel(eventId: string, producerId: string): Promise<Event> {
    return PublishingService.cancel(eventId, producerId);
  }

  /**
   * Obtém eventos do produtor (dashboard)
   */
  static async getProducerEvents(
    producerId: string,
    pagination: { cursor?: string; limit: number },
  ): Promise<PaginatedResponse<Event>> {
    const paginationConfig = buildCursorPagination({
      cursor: pagination.cursor,
      limit: pagination.limit,
    });

    const events = await prisma.event.findMany({
      ...paginationConfig,
      where: { producerId },
    });

    return formatPaginatedResponse(events, pagination.limit);
  }

  /**
   * Obtém eventos deste fim de semana
   */
  static async getWeekendEvents(): Promise<Event[]> {
    const cached = await redis.get('events:weekend');
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    // Calcular próxima sexta e domingo
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;

    const fridayStart = new Date(now);
    fridayStart.setDate(fridayStart.getDate() + daysUntilFriday);
    fridayStart.setHours(0, 0, 0, 0);

    const sundayEnd = new Date(now);
    sundayEnd.setDate(sundayEnd.getDate() + daysUntilMonday);
    sundayEnd.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
      where: {
        status: 'published',
        startsAt: {
          gte: fridayStart,
          lte: sundayEnd,
        },
      },
      orderBy: {
        startsAt: 'asc',
      },
      take: 20,
    });

    // Cache por 6 horas
    await redis.setex('events:weekend', 21600, JSON.stringify(events));

    return events;
  }

  /**
   * Obtém eventos mais vendidos (trending)
   */
  static async getTrendingEvents(limit: number = 10): Promise<Event[]> {
    const cached = await redis.get('events:trending');
    if (cached) {
      return JSON.parse(cached);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await prisma.event.findMany({
      where: {
        status: 'published',
        tickets: {
          some: {
            createdAt: { gte: sevenDaysAgo },
          },
        },
      },
      include: {
        tickets: {
          where: {
            createdAt: { gte: sevenDaysAgo },
          },
          select: { id: true },
        },
      },
      orderBy: {
        tickets: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    // Remove o campo tickets antes de retornar
    const result = events.map(({ tickets, ...event }) => event);

    // Cache por 6 horas
    await redis.setex('events:trending', 21600, JSON.stringify(result));

    return result;
  }
}
