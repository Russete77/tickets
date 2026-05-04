import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { publishBroadcast } from '../../shared/socketBridge';
import { emailQueue } from '../queue';

interface BatchSwitchJobData {
  eventId: string;
  exhaustedBatchId: string;
}

export const batchAutoSwitchWorker = new Worker<BatchSwitchJobData>(
  'batch-auto-switch',
  async (job: Job<BatchSwitchJobData>) => {
    const { eventId, exhaustedBatchId } = job.data;

    // Busca o próximo lote disponível (por sort_order)
    const exhaustedBatch = await prisma.ticketBatch.findUnique({
      where: { id: exhaustedBatchId },
    });

    if (!exhaustedBatch || !exhaustedBatch.autoSwitch) {
      return { switched: false, reason: 'auto_switch disabled' };
    }

    const nextBatch = await prisma.ticketBatch.findFirst({
      where: {
        eventId,
        isVisible: false,
        soldCount: { lt: prisma.ticketBatch.fields.quantity },
        sortOrder: { gt: exhaustedBatch.sortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!nextBatch) {
      logger.info(`Nenhum próximo lote disponível para evento ${eventId}`);
      return { switched: false, reason: 'no_next_batch' };
    }

    // Ativa o próximo lote
    await prisma.ticketBatch.update({
      where: { id: nextBatch.id },
      data: { isVisible: true },
    });

    logger.info(
      `🔄 Lote virado: ${exhaustedBatch.name} → ${nextBatch.name} (evento ${eventId})`,
    );

    // Broadcast Socket.IO batch:switched para a sala do evento
    await publishBroadcast(`event:${eventId}`, 'batch:switched', {
      eventId,
      oldBatch: { id: exhaustedBatch.id, name: exhaustedBatch.name },
      newBatch: {
        id: nextBatch.id,
        name: nextBatch.name,
        priceCents: nextBatch.priceCents,
        type: nextBatch.type,
      },
    }).catch((err) => {
      logger.warn({ err }, 'Falha ao publicar batch:switched via Socket.IO');
    });

    // Notificar favoritos via fila de email
    const eventFavoritedBy = await prisma.favorite.findMany({
      where: { eventId },
      select: {
        userId: true,
        user: { select: { email: true, name: true } },
      },
    });

    for (const favorite of eventFavoritedBy) {
      try {
        await emailQueue.add(
          'send-email',
          {
            to: favorite.user.email,
            subject: `🎟️ Novo lote disponível`,
            template: 'new-batch-available',
            data: {
              firstName: favorite.user.name,
              batchName: nextBatch.name,
              eventId,
            },
          },
          { priority: 2 },
        );
      } catch (error) {
        logger.error({ error, userId: favorite.userId }, 'Falha ao enfileirar email de novo lote');
      }
    }

    return { switched: true, oldBatch: exhaustedBatch.name, newBatch: nextBatch.name };
  },
  { connection: redis, concurrency: 3 },
);

batchAutoSwitchWorker.on('failed', (job, err) => {
  logger.error(`❌ batch-auto-switch falhou: ${err.message}`);
});
