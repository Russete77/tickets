import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import {
  assertProductBelongsToOrg,
  assertPosBelongsToOrg,
  assertEventBelongsToOrg,
} from '../shared/orgScope';
import { emitStockLow, emitStockOut } from '../shared/catalogEvents';
import type { StockMovementType } from '../../../generated/prisma/client';

interface CreateMovementInput {
  organizationId: string;
  productId: string;
  actorId: string;
  data: { type: 'stock_entry' | 'adjustment' | 'loss'; quantity: number; notes?: string };
}

interface ListMovementsInput {
  organizationId: string;
  productId: string;
  cursor?: string;
  limit: number;
}

export class StockService {
  static async stockOverviewByEvent({
    organizationId,
    eventId,
  }: {
    organizationId: string;
    eventId: string;
  }) {
    await assertEventBelongsToOrg(eventId, organizationId);
    const products = await prisma.pOSProduct.findMany({
      where: { pos: { eventId, isArchived: false }, isArchived: false },
      include: { pos: { select: { id: true, name: true } } },
      orderBy: [{ pos: { name: 'asc' } }, { name: 'asc' }],
    });
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      posId: p.posId,
      posName: p.pos.name,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      status:
        p.stockQty == null
          ? 'untracked'
          : p.stockQty === 0
          ? 'out'
          : p.lowStockThreshold && p.stockQty <= p.lowStockThreshold
          ? 'low'
          : 'ok',
    }));
  }

  static async stockOverviewByPos({
    organizationId,
    posId,
  }: {
    organizationId: string;
    posId: string;
  }) {
    await assertPosBelongsToOrg(posId, organizationId);
    const products = await prisma.pOSProduct.findMany({
      where: { posId, isArchived: false },
      orderBy: { name: 'asc' },
    });
    return products.map((p) => ({
      productId: p.id,
      name: p.name,
      stockQty: p.stockQty,
      lowStockThreshold: p.lowStockThreshold,
      status:
        p.stockQty == null
          ? 'untracked'
          : p.stockQty === 0
          ? 'out'
          : p.lowStockThreshold && p.stockQty <= p.lowStockThreshold
          ? 'low'
          : 'ok',
    }));
  }

  static async listMovements({ organizationId, productId, cursor, limit }: ListMovementsInput) {
    await assertProductBelongsToOrg(productId, organizationId);
    const items = await prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return {
      items,
      nextCursor: items.length === limit ? items[items.length - 1]!.id : null,
    };
  }

  static async createMovement({
    organizationId,
    productId,
    actorId,
    data,
  }: CreateMovementInput) {
    const product = await assertProductBelongsToOrg(productId, organizationId);

    const delta = data.type === 'stock_entry' ? Math.abs(data.quantity) : -Math.abs(data.quantity);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.pOSProduct.update({
        where: { id: productId },
        data: { stockQty: { increment: delta } },
      });
      const movement = await tx.stockMovement.create({
        data: {
          posId: product.posId,
          productId,
          type: data.type as StockMovementType,
          quantity: Math.abs(data.quantity),
          operatorId: actorId,
          notes: data.notes,
        },
      });
      return { updated, movement };
    });

    const newQty = result.updated.stockQty ?? 0;
    const threshold = result.updated.lowStockThreshold ?? null;
    const event = product.pos.event;

    if (newQty === 0) {
      await prisma.pOSProduct.update({
        where: { id: productId },
        data: { isAvailable: false },
      });
      await emitStockOut(event.organizationId!, {
        posId: product.posId,
        productId,
        name: product.name,
        stockQty: 0,
        threshold,
      });
    } else if (threshold && newQty <= threshold) {
      await emitStockLow(event.organizationId!, {
        posId: product.posId,
        productId,
        name: product.name,
        stockQty: newQty,
        threshold,
      });
    }

    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_STOCK_MOVEMENT,
      entityType: 'stock_movement',
      entityId: result.movement.id,
      metadata: { type: data.type, quantity: data.quantity, productId, posId: product.posId },
    });

    return result.movement;
  }
}
