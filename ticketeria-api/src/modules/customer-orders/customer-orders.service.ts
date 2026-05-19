import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { debitWithinTx, postCashlessPurchaseToLedger } from '../cashless/transaction.service';
import { emitCustomerOrderNew } from './shared/customerOrderEvents';

const CONSUMER_POS = ['bar', 'mobile', 'totem', 'vip_lounge', 'food_truck'];

// In-memory idempotency cache (process-local; sufficient for single-instance)
const idempotencyCache = new Map<string, string>();

function genPickupCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

interface OrderItem {
  productId: string;
  qty: number;
}

interface CreateInput {
  userId: string;
  eventId: string;
  posId: string;
  items: OrderItem[];
  idempotencyKey?: string;
}

export class CustomerOrdersService {
  static async create(input: CreateInput) {
    // Idempotency: return existing order if key already seen
    if (input.idempotencyKey && idempotencyCache.has(input.idempotencyKey)) {
      const existing = await prisma.customerOrder.findUnique({
        where: { id: idempotencyCache.get(input.idempotencyKey)! },
      });
      if (existing) return existing;
    }

    // Validate POS
    const posRecord = await prisma.pointOfSale.findUnique({ where: { id: input.posId } });
    if (!posRecord || posRecord.eventId !== input.eventId || posRecord.isArchived) {
      throw new NotFoundError('Bar não encontrado');
    }
    if (!CONSUMER_POS.includes(posRecord.type)) {
      throw new BadRequestError('Este ponto não aceita pedidos pelo app');
    }

    // Server-side re-pricing: fetch DB price for each item, ignore any client-supplied price
    const priced: Array<{
      productId: string;
      name: string;
      qty: number;
      priceCents: number;
      controlsStock: boolean;
    }> = [];

    for (const it of input.items) {
      const p = await prisma.pOSProduct.findUnique({ where: { id: it.productId } });
      if (!p || p.posId !== input.posId || p.isArchived) {
        throw new NotFoundError(`Produto indisponível: ${it.productId}`);
      }
      priced.push({
        productId: p.id,
        name: p.name,
        qty: it.qty,
        priceCents: p.priceCents,
        controlsStock: p.stockQty !== null && p.stockQty !== undefined,
      });
    }

    const totalCents = priced.reduce((s, i) => s + i.priceCents * i.qty, 0);

    // Stock pre-check (optimistic — authoritative check re-runs inside tx for serializability)
    for (const i of priced) {
      if (!i.controlsStock) continue;
      const fresh = await prisma.pOSProduct.findUnique({ where: { id: i.productId } });
      if (fresh && fresh.stockQty != null && fresh.stockQty < i.qty) {
        throw new BadRequestError(`Estoque insuficiente: ${i.name}`);
      }
    }

    // Validate wallet exists for this user+event (pre-transaction check)
    const wallet = await prisma.cashlessWallet.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    });
    if (!wallet) {
      throw new BadRequestError('Você não tem carteira cashless neste evento');
    }

    // Balance pre-check (optimistic — authoritative check is inside debitWithinTx)
    if (wallet.balanceCents < totalCents) {
      throw new BadRequestError('Saldo insuficiente para realizar esta compra');
    }

    const itemsSnapshot = priced.map(({ productId, name, qty, priceCents }) => ({
      productId,
      name,
      qty,
      priceCents,
    }));

    // Atomic transaction: stock decrement + wallet debit + order creation
    const order = await prisma.$transaction(
      async (tx) => {
        // Stock: check and decrement only for stock-controlled products
        for (const i of priced) {
          if (!i.controlsStock) continue;
          // Re-read stock inside tx for serializable safety (must use tx, not bare prisma)
          const fresh = await tx.pOSProduct.findUnique({ where: { id: i.productId } });
          if (fresh && fresh.stockQty != null && fresh.stockQty < i.qty) {
            throw new BadRequestError(`Estoque insuficiente: ${i.name}`);
          }
          await tx.pOSProduct.update({
            where: { id: i.productId },
            data: { stockQty: { decrement: i.qty } },
          });
        }

        // Debit wallet within the same transaction
        const debit = await debitWithinTx(tx, {
          walletId: wallet.id,
          amountCents: totalCents,
          items: itemsSnapshot,
          posId: input.posId,
          metadata: { source: 'customer_order' },
        });

        // pickupCode: must be unique among active orders of this POS
        let pickupCode = '';
        for (let attempt = 0; attempt < 5; attempt++) {
          const candidate = genPickupCode();
          const clash = await tx.customerOrder.count({
            where: { posId: input.posId, pickupCode: candidate, status: { notIn: ['delivered', 'cancelled'] } },
          });
          if (clash === 0) {
            pickupCode = candidate;
            break;
          }
        }
        if (!pickupCode) {
          throw new BadRequestError('Não foi possível gerar código de retirada, tente novamente');
        }

        // Create the order record
        return tx.customerOrder.create({
          data: {
            userId: input.userId,
            eventId: input.eventId,
            posId: input.posId,
            walletTxId: debit.transactionId,
            status: 'pending',
            totalCents,
            items: itemsSnapshot,
            pickupCode,
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );

    // Register idempotency key
    if (input.idempotencyKey) {
      idempotencyCache.set(input.idempotencyKey, order.id);
    }

    // Post-transaction side effects (fire-and-forget where appropriate)
    void postCashlessPurchaseToLedger({
      walletId: wallet.id,
      transactionId: order.walletTxId!,
      amountCents: totalCents,
      tipCents: 0,
      posId: input.posId,
    });

    const eventRecord = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { organizationId: true },
    });
    const orgId = eventRecord?.organizationId ?? '';

    await emitCustomerOrderNew(orgId, {
      orderId: order.id,
      posId: order.posId,
      userId: order.userId,
      status: order.status,
      totalCents,
      pickupCode: order.pickupCode,
      ts: Date.now(),
    });

    await logAudit({
      actorId: input.userId,
      action: AuditActions.CUSTOMER_ORDER_CREATED,
      entityType: 'CustomerOrder',
      entityId: order.id,
      metadata: { totalCents, posId: input.posId },
    });

    return order;
  }
}
