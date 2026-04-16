import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { decrypt } from '../../shared/crypto';
import { logAudit, AuditActions } from '../../shared/audit';
import { BadRequestError, InternalError, NotFoundError, ConflictError } from '../../shared/errors';
import { CheckoutInput, CheckoutItemInput, calculateExpirationDate } from './payments.validators';
import { Order, OrderStatus, PaymentMethod, Ticket } from '../../generated/prisma/client';

/**
 * Gerencia o fluxo de checkout: validação, cálculo de preços e criação de pedidos
 */
export class CheckoutService {
  /**
   * Realiza o checkout completo com validação, cálculo de preço e criação de pedido
   * Pipeline: validação → limites de taxa → verificação de estoque → cálculo de preço → avaliação de risco → reserva de tickets → criar pedido+tickets em transação → enviar para Asaas → retornar
   */
  static async checkout(
    userId: string,
    data: CheckoutInput,
    riskAssessment: { score: number; status: 'approve' | 'review' | 'block'; reasons: string[] },
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    order: Order & { tickets: Ticket[] };
    platformFeePercent: number;
  }> {
    // 1. Validar evento existe e está publicado
    const event = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        batches: {
          where: { isVisible: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Evento não encontrado');
    }

    if (event.status !== 'published') {
      throw new BadRequestError('Evento não está disponível para compra');
    }

    // 2. Validar itens e verificar estoque com SELECT FOR UPDATE SKIP LOCKED
    const itemsByBatch = new Map<string, number>();

    for (const item of data.items) {
      const count = itemsByBatch.get(item.batchId) || 0;
      itemsByBatch.set(item.batchId, count + item.quantity);
    }

    // Verifica disponibilidade de estoque de forma thread-safe
    const batchesToUpdate = await prisma.$queryRaw<
      Array<{ id: string; quantity: number; soldCount: number; priceCents: number }>
    >`
      SELECT id, quantity, "sold_count", "price_cents"
      FROM ticket_batches
      WHERE id = ANY(${Array.from(itemsByBatch.keys())})
      FOR UPDATE SKIP LOCKED
    `;

    const stockMap = new Map<string, { available: number; price: number }>();

    for (const batch of batchesToUpdate) {
      const requested = itemsByBatch.get(batch.id) || 0;
      const available = batch.quantity - batch.soldCount;

      if (available < requested) {
        throw new ConflictError(
          `Estoque insuficiente para o lote. Disponível: ${available}, Solicitado: ${requested}`,
        );
      }

      stockMap.set(batch.id, { available: available - requested, price: batch.priceCents });
    }

    // 3. Calcular preço total e aplicar cupom
    const { totalCents, itemsWithPrice } = await this.calculateTotal(
      data,
      stockMap,
    );

    // 4. Buscar produtor do evento para obter platformFeePercent
    const eventWithProducer = await prisma.event.findUnique({
      where: { id: data.eventId },
      include: {
        producer: {
          include: {
            producerProfile: true,
          },
        },
      },
    });

    if (!eventWithProducer || !eventWithProducer.producer) {
      throw new NotFoundError('Evento ou produtor não encontrado');
    }

    const platformFeePercent = Number(eventWithProducer.producer.producerProfile?.platformFeePercent || 10);
    const platformFeeCents = Math.floor(totalCents * (platformFeePercent / 100));
    const subtotalCents = totalCents + platformFeeCents;

    // 5. Avaliar risco
    if (riskAssessment.status === 'block') {
      throw new BadRequestError(
        'Sua compra foi bloqueada por razões de segurança. Entre em contato com o suporte.',
        {
          riskReasons: riskAssessment.reasons,
        },
      );
    }

    // 6. Reservar tickets e criar pedido em transação
    const expiresAt = calculateExpirationDate(data.paymentMethod as 'pix' | 'credit_card' | 'boleto');

    const order = await prisma.$transaction(async (tx) => {
      // Atualizar contagem de vendidos dos lotes
      for (const [batchId, quantity] of itemsByBatch.entries()) {
        await tx.ticketBatch.update({
          where: { id: batchId },
          data: {
            soldCount: {
              increment: quantity,
            },
          },
        });
      }

      // Criar pedido
      const createdOrder = await tx.order.create({
        data: {
          userId,
          eventId: data.eventId,
          status: OrderStatus.pending,
          totalCents: subtotalCents,
          platformFeeCents,
          paymentMethod: data.paymentMethod as PaymentMethod,
          ipAddress: ipAddress || '',
          userAgent: userAgent || '',
          deviceFingerprint: data.deviceFingerprint || '',
          riskScore: riskAssessment.score,
          expiresAt,
        },
      });

      // Criar tickets (vazios de ticketHash/totpSecret, serão preenchidos na confirmação)
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundError('Usuário não encontrado');
      }

      const tickets: Ticket[] = [];

      for (const item of itemsWithPrice) {
        for (let i = 0; i < item.quantity; i++) {
          const ticket = await tx.ticket.create({
            data: {
              orderId: createdOrder.id,
              batchId: item.batchId,
              eventId: data.eventId,
              holderId: userId,
              originalBuyerId: userId,
              status: 'active',
              ticketHash: '', // Preenchido na confirmação
              totpSecret: '', // Preenchido na confirmação
              holderName: item.holderName,
              holderCpf: item.holderCpf,
              holderEmail: user.email,
              priceCents: item.priceCents,
            },
          });

          tickets.push(ticket);
        }
      }

      return { ...createdOrder, tickets };
    });

    // 7. Log de auditoria
    await logAudit({
      actorId: userId,
      action: AuditActions.ORDER_CREATED,
      entityType: 'Order',
      entityId: order.id,
      metadata: {
        eventId: data.eventId,
        itemCount: data.items.length,
        totalCents: subtotalCents,
        paymentMethod: data.paymentMethod,
        riskScore: riskAssessment.score,
        riskStatus: riskAssessment.status,
      },
      ipAddress,
      userAgent,
    });

    return {
      order,
      platformFeePercent,
    };
  }

