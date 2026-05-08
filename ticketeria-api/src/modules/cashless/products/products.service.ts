import crypto from 'crypto';
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { uploadObject, deleteObject } from '../../../shared/storage/r2';
import { processProductImage } from '../../../shared/storage/imageProcessor';
import type { ProductCategoryEnum } from '../../../generated/prisma/client';
import {
  assertPosBelongsToOrg,
  assertProductBelongsToOrg,
  assertEventBelongsToOrg,
} from '../shared/orgScope';
import { emitCatalogUpdated } from '../shared/catalogEvents';

interface CreateInput {
  organizationId: string;
  posId: string;
  actorId: string;
  data: {
    name: string;
    description?: string;
    category: ProductCategoryEnum;
    categoryId?: string;
    priceCents: number;
    stockQty?: number;
    lowStockThreshold?: number;
    isAvailable: boolean;
    sortOrder: number;
  };
}

interface UpdateInput {
  organizationId: string;
  productId: string;
  actorId: string;
  data: Partial<CreateInput['data']>;
}

interface UploadImageInput {
  organizationId: string;
  productId: string;
  actorId: string;
  buffer: Buffer;
}

interface CloneInput {
  organizationId: string;
  posId: string;
  sourcePosId: string;
  actorId: string;
  overwrite: boolean;
}

export class ProductsService {
  static async listByEvent({
    organizationId,
    eventId,
    posId,
    categoryId,
    isAvailable,
  }: {
    organizationId: string;
    eventId: string;
    posId?: string;
    categoryId?: string;
    isAvailable?: boolean;
  }) {
    await assertEventBelongsToOrg(eventId, organizationId);
    return prisma.pOSProduct.findMany({
      where: {
        pos: { eventId },
        isArchived: false,
        ...(posId ? { posId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(isAvailable !== undefined ? { isAvailable } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { productCategory: true },
    });
  }

  static async create({ organizationId, posId, actorId, data }: CreateInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    const product = await prisma.pOSProduct.create({
      data: { posId, ...data },
    });
    await emitCatalogUpdated(posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_PRODUCT_CREATED,
      entityType: 'pos_product',
      entityId: product.id,
      metadata: { posId, name: data.name, priceCents: data.priceCents },
    });
    return product;
  }

  static async update({ organizationId, productId, actorId, data }: UpdateInput) {
    const existing = await assertProductBelongsToOrg(productId, organizationId);
    const updated = await prisma.pOSProduct.update({
      where: { id: productId },
      data,
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_PRODUCT_UPDATED,
      entityType: 'pos_product',
      entityId: productId,
      metadata: data,
    });
    return updated;
  }

  static async archive({
    organizationId,
    productId,
    actorId,
  }: {
    organizationId: string;
    productId: string;
    actorId: string;
  }) {
    const existing = await assertProductBelongsToOrg(productId, organizationId);
    const archived = await prisma.pOSProduct.update({
      where: { id: productId },
      data: { isArchived: true, archivedAt: new Date(), isAvailable: false },
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_PRODUCT_ARCHIVED,
      entityType: 'pos_product',
      entityId: productId,
    });
    return archived;
  }

  static async uploadImage({ organizationId, productId, actorId, buffer }: UploadImageInput) {
    const existing = await assertProductBelongsToOrg(productId, organizationId);
    const processed = await processProductImage(buffer);
    const hash = crypto.createHash('sha256').update(processed.buffer).digest('hex').slice(0, 16);
    const key = `products/${productId}/${hash}.jpg`;
    const imageUrl = await uploadObject(key, processed.buffer, processed.contentType);

    const updated = await prisma.pOSProduct.update({
      where: { id: productId },
      data: { imageUrl },
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_PRODUCT_IMAGE_UPLOADED,
      entityType: 'pos_product',
      entityId: productId,
      metadata: { imageUrl },
    });
    return updated;
  }

  static async deleteImage({
    organizationId,
    productId,
    actorId,
  }: {
    organizationId: string;
    productId: string;
    actorId: string;
  }) {
    const existing = await assertProductBelongsToOrg(productId, organizationId);
    if (existing.imageUrl) {
      const key = existing.imageUrl.split('/').slice(-3).join('/');
      try {
        await deleteObject(key);
      } catch {
        // R2 best-effort; metadata wins
      }
    }
    const updated = await prisma.pOSProduct.update({
      where: { id: productId },
      data: { imageUrl: null },
    });
    await emitCatalogUpdated(existing.posId);
    return updated;
  }

  static async cloneCatalog({
    organizationId,
    posId,
    sourcePosId,
    actorId,
    overwrite,
  }: CloneInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    await assertPosBelongsToOrg(sourcePosId, organizationId);

    const source = await prisma.pOSProduct.findMany({
      where: { posId: sourcePosId, isArchived: false },
    });

    const destExisting = await prisma.pOSProduct.findMany({
      where: { posId, isArchived: false },
      select: { id: true, name: true },
    });
    const destByName = new Map(destExisting.map((p) => [p.name.toLowerCase(), p.id]));

    let created = 0;
    let skipped = 0;
    let overwritten = 0;

    for (const src of source) {
      const existsId = destByName.get(src.name.toLowerCase());
      if (existsId && !overwrite) {
        skipped++;
        continue;
      }
      if (existsId && overwrite) {
        await prisma.pOSProduct.update({
          where: { id: existsId },
          data: {
            description: src.description,
            category: src.category,
            categoryId: src.categoryId,
            priceCents: src.priceCents,
            imageUrl: src.imageUrl,
            sortOrder: src.sortOrder,
            isAvailable: src.isAvailable,
          },
        });
        overwritten++;
      } else {
        await prisma.pOSProduct.create({
          data: {
            posId,
            name: src.name,
            description: src.description,
            category: src.category,
            categoryId: src.categoryId,
            priceCents: src.priceCents,
            imageUrl: src.imageUrl,
            sortOrder: src.sortOrder,
            isAvailable: src.isAvailable,
            stockQty: 0,
            lowStockThreshold: src.lowStockThreshold,
          },
        });
        created++;
      }
    }

    await emitCatalogUpdated(posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_CATALOG_CLONED,
      entityType: 'point_of_sale',
      entityId: posId,
      metadata: { sourcePosId, created, skipped, overwritten },
    });

    return { created, skipped, overwritten };
  }
}
