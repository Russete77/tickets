import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';

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

    // TODO: Broadcast Socket.IO batch:switched
    // TODO: Enviar notificação para favoritos

    return { switched: true, oldBatch: exhaustedBatch.name, newBatch: nextBatch.name };
  },
  { connection: redis, concurrency: 3 },
);

batchAutoSwitchWorker.on('failed', (job, err) => {
  logger.error(`❌ batch-auto-switch falhou: ${err.message}`);
});
