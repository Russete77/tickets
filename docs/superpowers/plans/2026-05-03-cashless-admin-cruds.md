# Cashless Admin CRUDs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar produtor PulsePass a cadastrar pontos de venda, categorias, produtos (com foto), operadores e movimentações de estoque pelo admin web — fechando o gap mais imediato vs Zig que hoje impede uso real do cashless sem dev.

**Architecture:** Submódulos isolados dentro de `cashless/` (categories/, pos/, products/, operators/, stock/) seguindo padrão de `events/` e `organizations/`. Auth via `requireOrganizationRole` (multi-tenant). Sync com mobile POS via Socket.IO push (`catalog:updated`/`stock:low`/`stock:out`) reusando `publishBroadcast`. Upload de imagem via Cloudflare R2 (`@aws-sdk/client-s3` + `sharp`).

**Tech Stack:** TypeScript 5.5, Express 5, Prisma 7, Zod, Vitest, React 18, TanStack Query, @dnd-kit/core, socket.io-client, Cloudflare R2, bcryptjs, sharp, multer.

**Spec:** `docs/superpowers/specs/2026-05-03-cashless-admin-cruds-design.md`

---

## Pré-requisitos

- Spec aprovado
- `npm install` rodado em `ticketeria-api/`, `ticketeria-web/`, `ticketeria-mobile/` (atualmente OK; types vai precisar)
- Postgres + Redis rodando via `docker compose -f ticketeria-api/docker-compose.dev.yml up`
- `npm run db:generate` já executado pelo menos uma vez no ambiente local

---

## Fase 1 — Schema + migration + backfill

### Task 1: Adicionar deps backend (R2, multer, sharp)

**Files:**
- Modify: `ticketeria-api/package.json`

- [ ] **Step 1: Instalar deps**

```bash
cd ticketeria-api
npm install @aws-sdk/client-s3 multer sharp
npm install -D @types/multer
```

- [ ] **Step 2: Verificar versões instaladas**

Run: `npm ls @aws-sdk/client-s3 multer sharp @types/multer`
Expected: 4 deps listadas sem `UNMET` ou `extraneous`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(api): add @aws-sdk/client-s3, multer, sharp for R2 image upload"
```

### Task 2: Modelo `ProductCategory` + colunas novas no Prisma

**Files:**
- Modify: `ticketeria-api/prisma/schema.prisma`

- [ ] **Step 1: Adicionar `ProductCategory` model**

Localizar o bloco `// ============================================ NEW MODELS - POS / BAR ============================================` (~linha 960) e adicionar acima dele:

```prisma
model ProductCategory {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  eventId   String   @map("event_id") @db.Uuid
  name      String   @db.VarChar(100)
  icon      String?  @db.VarChar(50)
  color     String?  @db.VarChar(7)
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  event    Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  products POSProduct[]

  @@unique([eventId, name])
  @@index([eventId, sortOrder])
  @@map("product_categories")
}
```

- [ ] **Step 2: Adicionar relação inversa em `Event`**

No model `Event` (~linha 396), adicionar à lista de relações:
```prisma
  productCategories  ProductCategory[]
```

- [ ] **Step 3: Modificar `POSProduct`**

No model `POSProduct` (~linha 997-1015), adicionar campos novos antes de `pos PointOfSale`:
```prisma
  categoryId          String?         @map("category_id") @db.Uuid
  lowStockThreshold   Int?            @map("low_stock_threshold")
  isArchived          Boolean         @default(false) @map("is_archived")
  archivedAt          DateTime?       @map("archived_at") @db.Timestamptz
```

E adicionar relação inversa abaixo de `pos PointOfSale @relation(...)`:
```prisma
  productCategory     ProductCategory? @relation(fields: [categoryId], references: [id])
```

(Manter `category ProductCategory @enum` intacto — dual-write até sub-projeto 1.5.)

- [ ] **Step 4: Modificar `POSOperator`**

Localizar model `POSOperator` (~linha 982) e substituir todo o bloco por:
```prisma
model POSOperator {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  posId         String    @map("pos_id") @db.Uuid
  userId        String?   @map("user_id") @db.Uuid
  name          String?   @db.VarChar(255)
  cpf           String?   @db.VarChar(14)
  pin           String    @db.VarChar(6)
  pinHash       String?   @map("pin_hash") @db.VarChar(255)
  isActive      Boolean   @default(true) @map("is_active")
  isArchived    Boolean   @default(false) @map("is_archived")
  archivedAt    DateTime? @map("archived_at") @db.Timestamptz
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz

  pos  PointOfSale @relation(fields: [posId], references: [id], onDelete: Cascade)
  user User?       @relation(fields: [userId], references: [id])

  @@index([posId, isActive])
  @@map("pos_operators")
}
```

(Removido `@@unique([posId, userId])` porque `userId` virou opcional.)

- [ ] **Step 5: Modificar `PointOfSale`**

No model `PointOfSale` (~linha 964), adicionar antes de `event Event`:
```prisma
  isArchived    Boolean   @default(false) @map("is_archived")
  archivedAt    DateTime? @map("archived_at") @db.Timestamptz
```

- [ ] **Step 6: Validar schema**

Run: `cd ticketeria-api && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(api): add ProductCategory + soft-delete + pinHash columns to cashless schema"
```

### Task 3: Gerar migration

**Files:**
- Create: `ticketeria-api/prisma/migrations/<timestamp>_cashless_admin_setup/migration.sql`

- [ ] **Step 1: Criar migration**

```bash
cd ticketeria-api
npx prisma migrate dev --name cashless_admin_setup
```

Expected: arquivo SQL gerado em `prisma/migrations/`, output `Your database is now in sync with your schema`.

- [ ] **Step 2: Inspecionar SQL gerado**

Abrir o arquivo `migration.sql` recém-criado. Confirmar que contém:
- `CREATE TABLE "product_categories"`
- `ALTER TABLE "pos_products" ADD COLUMN "category_id"`, `"low_stock_threshold"`, `"is_archived"`, `"archived_at"`
- `ALTER TABLE "pos_operators" ALTER COLUMN "user_id" DROP NOT NULL`, `ADD COLUMN "name"`, `"cpf"`, `"pin_hash"`, `"is_archived"`, `"archived_at"`
- `DROP INDEX` antigo de `pos_operators_pos_id_user_id_key`
- `ALTER TABLE "points_of_sale" ADD COLUMN "is_archived"`, `"archived_at"`
- Indexes `product_categories_event_id_sort_order_idx` e `pos_operators_pos_id_is_active_idx`

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations/
git commit -m "feat(api): migration for cashless admin setup (ProductCategory + soft-delete)"
```

### Task 4: Backfill script

**Files:**
- Create: `ticketeria-api/scripts/backfill-cashless-admin.ts`

- [ ] **Step 1: Criar script idempotente**

```typescript
/**
 * Backfill — sub-projeto 1 (CRUDs admin do cashless).
 *
 * 1. Pra cada Event que tem POSProducts: cria ProductCategory por enum em uso, popula categoryId.
 * 2. Pra cada POSOperator com `pin` em texto: gera pinHash = bcrypt.hash(pin, 10).
 *
 * Idempotente: rodar quantas vezes quiser.
 *
 * Uso:
 *   npx tsx scripts/backfill-cashless-admin.ts          # dry-run
 *   npx tsx scripts/backfill-cashless-admin.ts --apply  # executa
 */
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';

const APPLY = process.argv.includes('--apply');
const BATCH = 100;

async function backfillCategories() {
  console.log('=== Categorias ===');
  const events = await prisma.event.findMany({
    where: {
      pointsOfSale: { some: { products: { some: {} } } },
    },
    select: { id: true, title: true },
  });

  let created = 0;
  let updated = 0;

  for (const event of events) {
    const productsByEnum = await prisma.pOSProduct.groupBy({
      by: ['category'],
      where: { pos: { eventId: event.id }, categoryId: null },
      _count: true,
    });

    if (productsByEnum.length === 0) continue;

    console.log(
      `Event ${event.title} (${event.id}): ${productsByEnum.length} categorias enum em uso`,
    );

    for (const row of productsByEnum) {
      const name = `Categoria: ${row.category}`;
      let category = await prisma.productCategory.findUnique({
        where: { eventId_name: { eventId: event.id, name } },
      });

      if (!category && APPLY) {
        category = await prisma.productCategory.create({
          data: { eventId: event.id, name, sortOrder: 0 },
        });
        created++;
        console.log(`  + created category "${name}"`);
      } else if (!category) {
        console.log(`  [dry] would create "${name}"`);
        created++;
        continue;
      }

      const update = await prisma.pOSProduct.updateMany({
        where: { pos: { eventId: event.id }, category: row.category, categoryId: null },
        data: { categoryId: category.id },
      });
      if (APPLY) {
        updated += update.count;
        console.log(`  → linked ${update.count} produtos`);
      } else {
        console.log(`  [dry] would link products`);
      }
    }
  }

  console.log(`Categorias: ${created} criadas, ${updated} produtos vinculados.`);
}

