import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { Server as SocketIOServer } from 'socket.io';

interface RecentPurchase {
  firstName: string;
  ticketCount: number;
  eventTitle: string;
  timestamp: string;
}

interface LiveStats {
  recentPurchases: RecentPurchase[];
  onlineViewers: number;
  capacityPercent: number;
}

/**
 * Service para gerenciar estatísticas em tempo real
 * Inclui prova social (compras recentes) e visualizadores online
 */
export class LiveService {
  /**
   * Registra uma compra recente no Redis
   * Armazena em lista de até 50 compras por evento
   */
  static async recordPurchase(
    eventId: string,
    buyerFirstName: string,
    ticketCount: number,
  ): Promise<void> {
    try {
      // Fetch event title
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: { title: true },
      });

      if (!event) {
        logger.warn(`Event not found for purchase recording: ${eventId}`);
        return;
      }

      const purchase: RecentPurchase = {
        firstName: buyerFirstName,
        ticketCount,
        eventTitle: event.title,
        timestamp: new Date().toISOString(),
      };

      // Store in Redis list: LPUSH (newest first) + LTRIM (keep last 50)
      const globalKey = 'live:purchases:global';
      const eventKey = `live:purchases:${eventId}`;

      // Add to both global and event-specific lists
      await Promise.all([
        redis.lpush(globalKey, JSON.stringify(purchase)),
        redis.ltrim(globalKey, 0, 49),
        redis.lpush(eventKey, JSON.stringify(purchase)),
        redis.ltrim(eventKey, 0, 49),
      ]);

      logger.debug(`📌 Purchase recorded: ${buyerFirstName} bought ${ticketCount} tickets for event ${eventId}`);
    } catch (error) {
      logger.error(`Failed to record purchase: ${error}`);
    }
  }

  /**
   * Obtém compras recentes de um evento ou globais
   */
  static async getRecentPurchases(
    eventId?: string,
    limit: number = 10,
  ): Promise<RecentPurchase[]> {
    try {
      const key = eventId ? `live:purchases:${eventId}` : 'live:purchases:global';
      const data = await redis.lrange(key, 0, limit - 1);

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((item) => {
        try {
          return JSON.parse(item) as RecentPurchase;
        } catch {
          return null;
        }
      }).filter((item): item is RecentPurchase => item !== null);
    } catch (error) {
      logger.error(`Failed to get recent purchases: ${error}`);
      return [];
    }
  }

  /**
   * Registra um visualizador online
   * TTL de 2 minutos (120 segundos) - heartbeat requerido
   */
  static async recordOnlineViewer(eventId: string, sessionId: string): Promise<void> {
    try {
      const key = `live:viewers:${eventId}`;

      // SADD to set + EXPIRE for TTL
      await Promise.all([
        redis.sadd(key, sessionId),
        redis.expire(key, 120), // 2-minute heartbeat
      ]);

      logger.debug(`👁️ Viewer recorded: ${sessionId} in event ${eventId}`);
    } catch (error) {
      logger.error(`Failed to record online viewer: ${error}`);
    }
  }

  /**
   * Obtém contagem de visualizadores online
   */
  static async getOnlineViewerCount(eventId: string): Promise<number> {
    try {
      const key = `live:viewers:${eventId}`;
      const count = await redis.scard(key);
      return count || 0;
    } catch (error) {
      logger.error(`Failed to get online viewer count: ${error}`);
      return 0;
    }
  }

  /**
   * Broadcast de compra para Socket.IO
   * Emite para room do evento e global
   */
  static async broadcastPurchase(
    io: SocketIOServer,
    eventId: string,
    data: {
      firstName: string;
      ticketCount: number;
      eventTitle: string;
    },
  ): Promise<void> {
    try {
      const payload = {
        ...data,
        timestamp: new Date().toISOString(),
      };

      // Emit to event room and home room
      io.to(`event:${eventId}`).emit('sales:live', payload);
      io.to('home').emit('sales:live', payload);

      logger.debug(`📡 Purchase broadcast: ${data.firstName} - ${eventId}`);
    } catch (error) {
      logger.error(`Failed to broadcast purchase: ${error}`);
    }
  }

  /**
   * Broadcast de atualização de capacidade
   * Calcula % atual e emite para dashboard do produtor
   */
  static async broadcastCapacityUpdate(
    io: SocketIOServer,
    eventId: string,
  ): Promise<void> {
    try {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          venueCapacity: true,
          _count: {
            select: { tickets: { where: { status: 'used' } } },
          },
        },
      });

      if (!event || !event.venueCapacity) {
        return;
      }

      const checkedInCount = event._count.tickets;
      const capacityPercent = Math.round((checkedInCount / event.venueCapacity) * 100);

      const payload = {
        eventId,
        checkedIn: checkedInCount,
        capacity: event.venueCapacity,
        capacityPercent,
      };

      // Emit to producer dashboard and event room
      io.to(`event:${eventId}`).emit('checkin:capacity', payload);

      logger.debug(`🏢 Capacity update: ${checkedInCount}/${event.venueCapacity} (${capacityPercent}%) - ${eventId}`);
    } catch (error) {
      logger.error(`Failed to broadcast capacity update: ${error}`);
    }
  }

  /**
   * Obtém estatísticas combinadas em tempo real
   */
  static async getEventLiveStats(eventId: string): Promise<LiveStats> {
    try {
      const [recentPurchases, onlineViewers] = await Promise.all([
        this.getRecentPurchases(eventId, 5),
        this.getOnlineViewerCount(eventId),
      ]);

      // Get capacity info
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          venueCapacity: true,
          _count: {
            select: { tickets: { where: { status: 'used' } } },
          },
        },
      });

      let capacityPercent = 0;
      if (event && event.venueCapacity && event._count.tickets >= 0) {
        capacityPercent = Math.round((event._count.tickets / event.venueCapacity) * 100);
      }

      return {
        recentPurchases,
        onlineViewers,
        capacityPercent,
      };
    } catch (error) {
      logger.error(`Failed to get event live stats: ${error}`);
      return {
        recentPurchases: [],
        onlineViewers: 0,
        capacityPercent: 0,
      };
    }
  }
}
