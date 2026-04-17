import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ConflictError } from '../../shared/errors';
import { PaginatedResponse, buildCursorPagination, formatPaginatedResponse } from '../../shared/pagination';
import { Event, Favorite } from '../../generated/prisma/client';

export interface PaginationInput {
  cursor?: string;
  limit: number;
}

/**
 * Serviço de gerenciamento de favoritos
 */
export class FavoritesService {
  /**
   * Ativa ou desativa favorito (toggle - idempotente)
   */
  async toggleFavorite(userId: string, eventId: string): Promise<{ isFavorited: boolean }> {
    // Verificar se evento existe
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    // Verificar se já existe favorito
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existing) {
      // Remover favorito
      await prisma.favorite.delete({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
      });

      // Invalidar caches
      await this.invalidateFavoritesCache(userId, eventId);

      return { isFavorited: false };
    } else {
      // Adicionar favorito
      await prisma.favorite.create({
        data: {
          userId,
          eventId,
        },
      });

      // Invalidar caches
      await this.invalidateFavoritesCache(userId, eventId);

      return { isFavorited: true };
    }
  }

  /**
   * Obtém favoritos do usuário com dados do evento
   */
  async getMyFavorites(userId: string, pagination: PaginationInput): Promise<PaginatedResponse<Event>> {
    const paginationConfig = buildCursorPagination({
      cursor: pagination.cursor,
      limit: pagination.limit,
      direction: 'forward',
    });

    const favorites = await prisma.favorite.findMany({
      ...paginationConfig,
      where: { userId },
      include: {
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const events = favorites.map((f) => f.event);

    return formatPaginatedResponse(events, pagination.limit);
  }

  /**
   * Verifica se um evento é favorito do usuário
   */
  async isFavorited(userId: string, eventId: string): Promise<boolean> {
    const cacheKey = `favorite:${userId}:${eventId}`;
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    const isFavorited = !!favorite;

    // Cache por 24 horas
    await redis.setex(cacheKey, 86400, isFavorited ? 'true' : 'false');

    return isFavorited;
  }

  /**
   * Obtém contagem de favoritos para um evento
   */
  async getFavoriteCount(eventId: string): Promise<number> {
    const cacheKey = `favorite:count:${eventId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return parseInt(cached, 10);
    }

    const count = await prisma.favorite.count({
      where: { eventId },
    });

    // Cache por 1 hora
    await redis.setex(cacheKey, 3600, count.toString());

    return count;
  }

  /**
   * Invalida caches relacionados a favoritos
   */
  private async invalidateFavoritesCache(userId: string, eventId: string): Promise<void> {
    const keysToDelete = [
      `favorite:${userId}:${eventId}`,
      `favorite:count:${eventId}`,
      `favorites:${userId}:*`, // Padrão para todos os cursores do usuário
    ];

    for (const key of keysToDelete) {
      if (key.includes('*')) {
        // Para padrões, usar Redis KEYS
        const keys = await redis.keys(key);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        await redis.del(key);
      }
    }
  }
}