async function backfillPinHash() {
  console.log('=== PIN bcrypt ===');
  const total = await prisma.pOSOperator.count({ where: { pinHash: null } });
  console.log(`${total} operadores sem pinHash.`);

  let processed = 0;
  while (processed < total) {
    const ops = await prisma.pOSOperator.findMany({
      where: { pinHash: null },
      take: BATCH,
      select: { id: true, pin: true },
    });
    if (ops.length === 0) break;

    for (const op of ops) {
      const hash = await bcrypt.hash(op.pin, 10);
      if (APPLY) {
        await prisma.pOSOperator.update({
          where: { id: op.id },
          data: { pinHash: hash },
        });
      }
      processed++;
    }
    console.log(`  ${processed}/${total}`);
    if (APPLY) await new Promise((r) => setTimeout(r, 100));
  }
  console.log(APPLY ? `Backfill PIN concluído.` : `[dry] backfill PIN simulado.`);
}

async function main() {
  console.log(APPLY ? '🚀 APPLY mode' : '👀 DRY-RUN mode');
  await backfillCategories();
  await backfillPinHash();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Rodar dry-run**

Run: `cd ticketeria-api && npx tsx scripts/backfill-cashless-admin.ts`
Expected: output `👀 DRY-RUN mode`, listagem de eventos/categorias/operadores que seriam criados, sem mexer no banco.

- [ ] **Step 3: Rodar com `--apply`**

Run: `npx tsx scripts/backfill-cashless-admin.ts --apply`
Expected: `🚀 APPLY mode`, contagens de criação/update, sem erros.

- [ ] **Step 4: Verificar idempotência**

Run novamente: `npx tsx scripts/backfill-cashless-admin.ts --apply`
Expected: zero categorias novas criadas (já existem), zero operadores com `pinHash: null`.

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-cashless-admin.ts
git commit -m "feat(api): backfill script for ProductCategory + pinHash bcrypt"
```

---

## Fase 2 — Shared utilities (backend)

### Task 5: Cliente R2 (S3-compatible)

**Files:**
- Create: `ticketeria-api/src/shared/storage/r2.ts`

- [ ] **Step 1: Implementar singleton**

```typescript
/**
 * Cloudflare R2 client (S3-compatible).
 * Sub-projeto 1 (CRUDs admin) — primeira utilização: imagem de produto cashless.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { logger } from '../logger';

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  const url = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  logger.debug({ key, url }, 'R2 uploaded');
  return url;
}

export async function deleteObject(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );
  logger.debug({ key }, 'R2 deleted');
}
```

- [ ] **Step 2: Confirmar tipos OK**

Run: `cd ticketeria-api && npx tsc --noEmit src/shared/storage/r2.ts`
Expected: 0 erros.

- [ ] **Step 3: Commit**

```bash
git add src/shared/storage/r2.ts
git commit -m "feat(api): R2 client (S3-compatible) singleton"
```

### Task 6: Image processor (sharp)

**Files:**
- Create: `ticketeria-api/src/shared/storage/imageProcessor.ts`

- [ ] **Step 1: Implementar wrapper sharp**

```typescript
import sharp from 'sharp';
import { BadRequestError } from '../errors';

export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/jpeg';
}

/**
 * Resize cover 800x800, JPEG q85, strip EXIF.
 * Lança BadRequestError se input não for imagem válida.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const buffer = await sharp(input)
      .rotate() // respeita EXIF orientation antes de strip
      .resize(800, 800, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    return { buffer, contentType: 'image/jpeg' };
  } catch (err) {
    throw new BadRequestError('Imagem inválida ou corrompida', { cause: String(err) });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/storage/imageProcessor.ts
git commit -m "feat(api): image processor (sharp resize 800x800 q85)"
```

### Task 7: Audit actions novos

**Files:**
- Modify: `ticketeria-api/src/shared/audit.ts`

- [ ] **Step 1: Adicionar 16 ações**

Localizar o bloco `// Cashless` (~linha 105) e adicionar abaixo das ações existentes:

```typescript
  // Cashless admin — Sub-projeto 1 CRUDs (2026-05)
  CASHLESS_CATEGORY_CREATED: 'cashless.category_created',
  CASHLESS_CATEGORY_UPDATED: 'cashless.category_updated',
  CASHLESS_CATEGORY_DELETED: 'cashless.category_deleted',
  CASHLESS_POS_CREATED: 'cashless.pos_created',
  CASHLESS_POS_UPDATED: 'cashless.pos_updated',
  CASHLESS_POS_ARCHIVED: 'cashless.pos_archived',
  CASHLESS_PRODUCT_CREATED: 'cashless.product_created',
  CASHLESS_PRODUCT_UPDATED: 'cashless.product_updated',
  CASHLESS_PRODUCT_ARCHIVED: 'cashless.product_archived',
  CASHLESS_PRODUCT_IMAGE_UPLOADED: 'cashless.product_image_uploaded',
  CASHLESS_CATALOG_CLONED: 'cashless.catalog_cloned',
  CASHLESS_OPERATOR_CREATED: 'cashless.operator_created',
  CASHLESS_OPERATOR_UPDATED: 'cashless.operator_updated',
  CASHLESS_OPERATOR_PIN_RESET: 'cashless.operator_pin_reset',
  CASHLESS_OPERATOR_ARCHIVED: 'cashless.operator_archived',
  CASHLESS_STOCK_MOVEMENT: 'cashless.stock_movement',
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/audit.ts
git commit -m "feat(api): cashless admin audit actions"
```

### Task 8: orgScope helpers

**Files:**
- Create: `ticketeria-api/src/modules/cashless/shared/orgScope.ts`

- [ ] **Step 1: Implementar 4 helpers**

```typescript
/**
 * Anti-IDOR: valida que recurso pertence à org no path.
 * Mismatch retorna NotFoundError (não vaza existência).
 */
import { prisma } from '../../../config/database';
import { NotFoundError } from '../../../shared/errors';

export async function assertPosBelongsToOrg(posId: string, organizationId: string) {
  const pos = await prisma.pointOfSale.findUnique({
    where: { id: posId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!pos || pos.event.organizationId !== organizationId) {
    throw new NotFoundError('POS não encontrado');
  }
  return pos;
}

export async function assertProductBelongsToOrg(productId: string, organizationId: string) {
  const product = await prisma.pOSProduct.findUnique({
    where: { id: productId },
    include: { pos: { include: { event: { select: { organizationId: true } } } } },
  });
  if (!product || product.pos.event.organizationId !== organizationId) {
    throw new NotFoundError('Produto não encontrado');
  }
  return product;
}

export async function assertCategoryBelongsToOrg(categoryId: string, organizationId: string) {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!category || category.event.organizationId !== organizationId) {
    throw new NotFoundError('Categoria não encontrada');
  }
  return category;
}

export async function assertOperatorBelongsToOrg(operatorId: string, organizationId: string) {
  const operator = await prisma.pOSOperator.findUnique({
    where: { id: operatorId },
    include: { pos: { include: { event: { select: { organizationId: true } } } } },
  });
  if (!operator || operator.pos.event.organizationId !== organizationId) {
    throw new NotFoundError('Operador não encontrado');
  }
  return operator;
}

export async function assertEventBelongsToOrg(eventId: string, organizationId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizationId: true },
  });
  if (!event || event.organizationId !== organizationId) {
    throw new NotFoundError('Evento não encontrado');
  }
  return event;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/cashless/shared/orgScope.ts
git commit -m "feat(api): orgScope helpers (anti-IDOR) for cashless admin"
```

### Task 9: catalogEvents (Socket.IO emit wrappers)

**Files:**
- Create: `ticketeria-api/src/modules/cashless/shared/catalogEvents.ts`

- [ ] **Step 1: Implementar wrappers**

```typescript
import { publishBroadcast } from '../../../shared/socketBridge';

export async function emitCatalogUpdated(posId: string): Promise<void> {
  await publishBroadcast(`pos:${posId}`, 'catalog:updated', {
    posId,
    ts: Date.now(),
  });
}

interface StockEventPayload {
  posId: string;
  productId: string;
  name: string;
  stockQty: number;
  threshold: number | null;
}

export async function emitStockLow(
  organizationId: string,
  payload: StockEventPayload,
): Promise<void> {
  await publishBroadcast(`pos:${payload.posId}`, 'stock:low', payload);
  await publishBroadcast(`org:${organizationId}`, 'stock:low', payload);
}

export async function emitStockOut(
  organizationId: string,
  payload: StockEventPayload,
): Promise<void> {
  await publishBroadcast(`pos:${payload.posId}`, 'stock:out', payload);
  await publishBroadcast(`org:${organizationId}`, 'stock:out', payload);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/cashless/shared/catalogEvents.ts
git commit -m "feat(api): Socket.IO emit wrappers for catalog/stock events"
```

---

## Fase 3 — Categorias (TDD)

### Task 10: Validators de categories

**Files:**
- Create: `ticketeria-api/src/modules/cashless/categories/categories.validators.ts`

- [ ] **Step 1: Implementar schemas**

```typescript
import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});

export const orgCategoryParamsSchema = z.object({
  organizationId: z.string().uuid(),
  categoryId: z.string().uuid(),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ).min(1),
});

