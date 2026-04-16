import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';

export const expireReservationsWorker = new Worker(
  'expire-reservations',
  async (_job: Job) => {
    const now = new Date();

    // Busca orders pendentes expiradas
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'pending',
        expiresAt: { lt: now },
      },
      include: {
        tickets: {
          include: { batch: true },
        },
      },
    });

    if (expiredOrders.length === 0) return { expired: 0 };

    logger.info(`⏰ ${expiredOrders.length} reservas expiradas encontradas`);

    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // Cancela a order
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'cancelled' },
        });

        // Cancela os tickets
        await tx.ticket.updateMany({
          where: { orderId: order.id },
          data: { status: 'cancelled' },
        });

        // Devolve estoque para cada batch
        for (const ticket of order.tickets) {
          await tx.ticketBatch.update({
            where: { id: ticket.batchId },
            data: { soldCount: { decrement: 1 } },
          });
        }
      });

      logger.info(`🗑️ Order ${order.id} expirada e cancelada (${order.tickets.length} tickets)`);
    }

    return { expired: expiredOrders.length };
  },
  { connection: redis, concurrency: 1 },
);

expireReservationsWorker.on('failed', (job, err) => {
  logger.error(`❌ expire-reservations falhou: ${err.message}`);
});
