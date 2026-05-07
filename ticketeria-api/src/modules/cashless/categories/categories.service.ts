import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { ConflictError } from '../../../shared/errors';
import {
  assertCategoryBelongsToOrg,
  assertEventBelongsToOrg,
} from '../shared/orgScope';

interface CreateInput {
  organizationId: string;
  eventId: string;
  actorId: string;
  data: { name: string; icon?: string; color?: string; sortOrder?: number };
}

interface UpdateInput {
  organizationId: string;
  categoryId: string;
  actorId: string;
  data: Partial<{ name: string; icon: string; color: string; sortOrder: number; isActive: boolean }>;
}

interface ArchiveInput {
  organizationId: string;
  categoryId: string;
  actorId: string;
  force: boolean;
}

interface ReorderInput {
  organizationId: string;
  eventId: string;
  actorId: string;
  items: { id: string; sortOrder: number }[];
}

export class CategoriesService {
  static async list({ organizationId, eventId }: { organizationId: string; eventId: string }) {
    await assertEventBelongsToOrg(eventId, organizationId);
    return prisma.productCategory.findMany({
      where: { eventId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  static async create({ organizationId, eventId, actorId, data }: CreateInput) {
    await assertEventBelongsToOrg(eventId, organizationId);
    const category = await prisma.productCategory.create({
      data: {
        eventId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_CATEGORY_CREATED,
      entityType: 'product_category',
      entityId: category.id,
      metadata: { eventId, name: data.name },
    });
    return category;
  }

  static async update({ organizationId, categoryId, actorId, data }: UpdateInput) {
    await assertCategoryBelongsToOrg(categoryId, organizationId);
    const updated = await prisma.productCategory.update({
      where: { id: categoryId },
      data,
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_CATEGORY_UPDATED,
      entityType: 'product_category',
      entityId: categoryId,
      metadata: data,
    });
    return updated;
  }

  static async archive({ organizationId, categoryId, actorId, force }: ArchiveInput) {
    await assertCategoryBelongsToOrg(categoryId, organizationId);

    const linked = await prisma.pOSProduct.count({
      where: { categoryId, isArchived: false },
    });

    if (linked > 0 && !force) {
      throw new ConflictError(
        `${linked} produtos ativos estão vinculados a esta categoria. Use force=true pra desvincular.`,
      );
    }

    if (linked > 0 && force) {
      await prisma.pOSProduct.updateMany({
        where: { categoryId, isArchived: false },
        data: { categoryId: null },
      });
    }

    const archived = await prisma.productCategory.update({
      where: { id: categoryId },
      data: { isActive: false },
    });

    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_CATEGORY_DELETED,
      entityType: 'product_category',
      entityId: categoryId,
      metadata: { unlinked: linked, force },
    });
    return archived;
  }

  static async reorder({ organizationId, eventId, actorId, items }: ReorderInput) {
    await assertEventBelongsToOrg(eventId, organizationId);

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.productCategory.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        });
      }
    });

    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_CATEGORY_UPDATED,
      entityType: 'product_category',
      entityId: eventId,
      metadata: { reorder: true, count: items.length },
    });

    return { updated: items.length };
  }
}
