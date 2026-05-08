import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductsService } from '../products.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pos = new Map([
  ['pos-1', { id: 'pos-1', eventId: 'event-1', isArchived: false }],
  ['pos-2', { id: 'pos-2', eventId: 'event-1', isArchived: false }],
]);
const products = new Map<string, any>();

vi.mock('../../../../config/database', () => ({
  prisma: {
    pointOfSale: {
      findUnique: vi.fn(({ where, include }) => {
        const p = pos.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.event) return Promise.resolve({ ...p, event: events.get(p.eventId) });
        return Promise.resolve(p);
      }),
    },
    pOSProduct: {
      create: vi.fn(({ data }) => {
        const id = `prod-${products.size + 1}`;
        const p = { id, isArchived: false, soldQty: 0, createdAt: new Date(), ...data };
        products.set(id, p);
        return Promise.resolve(p);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const p = products.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.pos) {
          const posObj = pos.get(p.posId);
          return Promise.resolve({
            ...p,
            pos: { ...posObj, event: events.get(posObj!.eventId) },
          });
        }
        return Promise.resolve(p);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(products.values()).filter((p) => {
            if (where.posId && p.posId !== where.posId) return false;
            if (where.categoryId && p.categoryId !== where.categoryId) return false;
            if (where.isAvailable !== undefined && p.isAvailable !== where.isAvailable) return false;
            return !p.isArchived;
          }),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const p = products.get(where.id);
        Object.assign(p, data);
        return Promise.resolve(p);
      }),
    },
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_PRODUCT_CREATED: 'cashless.product_created',
    CASHLESS_PRODUCT_UPDATED: 'cashless.product_updated',
    CASHLESS_PRODUCT_ARCHIVED: 'cashless.product_archived',
    CASHLESS_PRODUCT_IMAGE_UPLOADED: 'cashless.product_image_uploaded',
    CASHLESS_CATALOG_CLONED: 'cashless.catalog_cloned',
  },
}));

vi.mock('../../shared/catalogEvents', () => ({
  emitCatalogUpdated: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../shared/storage/r2', () => ({
  uploadObject: vi.fn(() => Promise.resolve('https://r2.test/key.jpg')),
  deleteObject: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../shared/storage/imageProcessor', () => ({
  processProductImage: vi.fn(async (b: Buffer) => ({ buffer: b, contentType: 'image/jpeg' as const })),
}));

import { emitCatalogUpdated } from '../../shared/catalogEvents';

describe('ProductsService', () => {
  beforeEach(() => {
    products.clear();
    vi.clearAllMocks();
  });

  it('cria produto no POS, emite catalog:updated', async () => {
    const p = await ProductsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'Heineken', category: 'beer', priceCents: 1500, isAvailable: true, sortOrder: 0 },
    });
    expect(p.name).toBe('Heineken');
    expect(emitCatalogUpdated).toHaveBeenCalledWith('pos-1');
  });

  it('rejeita criar quando POS é de outra org', async () => {
    pos.set('pos-other', { id: 'pos-other', eventId: 'event-other', isArchived: false });
    events.set('event-other', { id: 'event-other', organizationId: 'org-2' });
    await expect(
      ProductsService.create({
        organizationId: 'org-1',
        posId: 'pos-other',
        actorId: 'u1',
        data: { name: 'X', category: 'beer', priceCents: 100, isAvailable: true, sortOrder: 0 },
      }),
    ).rejects.toThrow(/POS não encontrado/i);
  });

  it('clone copia produtos ativos pulando colisão por nome', async () => {
    await ProductsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'A', category: 'beer', priceCents: 100, stockQty: 50, isAvailable: true, sortOrder: 0 },
    });
    await ProductsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'B', category: 'beer', priceCents: 200, stockQty: 30, isAvailable: true, sortOrder: 1 },
    });

    const result = await ProductsService.cloneCatalog({
      organizationId: 'org-1',
      posId: 'pos-2',
      sourcePosId: 'pos-1',
      actorId: 'u1',
      overwrite: false,
    });

    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);

    const second = await ProductsService.cloneCatalog({
      organizationId: 'org-1',
      posId: 'pos-2',
      sourcePosId: 'pos-1',
      actorId: 'u1',
      overwrite: false,
    });
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(2);
  });

  it('clone reseta stockQty/soldQty no destino', async () => {
    await ProductsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'C', category: 'beer', priceCents: 300, stockQty: 100, isAvailable: true, sortOrder: 0 },
    });
    await ProductsService.cloneCatalog({
      organizationId: 'org-1',
      posId: 'pos-2',
      sourcePosId: 'pos-1',
      actorId: 'u1',
      overwrite: false,
    });
    const cloned = Array.from(products.values()).find((p) => p.posId === 'pos-2' && p.name === 'C');
    expect(cloned?.stockQty).toBe(0);
    expect(cloned?.soldQty).toBe(0);
  });

  it('uploadImage processa, faz upload, atualiza imageUrl', async () => {
    const p = await ProductsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'D', category: 'beer', priceCents: 100, isAvailable: true, sortOrder: 0 },
    });
    const result = await ProductsService.uploadImage({
      organizationId: 'org-1',
      productId: p.id,
      actorId: 'u1',
      buffer: Buffer.from('fake-image-bytes'),
    });
    expect(result.imageUrl).toContain('r2.test');
  });
});
