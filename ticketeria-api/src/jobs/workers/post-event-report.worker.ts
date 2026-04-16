import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { emailQueue } from '../queue';

interface PostEventReportJobData {
  // Empty data - this is a cron job
}

interface EventReport {
  eventId: string;
  eventTitle: string;
  totalTickets: number;
  soldTickets: number;
  checkedInCount: number;
  checkinRate: number;
  noShowCount: number;
  noShowRate: number;
  revenue: number;
  peakCheckInHour: string;
  reportGeneratedAt: string;
}

/**
 * Worker que gera relatórios pós-evento
 * Roda diariamente às 6h via CRON
 *
 * Lógica:
 * 1. Busca eventos que terminaram entre 48-72 horas atrás
 * 2. Para cada evento, calcula:
 *    - Total de ingressos vendidos
 *    - Taxa de check-in
 *    - Taxa de ausência
 *    - Receita total
 *    - Hora de pico de check-in
 * 3. Armazena relatório em Redis com TTL de 30 dias
 * 4. Enfileira email para produtor com resumo
 */
export const postEventReportWorker = new Worker<PostEventReportJobData>(
  'post-event-report',
  async (job: Job<PostEventReportJobData>) => {
    logger.info('📊 Post-event report worker iniciando...');

    const now = new Date();
    let reportCount = 0;
    let emailCount = 0;

    try {
      // Calculate time range: 48-72 hours ago
      const endTime48hAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const endTime72hAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

      // ============================================
      // Find events that ended 48-72 hours ago
      // ============================================
      const pastEvents = await prisma.event.findMany({
        where: {
          endsAt: {
            gte: endTime72hAgo,
            lte: endTime48hAgo,
          },
        },
        select: {
          id: true,
          title: true,
          producer: {
            select: {
              email: true,
              firstName: true,
            },
          },
        },
      });

      logger.info(`Found ${pastEvents.length} events for report generation`);

      // ============================================
      // Generate report for each event
      // ============================================
      for (const event of pastEvents) {
        try {
          // Get ticket statistics
          const allTickets = await prisma.ticket.findMany({
            where: { eventId: event.id },
            select: {
              id: true,
              status: true,
              price: true,
              usedAt: true,
            },
          });

          const soldTickets = allTickets.filter((t) => t.status !== 'cancelled');
          const checkedInCount = allTickets.filter((t) => t.status === 'used').length;
          const noShowCount = allTickets.filter((t) => t.status === 'issued' && t.usedAt === null).length;

          // Calculate rates
          const checkinRate =
            soldTickets.length > 0 ? Math.round((checkedInCount / soldTickets.length) * 100) : 0;
          const noShowRate =
            soldTickets.length > 0
              ? Math.round((noShowCount / soldTickets.length) * 100)
              : 0;

          // Calculate revenue (sum of ticket prices)
          const revenue = soldTickets.reduce((sum, ticket) => {
            return sum + (ticket.price?.toNumber() || 0);
          }, 0);

          // Find peak check-in hour
          const checkinsByHour: Record<number, number> = {};
          for (const ticket of allTickets) {
            if (ticket.usedAt) {
              const hour = new Date(ticket.usedAt).getHours();
              checkinsByHour[hour] = (checkinsByHour[hour] || 0) + 1;
            }
          }

          let peakCheckInHour = '00:00';
          let maxCheckins = 0;
          for (const [hour, count] of Object.entries(checkinsByHour)) {
            if (count > maxCheckins) {
              maxCheckins = count;
              peakCheckInHour = `${String(hour).padStart(2, '0')}:00`;
            }
          }

          // ============================================
          // Create report object
          // ============================================
          const report: EventReport = {
            eventId: event.id,
            eventTitle: event.title,
            totalTickets: allTickets.length,
            soldTickets: soldTickets.length,
            checkedInCount,
            checkinRate,
            noShowCount,
            noShowRate,
            revenue,
            peakCheckInHour,
            reportGeneratedAt: now.toISOString(),
          };

          // ============================================
          // Store in Redis (30-day TTL)
          // ============================================
          const redisKey = `report:${event.id}`;
          await redis.setex(
            redisKey,
            30 * 24 * 60 * 60, // 30 days in seconds
            JSON.stringify(report),
          );

          logger.info(
            `✅ Report generated for "${event.title}": ${checkedInCount}/${soldTickets.length} check-ins (${checkinRate}%)`,
          );

          // ============================================
          // Queue report email to producer
          // ============================================
          await emailQueue.add(
            'send-email',
            {
              to: event.producer.email,
              subject: `📊 Relatório pós-evento: ${event.title}`,
              template: 'post-event-report',
              data: {
                firstName: event.producer.firstName,
                eventTitle: event.title,
                totalTickets: report.totalTickets,
                soldTickets: report.soldTickets,
                checkedInCount: report.checkedInCount,
                checkinRate: report.checkinRate,
                noShowCount: report.noShowCount,
                noShowRate: report.noShowRate,
                revenue: (report.revenue / 100).toFixed(2), // Convert cents to dollars
                peakCheckInHour: report.peakCheckInHour,
              },
            },
            { priority: 3 },
          );

          emailCount++;
          reportCount++;
        } catch (error) {
          logger.error(`Failed to generate report for event ${event.id}: ${error}`);
        }
      }

      logger.info(
        `✅ Post-event report complete: ${reportCount} reports generated, ${emailCount} emails queued`,
      );

      return {
        reportsGenerated: reportCount,
        emailsQueued: emailCount,
      };
    } catch (error) {
      logger.error(`❌ Post-event report worker falhou: ${error}`);
      throw error;
    }
  },
  { connection: redis, concurrency: 1 },
);

postEventReportWorker.on('failed', (job, err) => {
  logger.error(`❌ post-event-report worker falhou: ${err.message}`);
});
