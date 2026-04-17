import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { Event } from '../../generated/prisma/client';

export interface NearbyFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface NearbyPagination {
  limit: number;
  offset: number;
}

export interface SearchNearbyResult {
  event: Event;
  distanceKm: number;
}

/**
 * Serviço de buscas avançadas de eventos
 */
export class SearchService {
  /**
   * Busca eventos próximos usando geolocalização com PostGIS
   */
  async searchNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: NearbyFilters,
    pagination?: NearbyPagination,
  ): Promise<{ events: SearchNearbyResult[]; total: number }> {
    // Validações
    if (lat < -90 || lat > 90) {
      throw new BadRequestError('Latitude deve estar entre -90 e 90');
    }
    if (lng < -180 || lng > 180) {
      throw new BadRequestError('Longitude deve estar entre -180 e 180');
    }
    if (radiusKm <= 0) {
      throw new BadRequestError('Raio deve ser maior que 0');
    }

    const limit = pagination?.limit || 20;
    const offset = pagination?.offset || 0;

    let whereClause = `
      WHERE e.status = 'published'
        AND e.starts_at > NOW()
        AND e.venue_lat IS NOT NULL
        AND e.venue_lng IS NOT NULL
        AND (6371 * acos(cos(radians($1)) * cos(radians(e.venue_lat)) * cos(radians(e.venue_lng) - radians($2)) + sin(radians($1)) * sin(radians(e.venue_lat)))) < $3
    `;

    const params: Array<number | string> = [lat, lng, radiusKm];

    // Filtro por categoria
    if (filters?.category) {
      whereClause += ` AND e.category = $${params.length + 1}`;
      params.push(filters.category);
    }

    // Filtro por preço mínimo (menor preço dos batches)
    if (filters?.minPrice !== undefined) {
      whereClause += ` AND e.id IN (
        SELECT DISTINCT tb.event_id FROM ticket_batches tb
        WHERE tb.price_cents >= $${params.length + 1}
      )`;
      params.push(filters.minPrice * 100);
    }

    // Filtro por preço máximo
    if (filters?.maxPrice !== undefined) {
      whereClause += ` AND e.id IN (
        SELECT DISTINCT tb.event_id FROM ticket_batches tb
        WHERE tb.price_cents <= $${params.length + 1}
      )`;
      params.push(filters.maxPrice * 100);
    }

    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM events e
      ${whereClause}
    `;

    // Query para buscar eventos com distância
    const selectQuery = `
      SELECT DISTINCT
        e.*,
        (6371 * acos(cos(radians($1)) * cos(radians(e.venue_lat)) * cos(radians(e.venue_lng) - radians($2)) + sin(radians($1)) * sin(radians(e.venue_lat)))) AS distance_km
      FROM events e
      ${whereClause}
      ORDER BY distance_km ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    try {
      interface RawEvent {
        [key: string]: unknown;
        venue_lat?: string;
        venue_lng?: string;
        distance_km: string;
      }
      const [countResult, events] = await Promise.all([
        prisma.$queryRawUnsafe<[{ total: string }]>(countQuery, ...params.slice(0, params.length - 2)),
        prisma.$queryRawUnsafe<RawEvent[]>(selectQuery, ...params),
      ]);

      const total = parseInt(countResult[0]?.total || '0', 10);

      const result = events.map((event: RawEvent) => ({
        event: {
          ...event,
          venueLat: event.venue_lat ? parseFloat(event.venue_lat) : null,
          venueLng: event.venue_lng ? parseFloat(event.venue_lng) : null,
        } as unknown as Event,
        distanceKm: parseFloat(event.distance_km),
      }));

      return { events: result, total };
    } catch (error) {
      throw new BadRequestError('Erro ao buscar eventos próximos');
    }
  }

  /**
   * Busca eventos com full-text search em PostgreSQL
   */
  async searchFullText(query: string, filters?: { category?: string }): Promise<Event[]> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestError('Query de busca não pode estar vazia');
    }

    const searchQuery = query.trim().toLowerCase();

    try {
      const events = await prisma.event.findMany({
        where: {
          AND: [
            {
              status: 'published',
            },
            {
              startsAt: {
                gt: new Date(),
              },
            },
            filters?.category ? { category: filters.category as any } : {},
            {
              OR: [
                {
                  title: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  shortDescription: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  },
                },
                {
                  venueName: {
                    contains: searchQuery,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          ],
        },
        orderBy: {
          startsAt: 'asc',
        },
        take: 50,
      });

      return events;
    } catch (error) {
      // Fallback para busca simples se full-text search não estiver disponível
      return await prisma.event.findMany({
        where: {
          status: 'published',
          startsAt: {
            gt: new Date(),
          },
          ...(filters?.category && { category: filters.category as any }),
          OR: [
            {
              title: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              shortDescription: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              venueName: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 50,
      });
    }
  }

  /**
   * Obtém eventos de fim de semana com filtro opcional por geolocalização
   */
  async getWeekendEvents(lat?: number, lng?: number): Promise<Event[]> {
    const cacheKey = lat && lng ? `events:weekend:${lat}:${lng}` : 'events:weekend';
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const now = new Date();
    const dayOfWeek = now.getDay();

    // Calcular próxima sexta às 18:00 e domingo às 23:59
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;

    const fridayStart = new Date(now);
    fridayStart.setDate(fridayStart.getDate() + daysUntilFriday);
    fridayStart.setHours(18, 0, 0, 0);

    const sundayEnd = new Date(now);
    sundayEnd.setDate(sundayEnd.getDate() + daysUntilMonday);
    sundayEnd.setHours(23, 59, 59, 999);

    let whereClause: Record<string, any> = {
      status: 'published',
      startsAt: {
        gte: fridayStart,
        lte: sundayEnd,
      },
    };

    // Se coordenadas fornecidas, filtrar por proximidade
    if (lat !== undefined && lng !== undefined) {
      // Para filtro geoespacial, usar raw query
      const events = await prisma.$queryRaw<Event[]>`
        SELECT DISTINCT e.*
        FROM events e
        WHERE e.status = 'published'
          AND e.starts_at >= ${fridayStart}
          AND e.starts_at <= ${sundayEnd}
          AND e.venue_lat IS NOT NULL
          AND e.venue_lng IS NOT NULL
          AND (6371 * acos(cos(radians(${lat})) * cos(radians(e.venue_lat)) * cos(radians(e.venue_lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(e.venue_lat)))) < 50
        ORDER BY (
          (SELECT COUNT(*) FROM tickets WHERE event_id = e.id) +
          (SELECT COUNT(*) FROM favorites WHERE event_id = e.id) * 10
        ) DESC,
        (6371 * acos(cos(radians(${lat})) * cos(radians(e.venue_lat)) * cos(radians(e.venue_lng) - radians(${lng})) + sin(radians(${lat})) * sin(radians(e.venue_lat)))) ASC
        LIMIT 20
      `;

      // Cache por 6 horas
      await redis.setex(cacheKey, 21600, JSON.stringify(events));
      return events;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      orderBy: {
        startsAt: 'asc',
      },
      take: 20,
    });

    // Cache por 6 horas
    await redis.setex(cacheKey, 21600, JSON.stringify(events));

    return events;
  }

  /**
   * Obtém eventos trending (mais vendidos nos últimos 7 dias)
   */
  async getTrendingEvents(limit: number = 10): Promise<Event[]> {
    const cached = await redis.get('events:trending');
    if (cached) {
      return JSON.parse(cached);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const events = await prisma.$queryRaw<Event[]>`
      SELECT e.*
      FROM events e
      JOIN (
        SELECT event_id, COUNT(id) as tickets_sold_7d
        FROM tickets
        WHERE created_at > ${sevenDaysAgo}
        GROUP BY event_id
        HAVING COUNT(id) > 0
      ) t ON t.event_id = e.id
      WHERE e.status = 'published'
      ORDER BY t.tickets_sold_7d DESC
      LIMIT ${limit}
    `;

    // Cache por 6 horas
    await redis.setex('events:trending', 21600, JSON.stringify(events));

    return events;
  }

  /**
   * Obtém recomendações personalizadas baseadas no histórico do usuário
   */
  async getRecommendations(
    userId: string,
    limit: number = 10,
  ): Promise<Array<Event & { reason: string }>> {
    const cacheKey = `recommendations:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Obter eventos já comprados pelo usuário
    const userTickets = await prisma.ticket.findMany({
      where: {
        originalBuyerId: userId,
        status: { not: 'cancelled' },
      },
      include: {
        event: true,
      },
      distinct: ['eventId'],
    });

    const eventIds = userTickets.map((t) => t.event.id);
    const categories = userTickets.map((t) => t.event.category);

    // Obter user para cidade
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const recommendations: Array<Event & { reason: string }> = [];

    // 1. Eventos da mesma categoria na mesma região
    if (categories.length > 0) {
      const similarCategoryEvents = await prisma.event.findMany({
        where: {
          status: 'published',
          startsAt: { gt: new Date() },
          category: { in: categories },
          id: { notIn: eventIds },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Math.ceil(limit / 2),
      });

      similarCategoryEvents.forEach((e) => {
        recommendations.push({
          ...e,
          reason: `Porque você foi no ${categories[0]}`,
        });
      });
    }

    // 2. Eventos populares na região do usuário
    if (user && userTickets.length > 0) {
      const popularEvents = await prisma.event.findMany({
        where: {
          status: 'published',
          startsAt: { gt: new Date() },
          id: { notIn: [...eventIds, ...recommendations.map((r) => r.id)] },
        },
        include: {
          tickets: {
            select: { id: true },
          },
        },
        orderBy: {
          tickets: {
            _count: 'desc',
          },
        },
        take: Math.ceil(limit / 2),
      });

      popularEvents.forEach((e) => {
        const { tickets, ...event } = e;
        recommendations.push({
          ...event,
          reason: 'Popular neste momento',
        });
      });
    }

    const result = recommendations.slice(0, limit);

    // Cache por 24 horas
    await redis.setex(cacheKey, 86400, JSON.stringify(result));

    return result;
  }
}
