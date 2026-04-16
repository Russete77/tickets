import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { Event } from '../../generated/prisma/client';

/**
 * Gerencia o fluxo de publicação de eventos, transições de status e gerenciamento de lotes
 */
export class PublishingService {
  /**
   * Publica um evento
   */
  static async publish(eventId: string, producerId: string): Promise<Event> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { batches: true },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para publicar este evento');
    }

    if (event.status !== 'draft') {
      throw new BadRequestError('Apenas eventos em rascunho podem ser publicados');
    }

    if (event.batches.length === 0) {
      throw new BadRequestError('Evento deve ter pelo menos um lote de ingressos');
    }

    const publishedEvent = await prisma.event.update({
      where: { id: eventId },
      data: { status: 'published' },
    });

    // Registrar no audit log
    await logAudit({
      actorId: producerId,
      action: AuditActions.EVENT_PUBLISHED,
      entityType: 'event',
      entityId: eventId,
    });

    // Invalidar caches
    await redis.del(`event:${eventId}`);
    await redis.del(`event:slug:${event.slug}`);
    await redis.del('events:trending');
    await redis.del('events:weekend');

    return publishedEvent;
  }

  /**
   * Cancela um evento e processa reembolsos
   */
  static async cancel(eventId: string, producerId: string): Promise<Event> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.producerId !== producerId) {
      throw new ForbiddenError('Você não tem permissão para cancelar este evento');
    }

    if (event.status === 'cancelled') {
      throw new BadRequestError('Evento já está cancelado');
    }

    // Cancelar evento em transação com reembolsos
    const cancelledEvent = await prisma.$transaction(async (tx) => {
      // Atualizar status do evento
      const updated = await tx.event.update({
        where: { id: eventId },
        data: { status: 'cancelled' },
      });

      // Cancelar todos os pedidos não reembolsados
      const orders = await tx.order.findMany({
        where: {
          eventId,
          status: { in: ['pending', 'paid'] },
        },
      });

      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'cancelled' },
        });

        // Cancelar ingressos do pedido
        await tx.ticket.updateMany({
          where: { orderId: order.id },
          data: { status: 'cancelled' },
        });
      }

      return updated;
    });

    // Registrar no audit log
    await logAudit({
      actorId: producerId,
      action: AuditActions.EVENT_CANCELLED,
      entityType: 'event',
      entityId: eventId,
    });

    // Invalidar caches
    await redis.del(`event:${eventId}`);
    await redis.del(`event:slug:${event.slug}`);
    await redis.del('events:trending');
    await redis.del('events:weekend');

    return cancelledEvent;
  }
}
