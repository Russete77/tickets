import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { emailQueue } from '../queue';

interface CapacityAlertJobData {
  eventId: string;
  checkedInCount: number;
}

/**
 * Worker que monitora limiares de capacidade do evento
 * Disparado quando um check-in acontece
 *
 * Alertas:
 * - 80%: Warning ao dashboard do produtor
 * - 95%: Critical alert
 * - 100%: Block further check-ins + notify security team
 */
export const capacityAlertWorker = new Worker<CapacityAlertJobData>(
  'capacity-alert',
  async (job: Job<CapacityAlertJobData>) => {
    const { eventId, checkedInCount } = job.data;

    try {
      // Fetch event with capacity info and producer
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          venueCapacity: true,
          producer: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      });

      if (!event || !event.venueCapacity) {
        logger.warn(`Event not found or no capacity set: ${eventId}`);
        return { processed: false };
      }

      const capacityPercent = Math.round((checkedInCount / event.venueCapacity) * 100);

      logger.info(
        `📊 Capacity check: ${checkedInCount}/${event.venueCapacity} (${capacityPercent}%) - ${event.title}`,
      );

      // ============================================
      // 80% - Warning
      // ============================================
      if (capacityPercent >= 80 && capacityPercent < 95) {
        const cachedKey = `capacity:warning:${eventId}`;
        const alreadyNotified = await redis.get(cachedKey);

        if (!alreadyNotified) {
          // Set cache to avoid duplicate alerts (TTL 1 hour)
          await redis.setex(cachedKey, 3600, 'notified');

          // Send email to producer
          await emailQueue.add(
            'send-email',
            {
              to: event.producer.email,
              subject: `⚠️ Alerta de Capacidade: ${event.title}`,
              template: 'capacity-warning',
              data: {
                firstName: event.producer.firstName,
                eventTitle: event.title,
                capacityPercent,
                checkedIn: checkedInCount,
                capacity: event.venueCapacity,
              },
            },
            { priority: 1 },
          );

          logger.warn(
            `⚠️ Capacity warning (80%): ${event.title} - ${checkedInCount}/${event.venueCapacity}`,
          );

          // TODO: Emit Socket.IO alert to producer dashboard
          // io.to(`producer:${event.producer.id}`).emit('capacity:warning', {
          //   eventId,
          //   capacityPercent,
          //   checkedIn: checkedInCount,
          //   capacity: event.venueCapacity,
          // });
        }
      }

      // ============================================
      // 95% - Critical Alert
      // ============================================
      if (capacityPercent >= 95 && capacityPercent < 100) {
        const cachedKey = `capacity:critical:${eventId}`;
        const alreadyNotified = await redis.get(cachedKey);

        if (!alreadyNotified) {
          // Set cache to avoid duplicate alerts (TTL 30 min)
          await redis.setex(cachedKey, 1800, 'notified');

          // Send critical email to producer
          await emailQueue.add(
            'send-email',
            {
              to: event.producer.email,
              subject: `🚨 Alerta Crítico: ${event.title} - Capacidade Crítica`,
              template: 'capacity-critical',
              data: {
                firstName: event.producer.firstName,
                eventTitle: event.title,
                capacityPercent,
                checkedIn: checkedInCount,
                capacity: event.venueCapacity,
              },
            },
            { priority: 0 }, // Highest priority
          );

          logger.error(
            `🚨 CRITICAL capacity alert (95%): ${event.title} - ${checkedInCount}/${event.venueCapacity}`,
          );

          // TODO: Emit Socket.IO critical alert
          // io.to(`producer:${event.producer.id}`).emit('capacity:critical', {
          //   eventId,
          //   capacityPercent,
          //   checkedIn: checkedInCount,
          //   capacity: event.venueCapacity,
          // });
        }
      }

      // ============================================
      // 100% - Capacity Exceeded
      // ============================================
      if (capacityPercent >= 100) {
        // Block further check-ins by updating event
        await prisma.event.update({
          where: { id: eventId },
          data: {
            status: 'at_capacity',
          },
        });

        // Send critical email to producer and security team
        await emailQueue.add(
          'send-email',
          {
            to: event.producer.email,
            subject: `🚨 EVENTO LOTADO: ${event.title}`,
            template: 'capacity-full',
            data: {
              firstName: event.producer.firstName,
              eventTitle: event.title,
              checkedIn: checkedInCount,
              capacity: event.venueCapacity,
            },
          },
          { priority: 0 },
        );

        // TODO: Email to security team
        // TODO: Emit Socket.IO alert to event room (block check-ins)

        logger.fatal(
          `🚨🚨🚨 CAPACITY EXCEEDED: ${event.title} - ${checkedInCount}/${event.venueCapacity}`,
        );
      }

      return {
        processed: true,
        capacityPercent,
        checkedInCount,
      };
    } catch (error) {
      logger.error(`Failed to process capacity alert: ${error}`);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 },
);

capacityAlertWorker.on('failed', (job, err) => {
  logger.error(`❌ capacity-alert worker falhou: ${err.message}`);
});