  /**
   * Calcula o preço total com validação e aplicação de cupom
   */
  private static async calculateTotal(
    data: CheckoutInput,
    stockMap: Map<string, { available: number; price: number }>,
  ): Promise<{
    totalCents: number;
    itemsWithPrice: Array<CheckoutItemInput & { priceCents: number }>;
  }> {
    let totalCents = 0;
    const itemsWithPrice: Array<CheckoutItemInput & { priceCents: number }> = [];

    for (const item of data.items) {
      const price = stockMap.get(item.batchId)?.price || 0;
      const itemTotal = price * item.quantity;
      totalCents += itemTotal;

      itemsWithPrice.push({
        ...item,
        priceCents: price,
      });
    }

    // Validar e aplicar cupom se fornecido
    if (data.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: {
          eventId_code: {
            eventId: data.eventId,
            code: data.couponCode,
          },
        },
      });

      if (!coupon) {
        throw new BadRequestError('Cupom de desconto inválido');
      }

      if (!coupon.isActive) {
        throw new BadRequestError('Cupom de desconto não está ativo');
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        throw new ConflictError('Cupom de desconto esgotado');
      }

      const now = new Date();
      if (coupon.startsAt && coupon.startsAt > now) {
        throw new BadRequestError('Cupom de desconto ainda não está válido');
      }

      if (coupon.endsAt && coupon.endsAt < now) {
        throw new BadRequestError('Cupom de desconto expirou');
      }

      // Aplicar desconto
      if (coupon.discountType === 'percentage') {
        const discount = (totalCents * Number(coupon.discountValue)) / 100;
        totalCents = Math.max(0, totalCents - Math.floor(discount));
      } else {
        const discountCents = Math.floor(Number(coupon.discountValue) * 100);
        totalCents = Math.max(0, totalCents - discountCents);
      }
    }

    return { totalCents, itemsWithPrice };
  }
}