export const deleteCategoryQuerySchema = z.object({
  force: z.enum(['true', 'false']).optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/cashless/categories/categories.validators.ts
git commit -m "feat(api): categories Zod validators"
```

### Task 11: Test failing — categories.service

**Files:**
- Create: `ticketeria-api/src/modules/cashless/categories/__tests__/categories.service.test.ts`

- [ ] **Step 1: Escrever teste base (espelho de organizations.service.test.ts)**

```typescript
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
      findMany: vi.fn(({ where, orderBy }) =>
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/categories`
Expected: FAIL com "Cannot find module '../categories.service'" ou similar.

### Task 12: Implementar `CategoriesService`

**Files:**
- Create: `ticketeria-api/src/modules/cashless/categories/categories.service.ts`

- [ ] **Step 1: Implementar service**

```typescript
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
```

- [ ] **Step 2: Rodar testes e ver passar**

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/categories`
Expected: 5 testes PASS, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add src/modules/cashless/categories/
git commit -m "feat(api): CategoriesService with TDD coverage (5 tests)"
```

### Task 13: Router de categories

**Files:**
- Create: `ticketeria-api/src/modules/cashless/categories/categories.router.ts`

- [ ] **Step 1: Implementar router**

```typescript
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { CategoriesService } from './categories.service';
import {
  orgEventParamsSchema,
  orgCategoryParamsSchema,
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  deleteCategoryQuerySchema,
} from './categories.validators';

export const categoriesRouter = Router();

categoriesRouter.use(authenticate);

categoriesRouter.get(
  '/:organizationId/events/:eventId/categories',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.list({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.post(
  '/:organizationId/events/:eventId/categories',
  requireOrganizationRole('finance'),
  validate({ params: orgEventParamsSchema, body: createCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.create({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

categoriesRouter.patch(
  '/:organizationId/categories/:categoryId',
  requireOrganizationRole('finance'),
  validate({ params: orgCategoryParamsSchema, body: updateCategorySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.update({
      organizationId: req.params.organizationId,
      categoryId: req.params.categoryId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.delete(
  '/:organizationId/categories/:categoryId',
  requireOrganizationRole('admin'),
  validate({ params: orgCategoryParamsSchema, query: deleteCategoryQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.archive({
      organizationId: req.params.organizationId,
      categoryId: req.params.categoryId,
      actorId: req.user!.userId,
      force: req.query.force === 'true',
    });
    res.json({ success: true, data });
  }),
);

categoriesRouter.patch(
  '/:organizationId/events/:eventId/categories/reorder',
  requireOrganizationRole('finance'),
  validate({ params: orgEventParamsSchema, body: reorderCategoriesSchema }),
  asyncHandler(async (req, res) => {
    const data = await CategoriesService.reorder({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
      actorId: req.user!.userId,
      items: req.body.items,
    });
    res.json({ success: true, data });
  }),
);
```

- [ ] **Step 2: Wire em `cashless.router.ts`**

Adicionar no fim de `ticketeria-api/src/modules/cashless/cashless.router.ts`:
```typescript
import { categoriesRouter } from './categories/categories.router';
router.use('/orgs', categoriesRouter);
```

- [ ] **Step 3: Typecheck**

Run: `cd ticketeria-api && npm run typecheck`
Expected: 0 erros novos (pode haver pre-existing).

- [ ] **Step 4: Commit**

```bash
git add src/modules/cashless/categories/categories.router.ts src/modules/cashless/cashless.router.ts
git commit -m "feat(api): categories router wired in /cashless/orgs/*"
```

---

## Fase 4 — PointOfSale

### Task 14: PoS validators + service + router (estrutura espelhada)

**Files:**
- Create: `ticketeria-api/src/modules/cashless/pos/pos.validators.ts`
- Create: `ticketeria-api/src/modules/cashless/pos/pos.service.ts`
- Create: `ticketeria-api/src/modules/cashless/pos/pos.router.ts`
- Create: `ticketeria-api/src/modules/cashless/pos/__tests__/pos.service.test.ts`

- [ ] **Step 1: Validators**

```typescript
// pos.validators.ts
import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});
export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});

const POS_TYPES = ['bar', 'mobile', 'totem', 'vip_lounge', 'food_truck', 'backstage_pos'] as const;

export const createPosSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: z.enum(POS_TYPES),
  location: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
});

export const updatePosSchema = createPosSchema.partial();
```

- [ ] **Step 2: Test (TDD)**

```typescript
// __tests__/pos.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosService } from '../pos.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pointsOfSale = new Map<string, any>();
const transactions = new Map<string, any>();

vi.mock('../../../../config/database', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(({ where }) => Promise.resolve(events.get(where.id) ?? null)),
    },
    pointOfSale: {
      create: vi.fn(({ data }) => {
        const id = `pos-${pointsOfSale.size + 1}`;
        const p = { id, isArchived: false, createdAt: new Date(), ...data };
        pointsOfSale.set(id, p);
        return Promise.resolve(p);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const p = pointsOfSale.get(where.id);
        if (!p) return Promise.resolve(null);
        if (include?.event) {
          return Promise.resolve({ ...p, event: events.get(p.eventId) });
        }
        return Promise.resolve(p);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(pointsOfSale.values()).filter(
            (p) => p.eventId === where.eventId && !p.isArchived,
          ),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const p = pointsOfSale.get(where.id);
        Object.assign(p, data);
        return Promise.resolve(p);
      }),
    },
    cashlessTransaction: {
      count: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(transactions.values()).filter(
            (t) => t.posId === where.posId && t.createdAt > where.createdAt.gte,
          ).length,
        ),
      ),
    },
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_POS_CREATED: 'cashless.pos_created',
    CASHLESS_POS_UPDATED: 'cashless.pos_updated',
    CASHLESS_POS_ARCHIVED: 'cashless.pos_archived',
  },
}));

describe('PosService', () => {
  beforeEach(() => {
    pointsOfSale.clear();
    transactions.clear();
    vi.clearAllMocks();
  });

  it('cria POS no evento da org', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar Central', type: 'bar', isActive: true },
    });
    expect(pos.name).toBe('Bar Central');
  });

  it('archive bloqueia se há transação <24h', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar X', type: 'bar', isActive: true },
    });
    transactions.set('t1', { posId: pos.id, createdAt: new Date() });

    await expect(
      PosService.archive({ organizationId: 'org-1', posId: pos.id, actorId: 'u1' }),
    ).rejects.toThrow(/transações recentes/i);
  });

  it('archive permite quando não há transação recente', async () => {
    const pos = await PosService.create({
      organizationId: 'org-1',
      eventId: 'event-1',
      actorId: 'u1',
      data: { name: 'Bar Y', type: 'bar', isActive: true },
    });
    const result = await PosService.archive({
      organizationId: 'org-1',
      posId: pos.id,
      actorId: 'u1',
    });
    expect(result.isArchived).toBe(true);
  });
});
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/pos`
Expected: FAIL (service não existe).

- [ ] **Step 3: Service**

```typescript
// pos.service.ts
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { ConflictError } from '../../../shared/errors';
import { POSType } from '../../../generated/prisma/client';
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
        `POS tem ${recentTxns} transações nas últimas 24h. Aguarde fechamento ou contate suporte.`,
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
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/pos`
Expected: 3 PASS.

- [ ] **Step 4: Router**

```typescript
// pos.router.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { PosService } from './pos.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  createPosSchema,
  updatePosSchema,
} from './pos.validators';

export const posRouter = Router();
posRouter.use(authenticate);

posRouter.get(
  '/:organizationId/events/:eventId/pos',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.list({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
    });
    res.json({ success: true, data });
  }),
);

