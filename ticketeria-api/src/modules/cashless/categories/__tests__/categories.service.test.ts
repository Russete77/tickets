import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoriesService } from '../categories.service';

const orgs = new Map<string, { id: string; organizationId: string }>();
orgs.set('event-1', { id: 'event-1', organizationId: 'org-1' });
orgs.set('event-2', { id: 'event-2', organizationId: 'org-2' });

const categories = new Map<string, any>();
const products = new Map<string, any>();

vi.mock('../../../../config/database', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(({ where, select }) => {
        const e = orgs.get(where.id);
        if (!e) return Promise.resolve(null);
        return Promise.resolve(select ? { id: e.id, organizationId: e.organizationId } : e);
      }),
    },
    productCategory: {
      create: vi.fn(({ data }) => {
        const id = `cat-${categories.size + 1}`;
        const c = { id, isActive: true, createdAt: new Date(), ...data };
        categories.set(id, c);
        return Promise.resolve(c);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const c = where.id
          ? categories.get(where.id)
          : Array.from(categories.values()).find(
              (x) => x.eventId === where.eventId_name?.eventId && x.name === where.eventId_name?.name,
            );
        if (!c) return Promise.resolve(null);
        if (include?.event) {
          const e = orgs.get(c.eventId);
          return Promise.resolve({ ...c, event: { organizationId: e?.organizationId } });
        }
        return Promise.resolve(c);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(categories.values())
            .filter((c) => (where?.eventId ? c.eventId === where.eventId : true))
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const c = categories.get(where.id);
        if (!c) throw new Error('Not found');
        const next = { ...c, ...data };
        categories.set(c.id, next);
        return Promise.resolve(next);
      }),
    },
    pOSProduct: {
      count: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(products.values()).filter(
            (p) => p.categoryId === where.categoryId && !p.isArchived,
          ).length,
        ),
      ),
      updateMany: vi.fn(() => Promise.resolve({ count: 0 })),
    },
    $transaction: vi.fn(async (cb) =>
      cb({
        productCategory: {
          update: vi.fn(({ where, data }) => {
            const c = categories.get(where.id);
            if (!c) throw new Error('Not found');
            const next = { ...c, ...data };
            categories.set(c.id, next);
            return Promise.resolve(next);
          }),
        },
      }),
    ),
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_CATEGORY_CREATED: 'cashless.category_created',
    CASHLESS_CATEGORY_UPDATED: 'cashless.category_updated',
    CASHLESS_CATEGORY_DELETED: 'cashless.category_deleted',
  },
}));

describe('CategoriesService', () => {
  beforeEach(() => {
    categories.clear();
    products.clear();
    vi.clearAllMocks();
  });

  it('cria categoria no evento da org', async () => {
    const cat = await CategoriesService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'user-1',
      data: { name: 'Cervejas Premium', sortOrder: 1 },
    });
    expect(cat.name).toBe('Cervejas Premium');
    expect(cat.eventId).toBe('event-1');
  });

  it('rejeita criar quando evento é de outra org', async () => {
    await expect(
      CategoriesService.create({
        organizationId: 'org-1',
        eventId: 'event-2',
        actorId: 'user-1',
        data: { name: 'X' },
      }),
    ).rejects.toThrow(/não encontrad/i);
  });

  it('lista categorias do evento ordenadas por sortOrder', async () => {
    await CategoriesService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'user-1',
      data: { name: 'A', sortOrder: 5 },
    });
    await CategoriesService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'user-1',
      data: { name: 'B', sortOrder: 1 },
    });
    const list = await CategoriesService.list({
      organizationId: 'org-1',
      eventId: 'event-1',
    });
    expect(list.map((c) => c.name)).toEqual(['B', 'A']);
  });

  it('archive rejeita quando há produtos ativos vinculados', async () => {
    const cat = await CategoriesService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'user-1',
      data: { name: 'X' },
    });
    products.set('p1', { id: 'p1', categoryId: cat.id, isArchived: false });

    await expect(
      CategoriesService.archive({
        organizationId: 'org-1',
        categoryId: cat.id,
        actorId: 'user-1',
        force: false,
      }),
    ).rejects.toThrow(/produtos ativos/i);
  });

  it('archive com force=true desvincula produtos antes de arquivar', async () => {
    const cat = await CategoriesService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'user-1',
      data: { name: 'X' },
    });
    products.set('p1', { id: 'p1', categoryId: cat.id, isArchived: false });

    const result = await CategoriesService.archive({
      organizationId: 'org-1',
      categoryId: cat.id,
      actorId: 'user-1',
      force: true,
    });
    expect(result.isActive).toBe(false);
  });
});
