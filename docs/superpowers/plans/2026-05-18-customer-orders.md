# customer-orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cliente autenticado faz pedido num bar (POS) pelo app, paga com saldo cashless atomicamente, acompanha status até retirar — backend vertical slice.

**Architecture:** Novo módulo `customer-orders` (classe estática, padrão cashless). Refactor mínimo em `transaction.service.ts` extraindo `debitWithinTx` para que pedido+estoque+débito ocorram numa única transação Serializable. Reusa ledger/webhook/socket/idempotency existentes.

**Tech Stack:** Express 5, TypeScript, Prisma 7, vitest (mock prisma in-memory), Socket.IO via Redis bridge.

**Spec:** `docs/superpowers/specs/2026-05-18-customer-orders-design.md`

**Working dir:** `ticketeria-api/` dentro da worktree. Todos os caminhos relativos a `ticketeria-api/`.

---

### Task 0: Refactor transaction.service — extrair `debitWithinTx` + exportar ledger helpers

**Files:**
- Modify: `src/modules/cashless/transaction.service.ts`
- Test: `src/modules/cashless/__tests__/transaction.service.test.ts` (já existe — guard de regressão)

- [ ] **Step 1: Rodar baseline dos testes existentes de transaction.service**

Run: `npx vitest run src/modules/cashless/__tests__/transaction.service.test.ts`
Expected: PASS (registrar nº de testes — devem continuar idênticos no fim)

- [ ] **Step 2: Extrair `debitWithinTx`**

Em `transaction.service.ts`, adicionar função exportada que recebe o `tx` do caller e contém o núcleo do débito (hoje inline dentro de `charge()`):

```typescript
export interface DebitWithinTxArgs {
  walletId: string;
  amountCents: number;       // já inclui o que será debitado (sem tip aqui; tip somado pelo caller se houver)
  tipCents?: number;
  items?: Array<{ productId: string; name: string; qty: number; priceCents: number }>;
  posId?: string;
  operatorId?: string;
  metadata?: Record<string, unknown>;
}

export async function debitWithinTx(
  tx: Prisma.TransactionClient,
  args: DebitWithinTxArgs,
): Promise<{ transactionId: string; newBalance: number; timestamp: Date }> {
  const tip = args.tipCents ?? 0;
  const totalCents = args.amountCents + tip;

  const currentWallet = await tx.cashlessWallet.findUnique({
    where: { id: args.walletId },
    select: { balanceCents: true, status: true },
  });
  if (!currentWallet) throw new NotFoundError('Carteira não encontrada');
  if (currentWallet.status !== 'wallet_active')
    throw new BadRequestError('Carteira não está ativa para compras');
  if (currentWallet.balanceCents < totalCents)
    throw new BadRequestError('Saldo insuficiente para realizar esta compra');

  const updated = await tx.cashlessWallet.update({
    where: { id: args.walletId },
    data: {
      balanceCents: { decrement: totalCents },
      totalSpentCents: { increment: args.amountCents },
      version: { increment: 1 },
      lastUsedAt: new Date(),
    },
    select: { id: true, balanceCents: true },
  });

  const transaction = await tx.cashlessTransaction.create({
    data: {
      walletId: args.walletId,
      posId: args.posId,
      operatorId: args.operatorId,
      type: 'purchase',
      status: 'tx_completed',
      amountCents: args.amountCents,
      tipCents: tip,
      balanceAfter: updated.balanceCents,
      items: args.items,
      metadata: args.metadata ? JSON.parse(JSON.stringify(args.metadata)) : undefined,
    },
    select: { id: true, createdAt: true },
  });

  return {
    transactionId: transaction.id,
    newBalance: updated.balanceCents,
    timestamp: transaction.createdAt,
  };
}
```

Adicionar `import { Prisma } from '../../generated/prisma/client';` se ainda não importado.

- [ ] **Step 3: `charge()` passa a reusar `debitWithinTx`**

Substituir o corpo do `prisma.$transaction(...)` dentro de `charge()` por chamada a `debitWithinTx(tx, { walletId, amountCents, tipCents, items, posId, operatorId, metadata })`, preservando: a checagem de saldo pré-transação pode ficar (defensiva), `isolationLevel: 'Serializable'`, e o `void postCashlessPurchaseToLedger(...)` pós-commit. Resultado de `charge()` mantém shape `{ transactionId, amountCents, tipCents, newBalance, timestamp }` (mapear de `debitWithinTx`).