posRouter.post(
  '/:organizationId/events/:eventId/pos',
  requireOrganizationRole('admin'),
  validate({ params: orgEventParamsSchema, body: createPosSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.create({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

posRouter.patch(
  '/:organizationId/pos/:posId',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema, body: updatePosSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.update({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

posRouter.delete(
  '/:organizationId/pos/:posId',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await PosService.archive({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);
```

- [ ] **Step 5: Wire + commit**

Adicionar em `cashless.router.ts`:
```typescript
import { posRouter } from './pos/pos.router';
router.use('/orgs', posRouter);
```

```bash
git add src/modules/cashless/pos/ src/modules/cashless/cashless.router.ts
git commit -m "feat(api): PointOfSale CRUD with archive blocking on recent txns"
```

---

## Fase 5 — Produtos (com upload de imagem e clone)

### Task 15: Validators de products

**Files:**
- Create: `ticketeria-api/src/modules/cashless/products/products.validators.ts`

- [ ] **Step 1: Implementar**

```typescript
import { z } from 'zod';

const PRODUCT_CATEGORIES = [
  'beer', 'drink', 'cocktail', 'soft_drink', 'water',
  'food', 'snack', 'merch', 'service', 'other',
] as const;

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});
export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});
export const orgProductParamsSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
});
export const cloneFromParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
  sourcePosId: z.string().uuid(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().max(500).optional(),
  category: z.enum(PRODUCT_CATEGORIES).default('other'),
  categoryId: z.string().uuid().optional(),
  priceCents: z.number().int().min(0),
  stockQty: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  posId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isAvailable: z.enum(['true', 'false']).optional(),
});

export const cloneCatalogQuerySchema = z.object({
  overwrite: z.enum(['true', 'false']).optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/cashless/products/products.validators.ts
git commit -m "feat(api): products Zod validators"
```

### Task 16: Test failing — products.service (TDD)

**Files:**
- Create: `ticketeria-api/src/modules/cashless/products/__tests__/products.service.test.ts`

- [ ] **Step 1: Suite básica**

```typescript
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

vi.mock('../shared/catalogEvents', () => ({
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

    // Re-clone: tudo skipped
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
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/products`
Expected: FAIL.

### Task 17: Implementar `ProductsService`

**Files:**
- Create: `ticketeria-api/src/modules/cashless/products/products.service.ts`

- [ ] **Step 1: Service**

```typescript
import crypto from 'crypto';
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { uploadObject, deleteObject } from '../../../shared/storage/r2';
import { processProductImage } from '../../../shared/storage/imageProcessor';
import { ProductCategory } from '../../../generated/prisma/client';
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
    category: ProductCategory;
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
      const key = existing.imageUrl.split('/').slice(-3).join('/'); // products/<id>/<hash>.jpg
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
```

- [ ] **Step 2: Rodar testes**

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/products`
Expected: 5 PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/cashless/products/
git commit -m "feat(api): ProductsService (CRUD + image upload + catalog clone)"
```

### Task 18: Router de products (com multer pra upload)

**Files:**
- Create: `ticketeria-api/src/modules/cashless/products/products.router.ts`

- [ ] **Step 1: Implementar**

```typescript
import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { BadRequestError } from '../../../shared/errors';
import { ProductsService } from './products.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  orgProductParamsSchema,
  cloneFromParamsSchema,
  createProductSchema,
  updateProductSchema,
  productListQuerySchema,
  cloneCatalogQuerySchema,
} from './products.validators';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(new BadRequestError('Tipo de imagem não suportado. Use JPEG, PNG ou WebP.'));
      return;
    }
    cb(null, true);
  },
});

export const productsRouter = Router();
productsRouter.use(authenticate);

productsRouter.get(
  '/:organizationId/events/:eventId/products',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema, query: productListQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.listByEvent({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
      posId: req.query.posId as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
      isAvailable: req.query.isAvailable === undefined ? undefined : req.query.isAvailable === 'true',
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/pos/:posId/products',
  requireOrganizationRole('finance'),
  validate({ params: orgPosParamsSchema, body: createProductSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.create({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

productsRouter.patch(
  '/:organizationId/products/:productId',
  requireOrganizationRole('finance'),
  validate({ params: orgProductParamsSchema, body: updateProductSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.update({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.delete(
  '/:organizationId/products/:productId',
  requireOrganizationRole('admin'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.archive({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/products/:productId/image',
  requireOrganizationRole('finance'),
  upload.single('image'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer) throw new BadRequestError('Arquivo "image" é obrigatório (multipart)');
    const data = await ProductsService.uploadImage({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      actorId: req.user!.userId,
      buffer: req.file.buffer,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.delete(
  '/:organizationId/products/:productId/image',
  requireOrganizationRole('finance'),
  validate({ params: orgProductParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.deleteImage({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);

productsRouter.post(
  '/:organizationId/pos/:posId/products/clone-from/:sourcePosId',
  requireOrganizationRole('admin'),
  validate({ params: cloneFromParamsSchema, query: cloneCatalogQuerySchema }),
  asyncHandler(async (req, res) => {
    const data = await ProductsService.cloneCatalog({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
      sourcePosId: req.params.sourcePosId,
      actorId: req.user!.userId,
      overwrite: req.query.overwrite === 'true',
    });
    res.json({ success: true, data });
  }),
);
```

- [ ] **Step 2: Wire em cashless.router.ts**

Adicionar:
```typescript
import { productsRouter } from './products/products.router';
router.use('/orgs', productsRouter);
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/cashless/products/products.router.ts src/modules/cashless/cashless.router.ts
git commit -m "feat(api): products router with multipart image upload"
```

---

## Fase 6 — Operadores

### Task 19: Validators + Test (TDD) + Service + Router

**Files:**
- Create: `ticketeria-api/src/modules/cashless/operators/operators.validators.ts`
- Create: `ticketeria-api/src/modules/cashless/operators/__tests__/operators.service.test.ts`
- Create: `ticketeria-api/src/modules/cashless/operators/operators.service.ts`
- Create: `ticketeria-api/src/modules/cashless/operators/operators.router.ts`

- [ ] **Step 1: Validators**

```typescript
// operators.validators.ts
import { z } from 'zod';

export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});
export const orgOperatorParamsSchema = z.object({
  organizationId: z.string().uuid(),
  operatorId: z.string().uuid(),
});

const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN deve ter 4 a 6 dígitos');

export const createOperatorSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/).optional(),
    userId: z.string().uuid().optional(),
    pin: pinSchema,
    isActive: z.boolean().default(true),
  })
  .refine((d) => d.name || d.userId, {
    message: 'Forneça name ou userId',
    path: ['name'],
  });

export const updateOperatorSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  cpf: z.string().regex(/^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/).optional(),
  isActive: z.boolean().optional(),
});

export const resetPinSchema = z.object({
  newPin: pinSchema,
});
```

- [ ] **Step 2: Test (TDD)**

```typescript
// __tests__/operators.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { OperatorsService } from '../operators.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'event-1' }]]);
const ops = new Map<string, any>();

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
    pOSOperator: {
      create: vi.fn(({ data }) => {
        const id = `op-${ops.size + 1}`;
        const o = { id, isArchived: false, isActive: true, createdAt: new Date(), ...data };
        ops.set(id, o);
        return Promise.resolve(o);
      }),
      findUnique: vi.fn(({ where, include }) => {
        const o = ops.get(where.id);
        if (!o) return Promise.resolve(null);
        if (include?.pos) {
          const posObj = pos.get(o.posId);
          return Promise.resolve({
            ...o,
            pos: { ...posObj, event: events.get(posObj!.eventId) },
          });
        }
        return Promise.resolve(o);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(
          Array.from(ops.values()).filter(
            (o) => o.posId === where.posId && (where.isArchived === false ? !o.isArchived : true),
          ),
        ),
      ),
      update: vi.fn(({ where, data }) => {
        const o = ops.get(where.id);
        Object.assign(o, data);
        return Promise.resolve(o);
      }),
    },
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: {
    CASHLESS_OPERATOR_CREATED: 'cashless.operator_created',
    CASHLESS_OPERATOR_UPDATED: 'cashless.operator_updated',
    CASHLESS_OPERATOR_PIN_RESET: 'cashless.operator_pin_reset',
    CASHLESS_OPERATOR_ARCHIVED: 'cashless.operator_archived',
  },
}));

vi.mock('../shared/catalogEvents', () => ({
  emitCatalogUpdated: vi.fn(() => Promise.resolve()),
}));

describe('OperatorsService', () => {
  beforeEach(() => {
    ops.clear();
    vi.clearAllMocks();
  });

  it('cria operador leve com nome + bcrypt PIN', async () => {
    const op = await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'João Bartender', pin: '1234', isActive: true },
    });
    expect(op.name).toBe('João Bartender');
    expect(op.pinHash).not.toBe('1234');
    expect(await bcrypt.compare('1234', op.pinHash!)).toBe(true);
  });

  it('rejeita PIN duplicado dentro do mesmo POS', async () => {
    await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'A', pin: '1234', isActive: true },
    });
    await expect(
      OperatorsService.create({
        organizationId: 'org-1',
        posId: 'pos-1',
        actorId: 'u1',
        data: { name: 'B', pin: '1234', isActive: true },
      }),
    ).rejects.toThrow(/PIN/i);
  });

  it('reset-pin troca pinHash, mantém demais campos', async () => {
    const op = await OperatorsService.create({
      organizationId: 'org-1',
      posId: 'pos-1',
      actorId: 'u1',
      data: { name: 'C', pin: '1111', isActive: true },
    });
    const updated = await OperatorsService.resetPin({
      organizationId: 'org-1',
      operatorId: op.id,
      actorId: 'u1',
      newPin: '9999',
    });
    expect(await bcrypt.compare('9999', updated.pinHash!)).toBe(true);
    expect(await bcrypt.compare('1111', updated.pinHash!)).toBe(false);
  });
});
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/operators`
Expected: FAIL.

- [ ] **Step 3: Service**

```typescript
// operators.service.ts
import bcrypt from 'bcryptjs';
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import { ConflictError } from '../../../shared/errors';
import { assertPosBelongsToOrg, assertOperatorBelongsToOrg } from '../shared/orgScope';
import { emitCatalogUpdated } from '../shared/catalogEvents';

interface CreateInput {
  organizationId: string;
  posId: string;
  actorId: string;
  data: { name?: string; cpf?: string; userId?: string; pin: string; isActive: boolean };
}

interface UpdateInput {
  organizationId: string;
  operatorId: string;
  actorId: string;
  data: Partial<{ name: string; cpf: string; isActive: boolean }>;
}

interface ResetPinInput {
  organizationId: string;
  operatorId: string;
  actorId: string;
  newPin: string;
}

const BCRYPT_ROUNDS = 10;

async function assertPinUniqueInPos(posId: string, pin: string, ignoreOperatorId?: string) {
  const ops = await prisma.pOSOperator.findMany({
    where: { posId, isArchived: false },
  });
  for (const op of ops) {
    if (ignoreOperatorId && op.id === ignoreOperatorId) continue;
    if (op.pinHash && (await bcrypt.compare(pin, op.pinHash))) {
      throw new ConflictError('PIN já usado por outro operador neste POS');
    }
  }
}

export class OperatorsService {
  static async list({ organizationId, posId }: { organizationId: string; posId: string }) {
    await assertPosBelongsToOrg(posId, organizationId);
    return prisma.pOSOperator.findMany({
      where: { posId, isArchived: false },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, posId: true, userId: true, name: true, cpf: true,
        isActive: true, isArchived: true, createdAt: true,
        // pin/pinHash NUNCA retornados
      },
    });
  }

  static async create({ organizationId, posId, actorId, data }: CreateInput) {
    await assertPosBelongsToOrg(posId, organizationId);
    await assertPinUniqueInPos(posId, data.pin);

    const pinHash = await bcrypt.hash(data.pin, BCRYPT_ROUNDS);
    const op = await prisma.pOSOperator.create({
      data: {
        posId,
        userId: data.userId,
        name: data.name,
        cpf: data.cpf,
        pin: data.pin.padEnd(6, '0').slice(0, 6), // mantém coluna legacy preenchida (constraint NOT NULL)
        pinHash,
        isActive: data.isActive,
      },
    });
    await emitCatalogUpdated(posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_CREATED,
      entityType: 'pos_operator',
      entityId: op.id,
      metadata: { posId, name: data.name, hasUserId: !!data.userId },
    });
    return op;
  }

  static async update({ organizationId, operatorId, actorId, data }: UpdateInput) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    const updated = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data,
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_UPDATED,
      entityType: 'pos_operator',
      entityId: operatorId,
      metadata: data,
    });
    return updated;
  }

  static async resetPin({ organizationId, operatorId, actorId, newPin }: ResetPinInput) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    await assertPinUniqueInPos(existing.posId, newPin, operatorId);

    const pinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);
    const updated = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data: { pinHash, pin: newPin.padEnd(6, '0').slice(0, 6) },
    });
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_PIN_RESET,
      entityType: 'pos_operator',
      entityId: operatorId,
    });
    return updated;
  }

  static async archive({
    organizationId,
    operatorId,
    actorId,
  }: {
    organizationId: string;
    operatorId: string;
    actorId: string;
  }) {
    const existing = await assertOperatorBelongsToOrg(operatorId, organizationId);
    const archived = await prisma.pOSOperator.update({
      where: { id: operatorId },
      data: { isArchived: true, archivedAt: new Date(), isActive: false },
    });
    await emitCatalogUpdated(existing.posId);
    await logAudit({
      actorId,
      action: AuditActions.CASHLESS_OPERATOR_ARCHIVED,
      entityType: 'pos_operator',
      entityId: operatorId,
    });
    return archived;
  }
}
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/operators`
Expected: 3 PASS.

- [ ] **Step 4: Router**

```typescript
// operators.router.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { OperatorsService } from './operators.service';
import {
  orgPosParamsSchema,
  orgOperatorParamsSchema,
  createOperatorSchema,
  updateOperatorSchema,
  resetPinSchema,
} from './operators.validators';

