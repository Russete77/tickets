import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { ConflictError } from '../../../shared/errors';
import type { POSType } from '../../../generated/prisma/client';
import { assertEventBelongsToOrg, assertPosBelongsToOrg } from '../shared/orgScope';

interface CreateInput {
  organizationId: string;
  eventId: string;
  actorId: string;
  data: { name: string; type: POSType; location?: string; isActive: boolean };
}

interface UpdateInput {
  organizationId: string;
  posId: string;
  actorId: string;
  data: Partial<{ name: string; type: POSType; location: string; isActive: boolean }>;
}

interface ArchiveInput {
  organizationId: string;
  posId: string;
  actorId: string;
}

export class PosService {
  static async list({ organizationId, eventId }: { organizationId: string; eventId: string }) {
    await assertEventBelongsToOrg(eventId, organizationId);
    return prisma.pointOfSale.findMany({
      where: { eventId, isArchived: false },
      orderBy: { name: 'asc' },
    });
  }

  static async create({ organizationId, eventId, actorId, data }: CreateInput) {
    await assertEventBelongsToOrg(eventId, organizationId);
    const pos = await prisma.pointOfSale.create({
      data: { eventId, ...data },
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_POS_CREATED,
      entityType: 'point_of_sale',
      entityId: pos.id,
      metadata: { eventId, name: data.name, type: data.type },
    });
    return pos;
  }

  static async update({ organizationId, posId, actorId, data }: UpdateInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    const updated = await prisma.pointOfSale.update({
      where: { id: posId },
      data,
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_POS_UPDATED,
      entityType: 'point_of_sale',
      entityId: posId,
      metadata: data,
    });
    return updated;
  }

  static async archive({ organizationId, posId, actorId }: ArchiveInput) {
    await assertPosBelongsToOrg(posId, organizationId);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTxns = await prisma.cashlessTransaction.count({
      where: { posId, createdAt: { gte: last24h } },
    });
    if (recentTxns > 0) {
      throw new ConflictError(
        `POS tem ${recentTxns} transações recentes (últimas 24h). Aguarde fechamento ou contate suporte.`,
      );
    }

    const archived = await prisma.pointOfSale.update({
      where: { id: posId },
      data: { isArchived: true, archivedAt: new Date(), isActive: false },
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_POS_ARCHIVED,
      entityType: 'point_of_sale',
      entityId: posId,
    });
    return archived;
  }
}