- [ ] **Step 4: Exportar helpers de ledger**

Trocar `async function postCashlessPurchaseToLedger` → `export async function postCashlessPurchaseToLedger` e idem `postCashlessRefundToLedger`.

- [ ] **Step 5: Rodar testes existentes — regressão zero**

Run: `npx vitest run src/modules/cashless/__tests__/transaction.service.test.ts`
Expected: PASS, mesmo nº de testes do Step 1, zero diff de comportamento.

- [ ] **Step 6: Commit**

```bash
git add src/modules/cashless/transaction.service.ts
git commit -m "refactor(api): extract debitWithinTx + export ledger helpers (zero behavior change)"
```

---

### Task 1: Schema — model CustomerOrder + enum + migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Adicionar enum + model**

Adicionar ao `schema.prisma`:

```prisma
enum CustomerOrderStatus {
  pending
  preparing
  ready
  delivered
  cancelled
}

model CustomerOrder {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  eventId      String   @map("event_id") @db.Uuid
  posId        String   @map("pos_id") @db.Uuid
  walletTxId   String?  @map("wallet_tx_id") @db.Uuid
  status       CustomerOrderStatus @default(pending)
  totalCents   Int      @map("total_cents")
  items        Json
  pickupCode   String   @map("pickup_code") @db.VarChar(8)
  preparingAt  DateTime? @map("preparing_at") @db.Timestamptz
  readyAt      DateTime? @map("ready_at") @db.Timestamptz
  deliveredAt  DateTime? @map("delivered_at") @db.Timestamptz
  cancelledAt  DateTime? @map("cancelled_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user  User        @relation(fields: [userId], references: [id])
  event Event       @relation(fields: [eventId], references: [id])
  pos   PointOfSale @relation(fields: [posId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([posId, status])
  @@index([eventId])
  @@map("customer_orders")
}
```

- [ ] **Step 2: Adicionar relations inversas**

Em `model User` adicionar: `customerOrders CustomerOrder[]`
Em `model Event` adicionar: `customerOrders CustomerOrder[]`
Em `model PointOfSale` adicionar: `customerOrders CustomerOrder[]`

- [ ] **Step 3: Gerar migration + client**

Run: `npx prisma migrate dev --name add_customer_orders`
Expected: migration criada em `prisma/migrations/{ts}_add_customer_orders/`, client regenerado.
(Se o ambiente bloquear DB: `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` não aplica — nesse caso criar a migration SQL manualmente com `CREATE TYPE "CustomerOrderStatus"` + `CREATE TABLE "customer_orders"` + índices, e rodar `npx prisma generate`.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (client tem `CustomerOrder` / `CustomerOrderStatus`)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(api): CustomerOrder model + migration (customer-orders)"
```

---

### Task 2: Infra compartilhada — AuditActions, orgScope, socket wrapper

**Files:**
- Modify: `src/shared/audit.ts` (enum `AuditActions`)
- Modify: `src/modules/cashless/shared/orgScope.ts`
- Create: `src/modules/customer-orders/shared/customerOrderEvents.ts`

- [ ] **Step 1: AuditActions**

Em `src/shared/audit.ts`, no enum/const `AuditActions`, adicionar:
```typescript
CUSTOMER_ORDER_CREATED: 'CUSTOMER_ORDER_CREATED',
CUSTOMER_ORDER_STATUS_CHANGED: 'CUSTOMER_ORDER_STATUS_CHANGED',
CUSTOMER_ORDER_CANCELLED: 'CUSTOMER_ORDER_CANCELLED',
```

- [ ] **Step 2: orgScope helper**

Em `src/modules/cashless/shared/orgScope.ts` adicionar:
```typescript
export async function assertCustomerOrderBelongsToOrg(orderId: string, organizationId: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!order || order.event.organizationId !== organizationId) {
    throw new NotFoundError('Pedido não encontrado');
  }
  return order;
}
```

- [ ] **Step 3: socket wrapper**

Create `src/modules/customer-orders/shared/customerOrderEvents.ts`:
```typescript
import { publishBroadcast } from '../../../shared/socketBridge';

interface OrderEventPayload {
  orderId: string;
  posId: string;
  userId: string;
  status: string;
  totalCents: number;
  pickupCode: string;
  ts: number;
}

