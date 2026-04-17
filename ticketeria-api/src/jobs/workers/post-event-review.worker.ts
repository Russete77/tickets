import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { emailQueue } from '../queue';

interface PostEventReviewJobData {
  // Empty data - this is a cron job
}

/**
 * Worker que envia pedidos de avaliação pós-evento
 * Roda diariamente às 10h via CRON
 *
 * Lógica:
 * 1. Busca eventos que terminaram entre 24-48 horas atrás
 * 2. Para cada evento, busca todos os ingressos com status = 'used'
 * 3. Enfileira email de pedido de avaliação para cada comprador
 */
export const postEventReviewWorker = new Worker<PostEventReviewJobData>(
  'post-event-review',
  async (job: Job<PostEventReviewJobData>) => {
    logger.info('📝 Post-event review worker iniciando...');

    const now = new Date();
    let eventCount = 0;
    let emailCount = 0;

    try {
      // Calculate time range: 24-48 hours ago
      const endTime24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const endTime48hAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // ============================================
      // Find events that ended 24-48 hours ago
      // ============================================
      const recentEvents = await prisma.event.findMany({
        where: {
          endsAt: {
            gte: endTime48hAgo,
            lte: endTime24hAgo,
          },
        },
        select: {
          id: true,
          title: true,
          slug: true,
          producerId: true,
        },
      });

      logger.info(`Found ${recentEvents.length} events for review requests`);

      // ============================================
      // For each event, find used tickets and queue review emails
      // ============================================
      for (const event of recentEvents) {
        const usedTickets = await prisma.ticket.findMany({
          where: {
            eventId: event.id,
            status: 'used',
          },
          select: {
            id: true,
            holderEmail: true,
            holderName: true,
            orderId: true,
          },
        });

        logger.debug(`Event "${event.title}": ${usedTickets.length} used tickets found`);

        // Queue review request email for each ticket holder
        for (const ticket of usedTickets) {
          try {
            await emailQueue.add(
              'send-email',
              {
                to: ticket.holderEmail,
                subject: `Nos conte sua experiência em ${event.title}! 🎉`,
                template: 'review-request',
                data: {
                  firstName: ticket.holderName,
                  eventTitle: event.title,
                  eventSlug: event.slug,
                  ticketId: ticket.id,
                  orderId: ticket.orderId,
                },
              },
              { priority: 3 },
            );

            emailCount++;
          } catch (error) {
            logger.error(`Failed to queue review email for ticket ${ticket.id}: ${error}`);
          }
        }

        eventCount++;
      }

      logger.info(
        `✅ Post-event review complete: ${eventCount} events, ${emailCount} review request emails queued`,
      );

      return {
        eventsProcessed: eventCount,
        emailsQueued: emailCount,
      };
    } catch (error) {
      logger.error(`❌ Post-event review worker falhou: ${error}`);
      throw error;
    }
  },
  { connection: redis, concurrency: 1 },
);

postEventReviewWorker.on('failed', (job, err) => {
  logger.error(`❌ post-event-review worker falhou: ${err.message}`);
});
