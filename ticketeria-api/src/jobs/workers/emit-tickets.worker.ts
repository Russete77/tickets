import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../shared/logger';
import { generateTicketHash, generateTotpSecret } from '../../shared/crypto';
import { emailQueue } from '../queue';

interface EmitTicketsJobData {
  orderId: string;
}

export const emitTicketsWorker = new Worker<EmitTicketsJobData>(
  'emit-tickets',
  async (job: Job<EmitTicketsJobData>) => {
    const { orderId } = job.data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: true,
        user: true,
        event: true,
      },
    });

    if (!order) {
      logger.warn(`Order ${orderId} não encontrada para emissão`);
      return;
    }

    // Gera hash e TOTP para cada ticket
    for (const ticket of order.tickets) {
      const ticketHash = generateTicketHash(ticket.id, ticket.eventId, ticket.holderCpf);
      const totpSecret = generateTotpSecret();

      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          ticketHash,
          totpSecret,
          status: 'active',
        },
      });

      // Envia email do ingresso
      await emailQueue.add('ticket-issued', {
        to: ticket.holderEmail,
        subject: `Seu ingresso para ${order.event.title}`,
        template: 'ticket-issued',
        data: {
          holderName: ticket.holderName,
          eventTitle: order.event.title,
          eventDate: order.event.startsAt.toISOString(),
          venueName: order.event.venueName,
          venueAddress: order.event.venueAddress,
          batchId: ticket.batchId,
          ticketId: ticket.id,
        },
      });
    }

    // Envia email de confirmação do pedido
    await emailQueue.add('order-confirmed', {
      to: order.user.email,
      subject: `Pedido confirmado - ${order.event.title}`,
      template: 'order-confirmed',
      data: {
        userName: order.user.name,
        eventTitle: order.event.title,
        totalCents: order.totalCents,
        ticketCount: order.tickets.length,
        orderId: order.id,
      },
    });

    logger.info(
      `🎟️ ${order.tickets.length} ingressos emitidos para order ${orderId}`,
    );
  },
  { connection: redis, concurrency: 5 },
);

emitTicketsWorker.on('failed', (job, err) => {
  logger.error(`❌ emit-tickets falhou para order ${job?.data.orderId}: ${err.message}`);
});