export async function emitCustomerOrderNew(orgId: string, p: OrderEventPayload): Promise<void> {
  await publishBroadcast(`pos:${p.posId}`, 'customer_order:new', p);
  await publishBroadcast(`org:${orgId}`, 'customer_order:new', p);
}

export async function emitCustomerOrderStatus(p: OrderEventPayload): Promise<void> {
  await publishBroadcast(`user:${p.userId}`, 'customer_order:status', p);
  await publishBroadcast(`pos:${p.posId}`, 'customer_order:status', p);
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS
```bash
git add src/shared/audit.ts src/modules/cashless/shared/orgScope.ts src/modules/customer-orders/shared/customerOrderEvents.ts
git commit -m "feat(api): customer-orders audit actions + orgScope + socket events"
```

---

### Task 3: Validators (Zod)

**Files:**
- Create: `src/modules/customer-orders/customer-orders.validators.ts`

- [ ] **Step 1: Escrever validators**

```typescript
import { z } from 'zod';

export const createCustomerOrderSchema = z.object({
  eventId: z.string().uuid(),
  posId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(30),
});

export const updateCustomerOrderStatusSchema = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(['preparing', 'ready', 'delivered']),
});

export const customerOrderIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const myCustomerOrdersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(['pending', 'preparing', 'ready', 'delivered', 'cancelled']).optional(),
  eventId: z.string().uuid().optional(),
});
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → PASS
```bash
git add src/modules/customer-orders/customer-orders.validators.ts
git commit -m "feat(api): customer-orders Zod validators"
```

---

### Task 4: Service `create()` — TDD

**Files:**
- Create: `src/modules/customer-orders/customer-orders.service.ts`
- Test: `src/modules/customer-orders/__tests__/customer-orders.service.test.ts`

- [ ] **Step 1: Escrever testes que falham (mock prisma in-memory, padrão do projeto)**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const events = new Map([['ev-1', { id: 'ev-1', organizationId: 'org-1' }]]);
const pos = new Map([['pos-1', { id: 'pos-1', eventId: 'ev-1', type: 'bar', isArchived: false }]]);
const products = new Map<string, any>([
  ['p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 5, isArchived: false }],
  ['p-2', { id: 'p-2', posId: 'pos-1', name: 'Água', priceCents: 500, stockQty: null, isArchived: false }],
]);
const wallets = new Map<string, any>([
  ['w-1', { id: 'w-1', eventId: 'ev-1', userId: 'u-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0 }],
]);
const orders = new Map<string, any>();
const txns = new Map<string, any>();

function txClient() {
  return {
    cashlessWallet: {
      findUnique: vi.fn(({ where }) => Promise.resolve(wallets.get(where.id) ?? null)),
      update: vi.fn(({ where, data }) => {
        const w = wallets.get(where.id);
        w.balanceCents -= data.balanceCents.decrement;
        w.totalSpentCents += data.totalSpentCents.increment;
        w.version += 1;
        return Promise.resolve({ id: w.id, balanceCents: w.balanceCents });
      }),
    },
    cashlessTransaction: {
      create: vi.fn(({ data }) => {
        const id = `tx-${txns.size + 1}`;
        txns.set(id, { id, ...data });
        return Promise.resolve({ id, createdAt: new Date() });
      }),
    },
    pOSProduct: {
      update: vi.fn(({ where, data }) => {
        const p = products.get(where.id);
        if (data.stockQty?.decrement != null) p.stockQty -= data.stockQty.decrement;
        if (data.stockQty?.increment != null) p.stockQty += data.stockQty.increment;
        return Promise.resolve(p);
      }),
    },
    customerOrder: {
      create: vi.fn(({ data }) => {
        const id = `o-${orders.size + 1}`;
        const o = { id, status: 'pending', createdAt: new Date(), ...data };
        orders.set(id, o);
        return Promise.resolve(o);
      }),
    },
  };
}

vi.mock('../../../config/database', () => ({
  prisma: {
    pointOfSale: { findUnique: vi.fn(({ where }) => Promise.resolve(pos.get(where.id) ?? null)) },
    pOSProduct: { findUnique: vi.fn(({ where }) => Promise.resolve(products.get(where.id) ?? null)) },
    cashlessWallet: { findUnique: vi.fn(({ where }) => {
      if (where.eventId_userId) {
        const w = [...wallets.values()].find(
          (x) => x.eventId === where.eventId_userId.eventId && x.userId === where.eventId_userId.userId,
        );
        return Promise.resolve(w ?? null);
      }
      return Promise.resolve(wallets.get(where.id) ?? null);
    }) },
    customerOrder: {
      findUnique: vi.fn(({ where }) => Promise.resolve(orders.get(where.id) ?? null)),
      findMany: vi.fn(() => Promise.resolve([...orders.values()])),
    },
    $transaction: vi.fn(async (fn: any) => fn(txClient())),
  },
}));
vi.mock('../../../shared/audit', () => ({ logAudit: vi.fn(() => Promise.resolve()), AuditActions: new Proxy({}, { get: (_, k) => k }) }));
vi.mock('../shared/customerOrderEvents', () => ({ emitCustomerOrderNew: vi.fn(() => Promise.resolve()), emitCustomerOrderStatus: vi.fn(() => Promise.resolve()) }));
vi.mock('../../cashless/transaction.service', () => ({
  debitWithinTx: vi.fn(async (tx, args) => {
    await tx.cashlessWallet.update({ where: { id: args.walletId }, data: { balanceCents: { decrement: args.amountCents }, totalSpentCents: { increment: args.amountCents }, version: { increment: 1 }, lastUsedAt: new Date() } });
    const t = await tx.cashlessTransaction.create({ data: { walletId: args.walletId, type: 'purchase', amountCents: args.amountCents } });
    return { transactionId: t.id, newBalance: 0, timestamp: new Date() };
  }),
  postCashlessPurchaseToLedger: vi.fn(() => Promise.resolve()),
  transactionService: { reverse: vi.fn(() => Promise.resolve({})) },
}));

import { CustomerOrdersService } from '../customer-orders.service';

describe('CustomerOrdersService.create', () => {
  beforeEach(() => { orders.clear(); txns.clear(); vi.clearAllMocks();
    wallets.set('w-1', { id: 'w-1', eventId: 'ev-1', userId: 'u-1', balanceCents: 5000, status: 'wallet_active', version: 0, totalSpentCents: 0 });
    products.set('p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 5, isArchived: false });
    products.set('p-2', { id: 'p-2', posId: 'pos-1', name: 'Água', priceCents: 500, stockQty: null, isArchived: false });
  });

  it('cria pedido, debita wallet, baixa estoque controlado', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 2 }] });
    expect(o.totalCents).toBe(2000);
    expect(o.status).toBe('pending');
    expect(o.pickupCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(products.get('p-1').stockQty).toBe(3);
  });

  it('produto sem controle de estoque (stockQty null) não altera estoque', async () => {
    await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-2', qty: 3 }] });
    expect(products.get('p-2').stockQty).toBeNull();
  });

  it('re-precifica server-side (ignora preço do cliente)', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1, priceCents: 1 } as any] });
    expect(o.totalCents).toBe(1000);
  });

  it('rejeita saldo insuficiente', async () => {
    wallets.get('w-1').balanceCents = 100;
    await expect(CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 2 }] }))
      .rejects.toThrow(/[Ss]aldo insuficiente/);
  });

  it('rejeita estoque insuficiente', async () => {
    await expect(CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 99 }] }))
      .rejects.toThrow(/[Ee]stoque/);
  });

  it('rejeita quando usuário não tem carteira no evento', async () => {
    await expect(CustomerOrdersService.create({ userId: 'sem-wallet', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] }))
      .rejects.toThrow(/carteira/i);
  });

  it('idempotência: mesma key não cria 2º pedido', async () => {
    const a = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }], idempotencyKey: 'k1' });
    const b = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }], idempotencyKey: 'k1' });
    expect(b.id).toBe(a.id);
    expect(orders.size).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npx vitest run src/modules/customer-orders/__tests__/customer-orders.service.test.ts`
Expected: FAIL ("Cannot find module '../customer-orders.service'")

- [ ] **Step 3: Implementar `create()`**

Create `src/modules/customer-orders/customer-orders.service.ts`:

```typescript
import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { logAudit, AuditActions } from '../../shared/audit';
import { debitWithinTx, postCashlessPurchaseToLedger, transactionService } from '../cashless/transaction.service';
import { emitCustomerOrderNew, emitCustomerOrderStatus } from './shared/customerOrderEvents';

const CONSUMER_POS = ['bar', 'mobile', 'totem', 'vip_lounge', 'food_truck'];
const idempotencyCache = new Map<string, string>(); // key -> orderId (processo; reforço além do middleware HTTP)

function genPickupCode(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
}

interface CreateInput {
  userId: string;
  eventId: string;
  posId: string;
  items: Array<{ productId: string; qty: number }>;
  idempotencyKey?: string;
}

export class CustomerOrdersService {
  static async create(input: CreateInput) {
    if (input.idempotencyKey && idempotencyCache.has(input.idempotencyKey)) {
      const existing = await prisma.customerOrder.findUnique({ where: { id: idempotencyCache.get(input.idempotencyKey)! } });
      if (existing) return existing;
    }

    const pos = await prisma.pointOfSale.findUnique({ where: { id: input.posId } });
    if (!pos || pos.eventId !== input.eventId || pos.isArchived) throw new NotFoundError('Bar não encontrado');
    if (!CONSUMER_POS.includes(pos.type)) throw new BadRequestError('Este ponto não aceita pedidos pelo app');

    // Re-precificação server-side
    const priced: Array<{ productId: string; name: string; qty: number; priceCents: number; controlsStock: boolean }> = [];
    for (const it of input.items) {
      const p = await prisma.pOSProduct.findUnique({ where: { id: it.productId } });
      if (!p || p.posId !== input.posId || p.isArchived) throw new NotFoundError(`Produto indisponível: ${it.productId}`);
      priced.push({ productId: p.id, name: p.name, qty: it.qty, priceCents: p.priceCents, controlsStock: p.stockQty !== null });
    }
    const totalCents = priced.reduce((s, i) => s + i.priceCents * i.qty, 0);

    const wallet = await prisma.cashlessWallet.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: input.userId } },
    });
    if (!wallet) throw new BadRequestError('Você não tem carteira cashless neste evento');

    const order = await prisma.$transaction(async (tx) => {
      for (const i of priced) {
        if (!i.controlsStock) continue;
        const fresh = await tx.pOSProduct.findUnique?.({ where: { id: i.productId } }) ?? await prisma.pOSProduct.findUnique({ where: { id: i.productId } });
        if (fresh && fresh.stockQty != null && fresh.stockQty < i.qty) throw new BadRequestError(`Estoque insuficiente: ${i.name}`);
        await tx.pOSProduct.update({ where: { id: i.productId }, data: { stockQty: { decrement: i.qty } } });
      }
      const debit = await debitWithinTx(tx, {
        walletId: wallet.id,
        amountCents: totalCents,
        items: priced.map(({ productId, name, qty, priceCents }) => ({ productId, name, qty, priceCents })),
        posId: input.posId,
        metadata: { source: 'customer_order' },
      });
      return tx.customerOrder.create({
        data: {
          userId: input.userId,
          eventId: input.eventId,
          posId: input.posId,
          walletTxId: debit.transactionId,
          status: 'pending',
          totalCents,
          items: priced.map(({ productId, name, qty, priceCents }) => ({ productId, name, qty, priceCents })),
          pickupCode: genPickupCode(),
        },
      });
    }, { isolationLevel: 'Serializable' });

    if (input.idempotencyKey) idempotencyCache.set(input.idempotencyKey, order.id);

    void postCashlessPurchaseToLedger({ walletId: wallet.id, transactionId: order.walletTxId!, amountCents: totalCents, tipCents: 0, posId: input.posId });
    const orgId = (await prisma.event.findUnique({ where: { id: input.eventId }, select: { organizationId: true } }))?.organizationId ?? '';
    await emitCustomerOrderNew(orgId, { orderId: order.id, posId: order.posId, userId: order.userId, status: order.status, totalCents, pickupCode: order.pickupCode, ts: Date.now() });
    await logAudit({ actorId: input.userId, action: AuditActions.CUSTOMER_ORDER_CREATED, entityType: 'CustomerOrder', entityId: order.id, metadata: { totalCents, posId: input.posId } });

    return order;
  }
}
```

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/modules/customer-orders/__tests__/customer-orders.service.test.ts`
Expected: PASS (7 testes do `create`)

- [ ] **Step 5: Commit**

```bash
git add src/modules/customer-orders/customer-orders.service.ts src/modules/customer-orders/__tests__/customer-orders.service.test.ts
git commit -m "feat(api): customer-orders create() — re-pricing + atomic debit + stock (TDD)"
```

---

### Task 5: Service `updateStatus()` + `cancelByCustomer()` + `getMyOrders()` — TDD

**Files:**
- Modify: `src/modules/customer-orders/customer-orders.service.ts`
- Modify: `src/modules/customer-orders/__tests__/customer-orders.service.test.ts`

- [ ] **Step 1: Adicionar testes que falham**

Acrescentar ao arquivo de teste (usa `assertCustomerOrderBelongsToOrg` — mockar `../../cashless/shared/orgScope`):

```typescript
vi.mock('../../cashless/shared/orgScope', () => ({
  assertCustomerOrderBelongsToOrg: vi.fn(async (id: string, org: string) => {
    const o = orders.get(id);
    if (!o || org !== 'org-1') throw new Error('Pedido não encontrado');
    return o;
  }),
}));

describe('CustomerOrdersService.updateStatus', () => {
  beforeEach(() => { orders.clear(); vi.clearAllMocks(); });
  it('transição válida pending→preparing grava timestamp', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    const up = await CustomerOrdersService.updateStatus({ orderId: o.id, operatorId: 'op-1', organizationId: 'org-1', status: 'preparing' });
    expect(up.status).toBe('preparing');
    expect(up.preparingAt).toBeTruthy();
  });
  it('rejeita transição inválida pending→ready', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    await expect(CustomerOrdersService.updateStatus({ orderId: o.id, operatorId: 'op-1', organizationId: 'org-1', status: 'ready' }))
      .rejects.toThrow(/transição|inválid/i);
  });
  it('IDOR: org diferente → não encontrado', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    await expect(CustomerOrdersService.updateStatus({ orderId: o.id, operatorId: 'op-1', organizationId: 'org-X', status: 'preparing' }))
      .rejects.toThrow();
  });
});

