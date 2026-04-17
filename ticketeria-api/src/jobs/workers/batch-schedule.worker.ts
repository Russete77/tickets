import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { emailQueue } from '../queue';

interface BatchScheduleJobData {
  // Empty data - this is a cron job
}

/**
 * Worker que gerencia visibilidade de lotes conforme agendamento
 * Roda a cada 5 minutos via CRON
 *
 * Lógica:
 * 1. Ativa lotes onde starts_at <= NOW() e is_visible = false
 * 2. Desativa lotes onde ends_at <= NOW() e is_visible = true
 * 3. Se lote foi esgotado (auto_switch = true), ativa próximo lote
 */
export const batchScheduleWorker = new Worker<BatchScheduleJobData>(
  'batch-schedule',
  async (job: Job<BatchScheduleJobData>) => {
    logger.info('⏰ Batch schedule worker iniciando...');

    const now = new Date();
    let activatedCount = 0;
    let deactivatedCount = 0;
    let switchedCount = 0;

    try {
      // ============================================
      // 1. Ativar lotes agendados
      // ============================================
      const batchesToActivate = await prisma.ticketBatch.findMany({
        where: {
          startsAt: {
            lte: now,
          },
          isVisible: false,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      for (const batch of batchesToActivate) {
        await prisma.ticketBatch.update({
          where: { id: batch.id },
          data: { isVisible: true },
        });

        logger.info(`✅ Lote ativado: ${batch.name} (${batch.event.title})`);
        activatedCount++;
      }

      // ============================================
      // 2. Desativar lotes expirados
      // ============================================
      const batchesToDeactivate = await prisma.ticketBatch.findMany({
        where: {
          endsAt: {
            lte: now,
          },
          isVisible: true,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      for (const batch of batchesToDeactivate) {
        await prisma.ticketBatch.update({
          where: { id: batch.id },
          data: { isVisible: false },
        });

        logger.info(`🔴 Lote desativado: ${batch.name} (${batch.event.title})`);
        deactivatedCount++;
      }

      // ============================================
      // 3. Auto-switch para próximo lote
      // ============================================
      const soldOutBatches = await prisma.ticketBatch.findMany({
        where: {
          soldCount: {
            gte: prisma.ticketBatch.fields.quantity,
          },
          autoSwitch: true,
          isVisible: true,
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      for (const exhaustedBatch of soldOutBatches) {
        // Find next batch by sort order
        const nextBatch = await prisma.ticketBatch.findFirst({
          where: {
            eventId: exhaustedBatch.eventId,
            isVisible: false,
            sortOrder: { gt: exhaustedBatch.sortOrder },
          },
          orderBy: { sortOrder: 'asc' },
        });

        if (!nextBatch) {
          logger.debug(`Nenhum próximo lote para auto-switch: ${exhaustedBatch.event.title}`);
          continue;
        }

        // Make next batch visible
        await prisma.ticketBatch.update({
          where: { id: nextBatch.id },
          data: { isVisible: true },
        });

        logger.info(
          `🔄 Auto-switch: ${exhaustedBatch.name} → ${nextBatch.name} (${exhaustedBatch.event.title})`,
        );

        switchedCount++;

        // ============================================
        // Notify users who favorited this event
        // ============================================
        const eventFavoritedBy = await prisma.favorite.findMany({
          where: {
            eventId: exhaustedBatch.eventId,
          },
          select: {
            userId: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        });

        for (const favorite of eventFavoritedBy) {
          try {
            // Enqueue notification email
            await emailQueue.add(
              'send-email',
              {
                to: favorite.user.email,
                subject: `🎟️ Novo lote disponível: ${exhaustedBatch.event.title}`,
                template: 'new-batch-available',
                data: {
                  firstName: favorite.user.name,
                  eventTitle: exhaustedBatch.event.title,
                  batchName: nextBatch.name,
                  eventId: exhaustedBatch.eventId,
                },
              },
              { priority: 2 },
            );

            logger.debug(`📧 Email queued: new batch notification for ${favorite.user.email}`);
          } catch (error) {
            logger.error(`Failed to queue email for user ${favorite.userId}: ${error}`);
          }
        }

        // TODO: Emit Socket.IO event batch:switched to event room
        // io.to(`event:${exhaustedBatch.eventId}`).emit('batch:switched', {
        //   oldBatch: exhaustedBatch.name,
        //   newBatch: nextBatch.name,
        // });
      }

      logger.info(
        `✅ Batch schedule complete: ${activatedCount} ativados, ${deactivatedCount} desativados, ${switchedCount} switched`,
      );

      return {
        activated: activatedCount,
        deactivated: deactivatedCount,
        switched: switchedCount,
      };
    } catch (error) {
      logger.error(`❌ Batch schedule worker falhou: ${error}`);
      throw error;
    }
  },
  { connection: redis, concurrency: 1 },
);

batchScheduleWorker.on('failed', (job, err) => {
  logger.error(`❌ batch-schedule worker falhou: ${err.message}`);
});
