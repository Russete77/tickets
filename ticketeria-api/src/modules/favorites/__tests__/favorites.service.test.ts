import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FavoritesService } from '../favorites.service';
import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import { NotFoundError } from '../../../shared/errors';
import { createMockUser, createMockEvent } from '../../../tests/helpers';

describe('FavoritesService', () => {
  const favoritesService = new FavoritesService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toggleFavorite', () => {
    it('should add event to favorites if not already favorited', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.create).mockResolvedValueOnce({
        id: 'fav-id',
        userId: user.id,
        eventId: event.id,
        createdAt: new Date(),
      } as any);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      const result = await favoritesService.toggleFavorite(event.id, user.id);

      expect(result.favorited).toBe(true);
      expect(prisma.favorite.create).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });

    it('should remove event from favorites if already favorited', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValueOnce({
        id: 'fav-id',
        userId: user.id,
        eventId: event.id,
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.favorite.delete).mockResolvedValueOnce({
        id: 'fav-id',
        userId: user.id,
        eventId: event.id,
        createdAt: new Date(),
      } as any);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      const result = await favoritesService.toggleFavorite(event.id, user.id);

      expect(result.favorited).toBe(false);
      expect(prisma.favorite.delete).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });

    it('should throw NotFoundError if event does not exist', async () => {
      const user = createMockUser();

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(null);

      await expect(favoritesService.toggleFavorite('nonexistent', user.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('should invalidate cache after toggle', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(prisma.event.findUnique).mockResolvedValueOnce(event as any);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.create).mockResolvedValueOnce({
        id: 'fav-id',
        userId: user.id,
        eventId: event.id,
        createdAt: new Date(),
      } as any);
      vi.mocked(redis.del).mockResolvedValueOnce(1);

      await favoritesService.toggleFavorite(event.id, user.id);

      expect(redis.del).toHaveBeenCalledWith(`user_favorites:${user.id}`);
    });
  });

  describe('getMyFavorites', () => {
    it('should return paginated favorites from cache if available', async () => {
      const user = createMockUser();
      const favorites = [
        createMockEvent({ id: 'event1' }),
        createMockEvent({ id: 'event2' }),
      ];

      const cachedData = JSON.stringify({
        data: favorites,
        pagination: { hasMore: false },
      });

      vi.mocked(redis.get).mockResolvedValueOnce(cachedData);

      const result = await favoritesService.getMyFavorites(user.id, { limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(redis.get).toHaveBeenCalledWith(`user_favorites:${user.id}`);
    });

    it('should fetch from database if not in cache', async () => {
      const user = createMockUser();
      const favorites = [
        createMockEvent({ id: 'event1' }),
        createMockEvent({ id: 'event2' }),
      ];

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findMany).mockResolvedValueOnce(
        favorites.map((event) => ({
          id: 'fav-id',
          userId: user.id,
          eventId: event.id,
          createdAt: new Date(),
          event,
        })) as any
      );
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await favoritesService.getMyFavorites(user.id, { limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(prisma.favorite.findMany).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalled();
    });

    it('should apply pagination cursor', async () => {
      const user = createMockUser();
      const cursor = 'cursor-id';

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findMany).mockResolvedValueOnce([]);

      await favoritesService.getMyFavorites(user.id, { cursor, limit: 20, direction: 'forward' });

      const call = vi.mocked(prisma.favorite.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('cursor');
    });

    it('should cache favorites for performance', async () => {
      const user = createMockUser();
      const favorites = [createMockEvent({ id: 'event1' })];

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findMany).mockResolvedValueOnce(
        favorites.map((event) => ({
          id: 'fav-id',
          userId: user.id,
          eventId: event.id,
          createdAt: new Date(),
          event,
        })) as any
      );
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      await favoritesService.getMyFavorites(user.id, { limit: 20 });

      expect(redis.setex).toHaveBeenCalledWith(
        `user_favorites:${user.id}`,
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should include full event details', async () => {
      const user = createMockUser();

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findMany).mockResolvedValueOnce([]);

      await favoritesService.getMyFavorites(user.id, { limit: 20 });

      const call = vi.mocked(prisma.favorite.findMany).mock.calls[0];
      expect(call[0]).toHaveProperty('include');
    });
  });

  describe('isFavorited', () => {
    it('should return true if event is favorited', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce('true');

      const result = await favoritesService.isFavorited(event.id, user.id);

      expect(result).toBe(true);
      expect(redis.get).toHaveBeenCalled();
    });

    it('should return false if event is not favorited', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValueOnce(null);

      const result = await favoritesService.isFavorited(event.id, user.id);

      expect(result).toBe(false);
    });

    it('should check cache first before database', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce('true');

      await favoritesService.isFavorited(event.id, user.id);

      expect(redis.get).toHaveBeenCalledWith(`favorite:${user.id}:${event.id}`);
      expect(prisma.favorite.findUnique).not.toHaveBeenCalled();
    });

    it('should cache result after database query', async () => {
      const user = createMockUser();
      const event = createMockEvent();

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.findUnique).mockResolvedValueOnce({
        id: 'fav-id',
        userId: user.id,
        eventId: event.id,
        createdAt: new Date(),
      } as any);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await favoritesService.isFavorited(event.id, user.id);

      expect(result).toBe(true);
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('getFavoriteCount', () => {
    it('should return number of user favorites', async () => {
      const user = createMockUser();

      vi.mocked(redis.get).mockResolvedValueOnce('42');

      const result = await (favoritesService as any).getFavoriteCount(user.id);

      expect(result).toBe(42);
    });

    it('should count from database if not cached', async () => {
      const user = createMockUser();

      vi.mocked(redis.get).mockResolvedValueOnce(null);
      vi.mocked(prisma.favorite.count).mockResolvedValueOnce(15);
      vi.mocked(redis.setex).mockResolvedValueOnce('OK');

      const result = await (favoritesService as any).getFavoriteCount(user.id);

      expect(result).toBe(15);
      expect(prisma.favorite.count).toHaveBeenCalled();
    });
  });

  describe('batchToggleFavorites', () => {
    it('should toggle multiple favorites atomically', async () => {
      const user = createMockUser();
      const eventIds = ['event1', 'event2', 'event3'];

      vi.mocked(prisma.event.findMany).mockResolvedValueOnce(
        eventIds.map((id) => ({ id } as any))
      );
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const result = await callback(prisma);
        return result;
      });
      vi.mocked(redis.del).mockResolvedValue(1);

      const result = await (favoritesService as any).batchToggleFavorites(eventIds, user.id);

      expect(result).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