describe('CustomerOrdersService.cancelByCustomer', () => {
  beforeEach(() => { orders.clear(); vi.clearAllMocks();
    products.set('p-1', { id: 'p-1', posId: 'pos-1', name: 'Cerveja', priceCents: 1000, stockQty: 5, isArchived: false });
  });
  it('cancela em pending: estorna + repõe estoque + status cancelled', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 2 }] });
    expect(products.get('p-1').stockQty).toBe(3);
    const c = await CustomerOrdersService.cancelByCustomer({ orderId: o.id, userId: 'u-1' });
    expect(c.status).toBe('cancelled');
    expect(c.cancelledAt).toBeTruthy();
    expect(products.get('p-1').stockQty).toBe(5);
  });
  it('rejeita cancelar fora de pending', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    await CustomerOrdersService.updateStatus({ orderId: o.id, operatorId: 'op-1', organizationId: 'org-1', status: 'preparing' });
    await expect(CustomerOrdersService.cancelByCustomer({ orderId: o.id, userId: 'u-1' }))
      .rejects.toThrow(/preparo|cancel/i);
  });
  it('rejeita cancelar pedido de outro usuário', async () => {
    const o = await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    await expect(CustomerOrdersService.cancelByCustomer({ orderId: o.id, userId: 'outro' }))
      .rejects.toThrow();
  });
});