export const operatorsRouter = Router();
operatorsRouter.use(authenticate);

operatorsRouter.get(
  '/:organizationId/pos/:posId/operators',
  requireOrganizationRole('viewer'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.list({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.post(
  '/:organizationId/pos/:posId/operators',
  requireOrganizationRole('admin'),
  validate({ params: orgPosParamsSchema, body: createOperatorSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.create({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);

operatorsRouter.patch(
  '/:organizationId/operators/:operatorId',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema, body: updateOperatorSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.update({
      organizationId: req.params.organizationId,
      operatorId: req.params.operatorId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.patch(
  '/:organizationId/operators/:operatorId/reset-pin',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema, body: resetPinSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.resetPin({
      organizationId: req.params.organizationId,
      operatorId: req.params.operatorId,
      actorId: req.user!.userId,
      newPin: req.body.newPin,
    });
    res.json({ success: true, data });
  }),
);

operatorsRouter.delete(
  '/:organizationId/operators/:operatorId',
  requireOrganizationRole('admin'),
  validate({ params: orgOperatorParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await OperatorsService.archive({
      organizationId: req.params.organizationId,
      operatorId: req.params.operatorId,
      actorId: req.user!.userId,
    });
    res.json({ success: true, data });
  }),
);
```

- [ ] **Step 5: Refatorar `cashless.router.ts` operator/login pra bcrypt-only**

Localizar o handler `POST /pos/:posId/operator/login` em `cashless.router.ts` (~linha 340) e substituir por:
```typescript
router.post('/pos/:posId/operator/login', authenticate, asyncHandler(async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin) {
    res.status(400).json({ success: false, error: { code: 'PIN_REQUIRED', message: 'PIN é obrigatório' } });
    return;
  }
  const operators = await prismaPos.pOSOperator.findMany({
    where: { posId: String(req.params.posId), isActive: true, isArchived: false, pinHash: { not: null } },
  });
  for (const op of operators) {
    if (op.pinHash && await bcryptPos.compare(pin, op.pinHash)) {
      res.json({ success: true, data: { valid: true, operatorId: op.id, name: op.name } });
      return;
    }
  }
  res.status(401).json({ success: false, error: { code: 'INVALID_PIN', message: 'PIN inválido' } });
}));
```

- [ ] **Step 6: Wire + commit**

Adicionar em `cashless.router.ts`:
```typescript
import { operatorsRouter } from './operators/operators.router';
router.use('/orgs', operatorsRouter);
```

```bash
git add src/modules/cashless/operators/ src/modules/cashless/cashless.router.ts
git commit -m "feat(api): operators CRUD + bcrypt-only login (fix legacy pin bug)"
```

---

## Fase 7 — Estoque

### Task 20: Validators + Test (TDD) + Service + Router

**Files:**
- Create: `ticketeria-api/src/modules/cashless/stock/stock.validators.ts`
- Create: `ticketeria-api/src/modules/cashless/stock/__tests__/stock.service.test.ts`
- Create: `ticketeria-api/src/modules/cashless/stock/stock.service.ts`
- Create: `ticketeria-api/src/modules/cashless/stock/stock.router.ts`

- [ ] **Step 1: Validators**

```typescript
// stock.validators.ts
import { z } from 'zod';

export const orgEventParamsSchema = z.object({
  organizationId: z.string().uuid(),
  eventId: z.string().uuid(),
});
export const orgPosParamsSchema = z.object({
  organizationId: z.string().uuid(),
  posId: z.string().uuid(),
});
export const orgProductParamsSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
});

export const createStockMovementSchema = z.object({
  type: z.enum(['stock_entry', 'adjustment', 'loss']),
  quantity: z.number().int().refine((n) => n !== 0, 'quantity != 0'),
  notes: z.string().max(500).optional(),
});

export const movementsQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
```

- [ ] **Step 2: Test (TDD)**

```typescript
// __tests__/stock.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StockService } from '../stock.service';

const events = new Map([['event-1', { id: 'event-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'event-1' }]]);
const products = new Map<string, any>([
  ['prod-1', {
    id: 'prod-1', posId: 'pos-1', name: 'X', stockQty: 50,
    lowStockThreshold: 10, isAvailable: true, isArchived: false,
  }],
]);
const movements: any[] = [];

vi.mock('../../../../config/database', () => ({
  prisma: {
    pOSProduct: {
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
      update: vi.fn(({ where, data }) => {
        const p = products.get(where.id);
        if (data.stockQty?.increment !== undefined) p.stockQty += data.stockQty.increment;
        else if (data.stockQty?.decrement !== undefined) p.stockQty -= data.stockQty.decrement;
        else Object.assign(p, data);
        return Promise.resolve(p);
      }),
      findMany: vi.fn(() => Promise.resolve(Array.from(products.values()))),
    },
    stockMovement: {
      create: vi.fn(({ data }) => {
        const m = { id: `m-${movements.length + 1}`, createdAt: new Date(), ...data };
        movements.push(m);
        return Promise.resolve(m);
      }),
      findMany: vi.fn(({ where }) =>
        Promise.resolve(movements.filter((m) => m.productId === where.productId)),
      ),
    },
    $transaction: vi.fn(async (cb) =>
      cb({
        pOSProduct: {
          update: vi.fn(({ where, data }) => {
            const p = products.get(where.id);
            if (data.stockQty?.increment !== undefined) p.stockQty += data.stockQty.increment;
            else Object.assign(p, data);
            return Promise.resolve(p);
          }),
        },
        stockMovement: {
          create: vi.fn(({ data }) => {
            const m = { id: `m-${movements.length + 1}`, createdAt: new Date(), ...data };
            movements.push(m);
            return Promise.resolve(m);
          }),
        },
      }),
    ),
  },
}));

vi.mock('../../../../shared/audit', () => ({
  logAudit: vi.fn(() => Promise.resolve()),
  AuditActions: { CASHLESS_STOCK_MOVEMENT: 'cashless.stock_movement' },
}));

vi.mock('../shared/catalogEvents', () => ({
  emitCatalogUpdated: vi.fn(() => Promise.resolve()),
  emitStockLow: vi.fn(() => Promise.resolve()),
  emitStockOut: vi.fn(() => Promise.resolve()),
}));

import { emitStockLow, emitStockOut } from '../../shared/catalogEvents';

describe('StockService', () => {
  beforeEach(() => {
    products.set('prod-1', {
      id: 'prod-1', posId: 'pos-1', name: 'X', stockQty: 50,
      lowStockThreshold: 10, isAvailable: true, isArchived: false,
    });
    movements.length = 0;
    vi.clearAllMocks();
  });

  it('entry incrementa stockQty', async () => {
    const m = await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'stock_entry', quantity: 20 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(70);
    expect(m.quantity).toBe(20);
  });

  it('loss decrementa stockQty', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'loss', quantity: 5 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(45);
  });

  it('emit stock:low quando passa threshold', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'adjustment', quantity: -45 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(5);
    expect(emitStockLow).toHaveBeenCalled();
  });

  it('emit stock:out + auto-disable quando chega a 0', async () => {
    await StockService.createMovement({
      organizationId: 'org-1', productId: 'prod-1', actorId: 'u1',
      data: { type: 'adjustment', quantity: -50 },
    });
    expect(products.get('prod-1')!.stockQty).toBe(0);
    expect(emitStockOut).toHaveBeenCalled();
  });
});
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/stock`
Expected: FAIL.

- [ ] **Step 3: Service**

```typescript
// stock.service.ts
import { prisma } from '../../../config/database';
import { logAudit, AuditActions } from '../../../shared/audit';
import {
  assertProductBelongsToOrg,
  assertPosBelongsToOrg,
  assertEventBelongsToOrg,
} from '../shared/orgScope';
import { emitStockLow, emitStockOut } from '../shared/catalogEvents';
import { StockMovementType } from '../../../generated/prisma/client';

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
```

Run: `cd ticketeria-api && npx vitest run src/modules/cashless/stock`
Expected: 4 PASS.

- [ ] **Step 4: Router**

```typescript
// stock.router.ts
import { Router } from 'express';
import { authenticate } from '../../../middleware/auth';
import { requireOrganizationRole } from '../../../middleware/organization';
import { validate } from '../../../middleware/validate';
import { asyncHandler } from '../../../shared/asyncHandler';
import { StockService } from './stock.service';
import {
  orgEventParamsSchema,
  orgPosParamsSchema,
  orgProductParamsSchema,
  createStockMovementSchema,
  movementsQuerySchema,
} from './stock.validators';

export const stockRouter = Router();
stockRouter.use(authenticate);

stockRouter.get(
  '/:organizationId/events/:eventId/stock',
  requireOrganizationRole('viewer'),
  validate({ params: orgEventParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.stockOverviewByEvent({
      organizationId: req.params.organizationId,
      eventId: req.params.eventId,
    });
    res.json({ success: true, data });
  }),
);

stockRouter.get(
  '/:organizationId/pos/:posId/stock',
  requireOrganizationRole('viewer'),
  validate({ params: orgPosParamsSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.stockOverviewByPos({
      organizationId: req.params.organizationId,
      posId: req.params.posId,
    });
    res.json({ success: true, data });
  }),
);

stockRouter.get(
  '/:organizationId/products/:productId/stock-movements',
  requireOrganizationRole('viewer'),
  validate({ params: orgProductParamsSchema, query: movementsQuerySchema }),
  asyncHandler(async (req, res) => {
    const result = await StockService.listMovements({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      cursor: req.query.cursor as string | undefined,
      limit: Number(req.query.limit ?? 50),
    });
    res.json({ success: true, data: result.items, meta: { nextCursor: result.nextCursor } });
  }),
);

stockRouter.post(
  '/:organizationId/products/:productId/stock-movements',
  requireOrganizationRole('operator'),
  validate({ params: orgProductParamsSchema, body: createStockMovementSchema }),
  asyncHandler(async (req, res) => {
    const data = await StockService.createMovement({
      organizationId: req.params.organizationId,
      productId: req.params.productId,
      actorId: req.user!.userId,
      data: req.body,
    });
    res.status(201).json({ success: true, data });
  }),
);
```

- [ ] **Step 5: Wire + commit**

Adicionar em `cashless.router.ts`:
```typescript
import { stockRouter } from './stock/stock.router';
router.use('/orgs', stockRouter);
```

```bash
git add src/modules/cashless/stock/ src/modules/cashless/cashless.router.ts
git commit -m "feat(api): stock movements CRUD + low/out events"
```

### Task 21: Mudança em `transaction.service.ts` pra emitir stock events em vendas

**Files:**
- Modify: `ticketeria-api/src/modules/cashless/transaction.service.ts`

- [ ] **Step 1: Localizar onde StockMovement de tipo `sale` é criado e adicionar emit**

Após o `prisma.stockMovement.create({ ..., type: 'sale' })` (use Grep pra achar), adicionar:

```typescript
// Auto-disable + emit eventos quando estoque chega a zero ou cruza threshold
if (product.stockQty != null) {
  const newQty = product.stockQty - quantitySold;
  const threshold = product.lowStockThreshold ?? null;
  if (newQty <= 0) {
    await tx.pOSProduct.update({
      where: { id: product.id },
      data: { isAvailable: false },
    });
    // emit fora da transação (após commit)
    process.nextTick(() => {
      void import('./shared/catalogEvents').then(({ emitStockOut }) =>
        emitStockOut(organizationId, {
          posId: product.posId, productId: product.id,
          name: product.name, stockQty: 0, threshold,
        }),
      );
    });
  } else if (threshold && newQty <= threshold) {
    process.nextTick(() => {
      void import('./shared/catalogEvents').then(({ emitStockLow }) =>
        emitStockLow(organizationId, {
          posId: product.posId, productId: product.id,
          name: product.name, stockQty: newQty, threshold,
        }),
      );
    });
  }
}
```

> Se a estrutura atual do `transaction.service.ts` não permitir esse hook limpo (ex: o service não tem acesso a `organizationId`), o ajuste é: lookup do `event.organizationId` via `product.pos.event` no findUnique antes da transaction. Tomar essa decisão local na implementação — não bloqueia o resto.

- [ ] **Step 2: Run unit tests existentes**

Run: `cd ticketeria-api && npx vitest run src/modules/cashless`
Expected: 0 falhas novas.

- [ ] **Step 3: Commit**

```bash
git add src/modules/cashless/transaction.service.ts
git commit -m "feat(api): emit stock:low/stock:out from transaction sale flow"
```

---

## Fase 8 — Socket.IO server-side handlers

### Task 22: Handlers `pos:join` e `org:join`

**Files:**
- Modify: `ticketeria-api/src/server.ts`

- [ ] **Step 1: Localizar `io.on('connection', ...)` e adicionar handlers**

Procurar por `io.on('connection'` (Grep). Dentro do callback de connection, adicionar:

```typescript
// Cashless admin (sub-projeto 1) — rooms para sync de catálogo e estoque
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

socket.on('pos:join', ({ posId }: { posId?: string }) => {
  if (typeof posId === 'string' && UUID_REGEX.test(posId)) {
    socket.join(`pos:${posId}`);
    logger.debug({ socketId: socket.id, posId }, 'socket joined pos room');
  }
});

socket.on('org:join', ({ organizationId }: { organizationId?: string }) => {
  if (typeof organizationId === 'string' && UUID_REGEX.test(organizationId)) {
    socket.join(`org:${organizationId}`);
    logger.debug({ socketId: socket.id, organizationId }, 'socket joined org room');
  }
});
```

- [ ] **Step 2: Confirmar typecheck**

Run: `cd ticketeria-api && npm run typecheck`
Expected: 0 erros novos.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "feat(api): Socket.IO pos:join and org:join handlers"
```

---

## Fase 9 — Teste de integração end-to-end

### Task 23: Teste de fluxo completo

**Files:**
- Create: `ticketeria-api/src/tests/integration/cashless-admin-flow.test.ts`

- [ ] **Step 1: Implementar fluxo**

Espelhar a estrutura de `tests/integration/orders.integration.test.ts` (consultar pra ver como o setup é feito). O teste deve:

1. Criar org + event + user owner
2. POST `/cashless/orgs/:orgId/events/:eventId/pos` → cria POS
3. POST `/cashless/orgs/:orgId/events/:eventId/categories` → cria categoria "Cervejas"
4. POST `/cashless/orgs/:orgId/pos/:posId/products` → cria produto vinculado à categoria, com `lowStockThreshold: 10`
5. POST `/cashless/orgs/:orgId/products/:prodId/stock-movements` → entry +50 → stockQty=50
6. POST `/cashless/orgs/:orgId/pos/:posId/operators` → cria operador
7. POST `/cashless/pos/:posId/operator/login` com PIN correto → 200
8. Decrementar manualmente até cruzar threshold via adjustment → verificar `emitStockLow` chamado
9. Decrementar até 0 → verificar `emitStockOut` chamado e produto auto-disabled

Mock de `publishBroadcast` pra capturar emits sem precisar de Redis.

- [ ] **Step 2: Rodar**

Run: `cd ticketeria-api && npm run test:integration -- cashless-admin-flow`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tests/integration/cashless-admin-flow.test.ts
git commit -m "test(api): integration flow for cashless admin (POS→category→product→stock→operator→login)"
```

---

## Fase 10 — Frontend web (telas admin)

### Task 24: Dep `@dnd-kit/core`

**Files:**
- Modify: `ticketeria-web/package.json`

- [ ] **Step 1: Instalar**

```bash
cd ticketeria-web
npm install @dnd-kit/core @dnd-kit/sortable
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(web): add @dnd-kit/core for category drag-and-drop"
```

### Task 25: AdminCashlessHubPage (hub navegacional)

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/AdminCashlessHubPage.tsx`

- [ ] **Step 1: Implementar (espelho de AdminOrganizationPage estrutura simples)**

```tsx
import React from 'react';
import { Link, useParams } from 'react-router-dom';

const AdminCashlessHubPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const base = `/admin/orgs/${organizationId}/events/${eventId}/cashless`;

  const cards = [
    { title: 'Pontos de Venda', desc: 'Bares, totens, mobile, food trucks', to: `${base}/pos`, icon: '🏪' },
    { title: 'Categorias', desc: 'Agrupar produtos no cardápio', to: `${base}/categories`, icon: '📂' },
    { title: 'Produtos', desc: 'Cardápio do bar com fotos e preços', to: `${base}/products`, icon: '🍺' },
    { title: 'Operadores', desc: 'Bartenders e PIN de acesso', to: `${base}/operators`, icon: '👤' },
    { title: 'Estoque', desc: 'Entrada, ajuste, perda', to: `${base}/stock`, icon: '📦' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <h1>Cashless — Configuração</h1>
      <p style={{ color: '#666' }}>Configure ponto de venda, cardápio e operadores antes do evento começar.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 24 }}>
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            style={{
              display: 'block', padding: 20, border: '1px solid #e2e2e2',
              borderRadius: 12, textDecoration: 'none', color: 'inherit',
              transition: 'transform 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{ fontSize: 32 }}>{c.icon}</div>
            <h3 style={{ margin: '12px 0 4px' }}>{c.title}</h3>
            <p style={{ margin: 0, fontSize: 14, color: '#666' }}>{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminCashlessHubPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/cashless/AdminCashlessHubPage.tsx
git commit -m "feat(web): AdminCashlessHubPage navigation hub"
```

### Task 26: AdminPosPage

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/pos/AdminPosPage.tsx`

- [ ] **Step 1: Implementar (espelhando AdminBrandingPage shape)**

```tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@shared/ui/Button/Button';
import { Input } from '@shared/ui/Input/Input';
import { Spinner } from '@shared/ui/Spinner/Spinner';
import { useToastStore } from '@shared/stores/toastStore';

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

interface Pos {
  id: string;
  name: string;
  type: string;
  location?: string;
  isActive: boolean;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth.accessToken');
  const res = await fetch(`${API}/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}

const POS_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'mobile', label: 'Móvel' },
  { value: 'totem', label: 'Totem' },
  { value: 'vip_lounge', label: 'VIP Lounge' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'backstage_pos', label: 'Backstage' },
];

const AdminPosPage: React.FC = () => {
  const { organizationId = '', eventId = '' } = useParams<{ organizationId: string; eventId: string }>();
  const qc = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'bar', location: '', isActive: true });

  const queryKey = ['cashless', organizationId, eventId, 'pos'];
  const { data: list, isLoading } = useQuery({
    queryKey,
    queryFn: () => api<Pos[]>(`/cashless/orgs/${organizationId}/events/${eventId}/pos`),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) =>
      api(`/cashless/orgs/${organizationId}/events/${eventId}/pos`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'POS criado' });
      setShowForm(false);
      setForm({ name: '', type: 'bar', location: '', isActive: true });
      qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  const archiveMut = useMutation({
    mutationFn: (posId: string) =>
      api(`/cashless/orgs/${organizationId}/pos/${posId}`, { method: 'DELETE' }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'POS arquivado' });
      qc.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => addToast({ type: 'error', message: err.message }),
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Pontos de Venda</h1>
        <Button onClick={() => setShowForm(true)}>+ Novo POS</Button>
      </header>

      {showForm && (
        <div style={{ padding: 16, background: '#f7f7f7', borderRadius: 8, marginBottom: 16 }}>
          <h3>Criar POS</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Bar Central"
            />
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              >
                {POS_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <Input
              label="Localização (opcional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Ala VIP, próximo ao palco"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => createMut.mutate(form)} disabled={!form.name || createMut.isPending}>
                Criar
              </Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ textAlign: 'left', padding: 8 }}>Nome</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Tipo</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Local</th>
            <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {list?.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{POS_TYPES.find((t) => t.value === p.type)?.label ?? p.type}</td>
              <td style={{ padding: 8 }}>{p.location ?? '—'}</td>
              <td style={{ padding: 8 }}>{p.isActive ? '🟢 Ativo' : '⚪ Inativo'}</td>
              <td style={{ padding: 8 }}>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Arquivar "${p.name}"?`)) archiveMut.mutate(p.id);
                  }}
                >
                  Arquivar
                </Button>
              </td>
            </tr>
          )) ?? null}
          {list?.length === 0 && (
            <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#666' }}>Nenhum POS cadastrado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPosPage;
```

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/cashless/pos/
git commit -m "feat(web): AdminPosPage with create/archive"
```

### Task 27: AdminCategoriesPage (com drag-and-drop)

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/categories/AdminCategoriesPage.tsx`

- [ ] **Step 1: Implementar usando @dnd-kit/sortable**

**Template base:** copiar a estrutura de `AdminPosPage.tsx` (Task 26 — query + mutation + form drawer + table). Diferenças:
- Campos no form: `name`, `icon` (input opcional), `color` (input `type="color"` opcional), `sortOrder` (number).
- Tabela tem coluna "drag handle" (≡) à esquerda de cada linha.
- Envolver `<tbody>` com `<DndContext onDragEnd={handleDragEnd}><SortableContext items={categoryIds}>` da `@dnd-kit/core` e `@dnd-kit/sortable`.
- Cada `<tr>` é um componente `SortableRow` que usa `useSortable({ id })` e aplica `transform/transition` no style.
- `handleDragEnd` → reordena array local, monta `items: [{id, sortOrder: index}]` e PATCH `/cashless/orgs/:orgId/events/:eventId/categories/reorder`. Otimisticamente atualiza a query.

Documentação: https://docs.dndkit.com/presets/sortable — exemplo "Sortable list" cobre 90% do caso. Não inventar — adaptar.

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/cashless/categories/
git commit -m "feat(web): AdminCategoriesPage with drag-and-drop reorder"
```

### Task 28: AdminProductsPage + ProductFormDrawer + CloneCatalogDialog

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/products/AdminProductsPage.tsx`
- Create: `ticketeria-web/src/features/admin/cashless/products/ProductFormDrawer.tsx`
- Create: `ticketeria-web/src/features/admin/cashless/products/CloneCatalogDialog.tsx`

**Template base pras 3 telas:** copiar shape de `AdminPosPage.tsx` (Task 26 — query/mutation/form/table). Adaptar.

- [ ] **Step 1: AdminProductsPage**

Como AdminPosPage, mas:
- Query: `GET /cashless/orgs/:orgId/events/:eventId/products?posId=X&categoryId=Y&isAvailable=Z` (params controlados por estado local: 3 selects no topo "Filtrar por POS", "Categoria", "Disponibilidade").
- Tabela: foto miniatura (40x40 `<img>`) | Nome | Categoria | POS | Preço | Estoque | Disponível | Ações (Editar / Arquivar).
- Botões header: "+ Novo produto" (abre `ProductFormDrawer` com `posId` pré-selecionado) e "Clonar de outro POS" (abre `CloneCatalogDialog`).
- Preço exibe como `R$ ${(priceCents/100).toFixed(2)}`.
- Click "Editar" abre o drawer com produto preenchido.

- [ ] **Step 2: ProductFormDrawer**

`<dialog>` HTML5 (`useRef<HTMLDialogElement>` + `dialog.showModal()`/`close()`).

Form fields:
- `name` (Input)
- `description` (textarea)
- `posId` (select — lista de POSs do evento; desabilita se editando produto existente)
- `categoryId` (select — lista de categorias do evento; opcional, "—" como primeiro item)
- `category` (select com enum legacy — preencher automaticamente baseado em `categoryId` se possível; senão default `'other'`)
- `priceReais` (Input type="number" step="0.01"; converter `Math.round(priceReais * 100)` antes de submit)
- `stockQty` (Input type="number"; opcional)
- `lowStockThreshold` (Input type="number"; opcional)
- `isAvailable` (checkbox)
- `sortOrder` (Input type="number"; default 0)
- `imageFile` (`<input type="file" accept="image/jpeg,image/png,image/webp">` + preview com `URL.createObjectURL` e revoke no unmount)

Submit:
1. POST/PATCH no endpoint de produto (sem imagem).
2. Se `imageFile != null`, fazer segundo request `FormData` com `image` field → POST `/cashless/orgs/:orgId/products/:productId/image`. **Usar `fetch` direto** (não o helper `api()` JSON), e setar headers só com `Authorization` (multer parseia `multipart/form-data`).
3. Toast success, fechar drawer, invalidar queries.

- [ ] **Step 3: CloneCatalogDialog**

`<dialog>` simples. Form:
- `sourcePosId` (select — lista de POSs do evento, exceto o atual)
- `overwrite` (checkbox; default unchecked)

Submit: POST `/cashless/orgs/:orgId/pos/:targetPosId/products/clone-from/:sourcePosId?overwrite=true|false`. Mostra resultado (`created`/`skipped`/`overwritten`) no toast, invalida `products` query, fecha dialog.

- [ ] **Step 4: Commit**

```bash
git add src/features/admin/cashless/products/
git commit -m "feat(web): AdminProductsPage with image upload and clone dialog"
```

### Task 29: AdminOperatorsPage

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/operators/AdminOperatorsPage.tsx`

- [ ] **Step 1: Implementar**

Template: copiar `AdminPosPage.tsx` (Task 26).

Diferenças:
- No topo, select "POS" carrega lista via `GET /cashless/orgs/:orgId/events/:eventId/pos` e seta `selectedPosId` no estado.
- Lista de operadores: `GET /cashless/orgs/:orgId/pos/:selectedPosId/operators` (enabled apenas quando `selectedPosId` set).
- Form criar: `name` (Input), `cpf` (Input opcional, máscara simples), `pin` (Input `type="password"` `inputMode="numeric"` `maxLength={6}` `pattern="\d{4,6}"`), checkbox `isActive`.
- Tabela: Nome | CPF | Status | Ações (Resetar PIN / Arquivar).
- "Resetar PIN" usa `prompt('Novo PIN (4-6 dígitos):')` (rápido pra MVP — UX de modal pode ir em iteração); valida regex local antes de PATCH `/cashless/orgs/:orgId/operators/:operatorId/reset-pin`.
- "Arquivar" usa `confirm()` antes de DELETE.

- [ ] **Step 2: Commit**

```bash
git add src/features/admin/cashless/operators/
git commit -m "feat(web): AdminOperatorsPage with PIN reset"
```

### Task 30: AdminStockOverviewPage + StockMovementsDrawer

**Files:**
- Create: `ticketeria-web/src/features/admin/cashless/stock/AdminStockOverviewPage.tsx`
- Create: `ticketeria-web/src/features/admin/cashless/stock/StockMovementsDrawer.tsx`

**Template:** ambas seguem shape de `AdminPosPage.tsx` (Task 26).

- [ ] **Step 1: AdminStockOverviewPage**

- Query: `GET /cashless/orgs/:orgId/events/:eventId/stock` retorna array `{productId, name, posId, posName, stockQty, lowStockThreshold, status}`.
- Filtro: select "POS" no topo (com opção "Todos"); filtra resultados client-side.
- Tabela: Produto | POS | Estoque | Threshold | Status (🟢/🟡/🔴 conforme `status: 'ok'|'low'|'out'|'untracked'`).
- Click em linha → `setOpenProductId(productId)` → renderiza `<StockMovementsDrawer productId={openProductId} onClose={() => setOpenProductId(null)} />`.

- [ ] **Step 2: StockMovementsDrawer**

`<dialog>` com 2 abas (estado local `tab: 'history' | 'new'`).

**History tab:**
- Query: `GET /cashless/orgs/:orgId/products/:productId/stock-movements?cursor=...&limit=50`.
- Lista: data | tipo (entry 📦 / adjustment ✏️ / loss ❌ / sale 💰) | quantidade (sinal de + ou -) | operador | notas.
- Botão "Carregar mais" se `meta.nextCursor != null`.

**New tab:**
- Form: `type` (radio: stock_entry / adjustment / loss), `quantity` (Input number; positivo, sinal aplicado pelo backend), `notes` (textarea opcional).
- Submit: POST `/cashless/orgs/:orgId/products/:productId/stock-movements`. Toast success, invalida tanto a query do drawer quanto `stockOverview` da página pai. Volta pra aba "history".

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/cashless/stock/
git commit -m "feat(web): AdminStockOverviewPage with movements drawer"
```

### Task 31: Registrar rotas em router.tsx

**Files:**
- Modify: `ticketeria-web/src/app/router.tsx`

- [ ] **Step 1: Adicionar imports lazy + 6 rotas**

No topo do arquivo, junto dos outros lazy imports:
```typescript
const AdminCashlessHubPage = lazy(() => import('@features/admin/cashless/AdminCashlessHubPage'));
const AdminPosPage = lazy(() => import('@features/admin/cashless/pos/AdminPosPage'));
const AdminCategoriesPage = lazy(() => import('@features/admin/cashless/categories/AdminCategoriesPage'));
const AdminProductsPage = lazy(() => import('@features/admin/cashless/products/AdminProductsPage'));
const AdminOperatorsPage = lazy(() => import('@features/admin/cashless/operators/AdminOperatorsPage'));
const AdminStockOverviewPage = lazy(() => import('@features/admin/cashless/stock/AdminStockOverviewPage'));
```

Junto das outras rotas admin:
```typescript
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless', element: adminWrap(<AdminCashlessHubPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/pos', element: adminWrap(<AdminPosPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/categories', element: adminWrap(<AdminCategoriesPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/products', element: adminWrap(<AdminProductsPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/operators', element: adminWrap(<AdminOperatorsPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/stock', element: adminWrap(<AdminStockOverviewPage />) },
```

- [ ] **Step 2: Build pra confirmar lazy imports OK**

Run: `cd ticketeria-web && npm run build`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/router.tsx
git commit -m "feat(web): register cashless admin routes"
```

---

## Fase 11 — Mobile sync via Socket.IO

### Task 32: Dep `socket.io-client`

**Files:**
- Modify: `ticketeria-mobile/package.json`

- [ ] **Step 1: Instalar**

```bash
cd ticketeria-mobile
npm install socket.io-client
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(mobile): add socket.io-client"
```

### Task 33: lib/socket.ts

**Files:**
- Create: `ticketeria-mobile/src/lib/socket.ts`

- [ ] **Step 1: Singleton + helpers**

```typescript
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:3333';

let _socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (_socket?.connected) return _socket;
  const token = await AsyncStorage.getItem('auth.accessToken');
  _socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 2000,
  });
  return _socket;
}

export async function joinPos(posId: string): Promise<void> {
  const socket = await getSocket();
  socket.emit('pos:join', { posId });
}

export async function onCatalogUpdated(cb: () => void): Promise<() => void> {
  const socket = await getSocket();
  const handler = () => cb();
  socket.on('catalog:updated', handler);
  return () => socket.off('catalog:updated', handler);
}

export function disconnectSocket(): void {
  _socket?.disconnect();
  _socket = null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/socket.ts
git commit -m "feat(mobile): Socket.IO client singleton"
```

### Task 34: Integrar em CashlessPOSScreen

**Files:**
- Modify: `ticketeria-mobile/src/screens/CashlessPOSScreen.tsx`

- [ ] **Step 1: Adicionar joinPos + listener no useEffect**

Após login do operador (onde `posId` está disponível e produtos são carregados), adicionar:

```typescript
useEffect(() => {
  if (!posId) return;
  let cleanup: (() => void) | undefined;
  let pollInterval: ReturnType<typeof setInterval> | undefined;

  const setup = async () => {
    await joinPos(posId);
    cleanup = await onCatalogUpdated(() => refetchProducts());

    // Polling fallback se socket desconectar
    pollInterval = setInterval(async () => {
      const s = await getSocket();
      if (!s.connected) refetchProducts();
    }, 5 * 60 * 1000);
  };
  setup();

  return () => {
    cleanup?.();
    if (pollInterval) clearInterval(pollInterval);
  };
}, [posId, refetchProducts]);
```

(Adaptar `refetchProducts` ao nome real da função no componente — provavelmente `loadProducts` ou similar.)

Imports:
```typescript
import { joinPos, onCatalogUpdated, getSocket } from '../lib/socket';
```

- [ ] **Step 2: Smoke test manual**

Iniciar API + mobile (`npx expo start`), logar como operador, abrir admin e mudar preço de produto, confirmar que app atualiza em < 5s.

- [ ] **Step 3: Commit**

```bash
git add src/screens/CashlessPOSScreen.tsx
git commit -m "feat(mobile): catalog auto-refresh via Socket.IO + polling fallback"
```

---

## Fase 12 — Validação manual + docs

### Task 35: Smoke test em staging

- [ ] **Step 1: Subir tudo localmente**

```bash
docker compose -f ticketeria-api/docker-compose.dev.yml up -d
cd ticketeria-api && npm run dev &
cd ticketeria-api && npm run start:worker &
cd ticketeria-web && npm run dev &
cd ticketeria-mobile && npm start
```

- [ ] **Step 2: Executar checklist de critérios de sucesso do spec**

Conferir cada item da seção 14 do spec:
- Criar evento → 2 POS → 5 categorias → 30 produtos → 4 operadores via UI
- Bartender abre app → PIN → vê catálogo → vende → estoque decrementa → admin vê em tempo real
- Clonar bar central pro VIP → 30 produtos em < 2s
- Mudar preço admin → app atualiza em < 5s
- Estoque a threshold → notificação; a 0 → produto some

Documentar quaisquer issues e abrir tasks de follow-up se houver bugs (não bloqueia rollout se forem cosméticos).

### Task 36: Atualizar RESOLVIDO.md

**Files:**
- Modify: `RESOLVIDO.md`

- [ ] **Step 1: Adicionar seção "Sub-projeto 1 — CRUDs admin do cashless (Zig parity, parte 1/6) — ENTREGUE [data real do dia da execução]" com link pro spec e plano**

- [ ] **Step 2: Commit**

```bash
git add RESOLVIDO.md
git commit -m "docs: register sub-project 1 (cashless admin CRUDs) shipped"
```

---

## Critérios de aceitação do plano

- [ ] Migration aplicada em dev sem perda de dados
- [ ] Backfill rodado com `--apply` e idempotente (rerun = no-op)
- [ ] 5 services novos com testes verdes (cobertura ≥ 80%)
- [ ] Integração end-to-end passando
- [ ] 6 telas admin web acessíveis e funcionais
- [ ] Mobile recebe `catalog:updated` em < 5s
- [ ] Bug PIN texto-puro corrigido (login só aceita bcrypt)
- [ ] Zero regressão em fluxos existentes (`npm run test` no api passa)
- [ ] Spec da seção 14 (critérios de sucesso) todos checkados manualmente em staging