describe('CustomerOrdersService.getMyOrders', () => {
  beforeEach(() => { orders.clear(); vi.clearAllMocks(); });
  it('retorna só pedidos do usuário', async () => {
    await CustomerOrdersService.create({ userId: 'u-1', eventId: 'ev-1', posId: 'pos-1', items: [{ productId: 'p-1', qty: 1 }] });
    const res = await CustomerOrdersService.getMyOrders({ userId: 'u-1', pagination: { limit: 20, direction: 'forward' } });
    expect(res.data.length).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar — deve falhar**

Run: `npx vitest run src/modules/customer-orders/__tests__/customer-orders.service.test.ts`
Expected: FAIL (métodos não existem)

- [ ] **Step 3: Implementar os 3 métodos**

Adicionar à classe `CustomerOrdersService`:

```typescript
  static async updateStatus(input: { orderId: string; operatorId: string; organizationId: string; status: 'preparing' | 'ready' | 'delivered' }) {
    const { assertCustomerOrderBelongsToOrg } = await import('../cashless/shared/orgScope');
    const order = await assertCustomerOrderBelongsToOrg(input.orderId, input.organizationId);
    const valid: Record<string, string> = { pending: 'preparing', preparing: 'ready', ready: 'delivered' };
    if (valid[order.status] !== input.status) {
      throw new BadRequestError(`Transição inválida: ${order.status} → ${input.status}`);
    }
    const tsField = { preparing: 'preparingAt', ready: 'readyAt', delivered: 'deliveredAt' }[input.status];
    const updated = await prisma.customerOrder.update({
      where: { id: input.orderId },
      data: { status: input.status, [tsField]: new Date() },
    });
    await emitCustomerOrderStatus({ orderId: updated.id, posId: updated.posId, userId: updated.userId, status: updated.status, totalCents: updated.totalCents, pickupCode: updated.pickupCode, ts: Date.now() });
    await logAudit({ actorId: input.operatorId, action: AuditActions.CUSTOMER_ORDER_STATUS_CHANGED, entityType: 'CustomerOrder', entityId: updated.id, metadata: { to: input.status } });
    return updated;
  }

  static async cancelByCustomer(input: { orderId: string; userId: string }) {
    const order = await prisma.customerOrder.findUnique({ where: { id: input.orderId } });
    if (!order || order.userId !== input.userId) throw new NotFoundError('Pedido não encontrado');
    if (order.status !== 'pending') throw new BadRequestError('Pedido já em preparo não pode ser cancelado pelo cliente');

    const items = order.items as Array<{ productId: string; qty: number }>;
    if (order.walletTxId) await transactionService.reverse(order.walletTxId, 'Pedido cancelado pelo cliente');
    const cancelled = await prisma.$transaction(async (tx) => {
      for (const i of items) {
        const p = await prisma.pOSProduct.findUnique({ where: { id: i.productId } });
        if (p && p.stockQty != null) await tx.pOSProduct.update({ where: { id: i.productId }, data: { stockQty: { increment: i.qty } } });
      }
      return tx.customerOrder.update({ where: { id: order.id }, data: { status: 'cancelled', cancelledAt: new Date() } });
    }, { isolationLevel: 'Serializable' });

    await emitCustomerOrderStatus({ orderId: cancelled.id, posId: cancelled.posId, userId: cancelled.userId, status: cancelled.status, totalCents: cancelled.totalCents, pickupCode: cancelled.pickupCode, ts: Date.now() });
    await logAudit({ actorId: input.userId, action: AuditActions.CUSTOMER_ORDER_CANCELLED, entityType: 'CustomerOrder', entityId: cancelled.id, metadata: {} });
    return cancelled;
  }

  static async getMyOrders(input: { userId: string; pagination: { cursor?: string; limit: number; direction: 'forward' | 'backward' }; filters?: { status?: string; eventId?: string } }) {
    const { buildCursorPagination, formatPaginatedResponse } = await import('../../shared/pagination');
    const cp = buildCursorPagination(input.pagination);
    const where: any = { userId: input.userId };
    if (input.filters?.status) where.status = input.filters.status;
    if (input.filters?.eventId) where.eventId = input.filters.eventId;
    const rows = await prisma.customerOrder.findMany({ where, ...cp });
    return formatPaginatedResponse(rows, input.pagination.limit);
  }
```

Mover o `import { assertCustomerOrderBelongsToOrg }` e `pagination` para imports estáticos no topo (o `await import` acima é só para clareza no plano — usar import normal).

- [ ] **Step 4: Rodar — deve passar**

Run: `npx vitest run src/modules/customer-orders/__tests__/customer-orders.service.test.ts`
Expected: PASS (todos os ~13 testes)

- [ ] **Step 5: Commit**

```bash
git add src/modules/customer-orders
git commit -m "feat(api): customer-orders updateStatus + cancelByCustomer + getMyOrders (TDD)"
```

---

### Task 6: Router + wiring em app.ts

**Files:**
- Create: `src/modules/customer-orders/customer-orders.router.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Router**

```typescript
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idempotency } from '../../middleware/idempotency';
import { CustomerOrdersService } from './customer-orders.service';
import {
  createCustomerOrderSchema, updateCustomerOrderStatusSchema,
  customerOrderIdParamsSchema, myCustomerOrdersQuerySchema,
} from './customer-orders.validators';

const router = Router();

router.post('/', authenticate, idempotency, validate({ body: createCustomerOrderSchema }), async (req, res, next) => {
  try {
    const order = await CustomerOrdersService.create({
      userId: req.user!.id,
      eventId: req.body.eventId,
      posId: req.body.posId,
      items: req.body.items,
      idempotencyKey: req.header('Idempotency-Key') ?? undefined,
    });
    res.status(201).json({ data: order });
  } catch (e) { next(e); }
});

router.get('/me', authenticate, validate({ query: myCustomerOrdersQuerySchema }), async (req, res, next) => {
  try {
    const r = await CustomerOrdersService.getMyOrders({
      userId: req.user!.id,
      pagination: { cursor: req.query.cursor as string | undefined, limit: Number(req.query.limit ?? 20), direction: 'forward' },
      filters: { status: req.query.status as string | undefined, eventId: req.query.eventId as string | undefined },
    });
    res.json(r);
  } catch (e) { next(e); }
});

router.patch('/:id/status', authenticate, validate({ params: customerOrderIdParamsSchema, body: updateCustomerOrderStatusSchema }), async (req, res, next) => {
  try {
    const up = await CustomerOrdersService.updateStatus({
      orderId: req.params.id, operatorId: req.user!.id,
      organizationId: req.body.organizationId, status: req.body.status,
    });
    res.json({ data: up });
  } catch (e) { next(e); }
});

router.post('/:id/cancel', authenticate, validate({ params: customerOrderIdParamsSchema }), async (req, res, next) => {
  try {
    const c = await CustomerOrdersService.cancelByCustomer({ orderId: req.params.id, userId: req.user!.id });
    res.json({ data: c });
  } catch (e) { next(e); }
});

export default router;
```

(Conferir nomes reais de `idempotency`/`authenticate`/`validate` exports lendo os middlewares antes de finalizar — ajustar import se divergir.)

- [ ] **Step 2: Wire em app.ts**

Localizar onde os routers são montados (`app.use('/api/v1/...')`) e adicionar:
```typescript
import customerOrdersRouter from './modules/customer-orders/customer-orders.router';
app.use('/api/v1/customer-orders', customerOrdersRouter);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/customer-orders/customer-orders.router.ts src/app.ts
git commit -m "feat(api): customer-orders router + wiring (/api/v1/customer-orders)"
```

---

### Task 7: Verificação final (DoD)

- [ ] **Step 1: Suite do módulo + transaction.service (regressão)**

Run: `npx vitest run src/modules/customer-orders src/modules/cashless/__tests__/transaction.service.test.ts`
Expected: PASS — módulo ≥11 testes verdes, transaction.service idêntico ao baseline da Task 0.

- [ ] **Step 2: Typecheck global**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Suite completa (confirmar baseline pré-existente inalterado)**

Run: `npx vitest run`
Expected: novos testes verdes; as 4 falhas pré-existentes (`events.service` ×3, `gateway.registry` ×1) e integration tests sem DB seguem como antes — **nenhuma nova falha**.

- [ ] **Step 4: Atualizar RESOLVIDO.md**

Adicionar seção "Engine 5 Sprint 1 — customer-orders backend (vertical slice) ENTREGUE" listando: model+migration, service (create/updateStatus/cancel/getMyOrders), refactor debitWithinTx, 4 rotas, ≥11 testes. Marcar pendências: tela mobile, fila admin, worker push.

- [ ] **Step 5: Commit final**

```bash
git add RESOLVIDO.md
git commit -m "docs: Engine 5 Sprint 1 customer-orders backend entregue"
```

---

## Self-Review

**Spec coverage:** schema ✓(T1) · re-pricing ✓(T4) · atomic debit via debitWithinTx ✓(T0/T4) · stock decrement+null handling ✓(T4) · idempotência ✓(T4) · updateStatus+transições+IDOR ✓(T5) · cancel pending-only+estorno+reposição ✓(T5) · getMyOrders ✓(T5) · 4 rotas ✓(T6) · audit/socket/orgScope ✓(T2) · regressão transaction.service ✓(T0/T7). Sem gaps.

**Placeholder scan:** sem TBD/TODO. Código completo em cada step. Ressalvas explícitas (nomes de middleware a conferir, migration manual se DB bloqueado) são instruções concretas, não placeholders.

**Type consistency:** `debitWithinTx(tx, args)` assinatura idêntica T0↔T4. `CustomerOrdersService` métodos `create/updateStatus/cancelByCustomer/getMyOrders` consistentes T4↔T5↔T6. `emitCustomerOrderNew/Status` assinatura idêntica T2↔T4↔T5. `assertCustomerOrderBelongsToOrg` T2↔T5. Status enum consistente em todos.
