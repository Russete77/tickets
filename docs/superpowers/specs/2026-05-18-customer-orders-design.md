# Spec — `customer-orders` (Engine 5, Sprint 1, backend vertical slice)

**Data:** 2026-05-18
**Branch:** `worktree-engine5-customer-orders` (worktree, base `origin/master` @ `c9a1737`)
**PRD:** §4.5.2 — "Pedido pelo app no bar" (Engine 5 Super App)
**Convenções:** [`CONVENCOES_CODIGO.md`](../../../CONVENCOES_CODIGO.md)

## Decisões aprovadas (2026-05-18)

| Decisão | Escolha |
|---|---|
| 1º corte | **Só backend** (model + migration + service + 3 rotas + socket + TDD). Mobile e fila admin viram PRs seguintes. |
| Estoque | **Baixa `POSProduct.stockQty` no pedido** (atômico). Fecha consistência da Task 21 adiada. |
| Cancelamento | **Cliente só enquanto `pending`** (auto-estorno via `reverse()`). Após `preparing`, só operador. |

## Conceito

Cliente autenticado faz pedido num bar (POS) pelo app, paga com saldo cashless, acompanha status até retirar. Reusa infra existente — **não recria pagamento, ledger nem webhook**.

Fora de escopo deste corte: tela mobile, fila admin web, worker de push (`ready` → notificação). PRs seguintes.

## Reuso (não duplicar)

- `transaction.service.ts` (`ticketeria-api/src/modules/cashless/`): hoje `charge()` abre a **própria** `$transaction`. O pedido pelo bar precisa de **uma única transação** cobrindo estoque + criação do pedido + débito (senão risco de estado parcial entre 2 transações). **Refactor mínimo necessário:** extrair o núcleo de débito (`checagem de saldo → decrement balance/totalSpent/version → create CashlessTransaction`) num helper `debitWithinTx(tx, {...})` que recebe o `tx` do caller. `charge()` passa a chamar `debitWithinTx` internamente (comportamento idêntico, coberto pelos testes existentes). `customer-orders.service` usa `debitWithinTx` dentro da sua própria transação Serializable.
- Helpers `postCashlessPurchaseToLedger` / `postCashlessRefundToLedger` (hoje privados em `transaction.service.ts`) passam a ser **exportados** e chamados pós-commit pelo `customer-orders.service` — mesma fonte de verdade de ledger/webhook, sem duplicar.
- `transactionService.reverse(transactionId, reason)` — estorno (wallet credit + ledger + webhook): reusado **como está** no cancel (estorno é operação isolada, transação própria ok).
- `assert*BelongsToOrg` pattern (`cashless/shared/orgScope.ts`).
- `publishBroadcast(room, event, payload)` (`shared/socketBridge`); rooms `pos:{posId}`, `org:{orgId}`, `user:{userId}`.
- `idempotency` middleware (`src/middleware/idempotency.ts`).
- `authenticate` middleware (`src/middleware/auth.ts`) — popula `req.user`.

Fatos confirmados no schema: `CashlessWallet` tem `userId` + `@@unique([eventId, userId])` (B2C viável hoje); `POSProduct.stockQty Int?` (null = não controla estoque); `POSType` inclui `bar`.

## 1. Schema (1 migration + Prisma)

```prisma
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

enum CustomerOrderStatus {
  pending
  preparing
  ready
  delivered
  cancelled
}
```

- `items` Json: snapshot imutável `[{ productId, name, qty, priceCents }]` (preço gravado no momento do pedido).
- `pickupCode`: 6 chars alfanuméricos maiúsculos, único entre pedidos **ativos** (`status NOT IN (delivered, cancelled)`) do mesmo POS — não global. Colisão → regenera (retry bounded).
- Migration: `{timestamp}_add_customer_orders`. SQL em UPPERCASE, sem backfill (tabela nova).
- Relations inversas adicionadas em `User`, `Event`, `PointOfSale`.

## 2. Service — `customer-orders.service.ts` (classe estática)

### `create({ userId, eventId, posId, items, idempotencyKey })`
1. `assertPosBelongsToEvent(posId, eventId)` — POS existe, pertence ao evento, não arquivado, `type` consumer-facing (`bar | mobile | totem | vip_lounge | food_truck`).
2. **Re-precificação server-side:** para cada item, `POSProduct.findUnique` por id, valida `posId` bate, não arquivado, disponível. Usa `priceCents` do banco — **ignora qualquer preço vindo do cliente**. `totalCents = Σ(priceCents * qty)`.
3. Wallet: `findUnique({ eventId_userId })`. Ausente → `BadRequestError("Você não tem carteira cashless neste evento")`.
4. **Transação Serializable única:**
   - Para cada produto com `stockQty != null`: revalida `stockQty >= qty` (lock), `decrement: qty`. `stockQty == null` → não mexe (não controla estoque).
   - Cria `CustomerOrder` status `pending`, `pickupCode` gerado.
   - Débito da wallet via `debitWithinTx(tx, { walletId, amountCents: totalCents, items, ... })` (mesmo `tx` Serializable); grava `walletTxId` retornado.
5. Pós-commit: `postCashlessPurchaseToLedger(...)` (ledger + webhook, helper exportado). `publishBroadcast('pos:{posId}', 'customer_order:new', payload)` + `org:{orgId}`. `logAudit(CUSTOMER_ORDER_CREATED)`.
6. Idempotência: `idempotencyKey` repetida → retorna pedido existente, **não cobra de novo**.

### `updateStatus({ orderId, operatorId, organizationId, newStatus })`
- IDOR: `assertCustomerOrderBelongsToOrg(orderId, organizationId)`.
- Transições válidas (somente para frente): `pending→preparing`, `preparing→ready`, `ready→delivered`. Qualquer outra → `BadRequestError`. Grava timestamp correspondente.
- Emite `customer_order:status` em `user:{userId}` (gatilho de push futuro) + `pos:{posId}`. `logAudit(CUSTOMER_ORDER_STATUS_CHANGED)`.

### `cancelByCustomer({ orderId, userId })`
- Pedido pertence ao `userId` (senão `NotFoundError`). `status !== pending` → `BadRequestError("Pedido já em preparo não pode ser cancelado pelo cliente")`.
- Transação: `transactionService.reverse(walletTxId)` (estorno), repõe `stockQty` (`increment: qty` onde controlado), status `cancelled` + `cancelledAt`.
- Emite `customer_order:status` (cancelled). `logAudit(CUSTOMER_ORDER_CANCELLED)`.

### `getMyOrders({ userId, pagination, filters })`
- Pedidos do `userId`, paginação por cursor (`buildCursorPagination`/`formatPaginatedResponse`), filtro opcional `status`/`eventId`.

## 3. Endpoints — `/api/v1/customer-orders` (todos `authenticate`)

| Método | Rota | Quem | Validação |
|---|---|---|---|
| `POST /` | criar pedido | cliente | body `createCustomerOrderSchema`, header `Idempotency-Key` |
| `GET /me` | meus pedidos | cliente | query `myOrdersQuerySchema` |
| `PATCH /:id/status` | mudar status | operador (org-scoped) | params + body `updateStatusSchema` |
| `POST /:id/cancel` | cancelar | cliente | params `orderIdParamsSchema` |

Router agregado wired em `app.ts` sob `/api/v1/customer-orders`. Sem controller separado (router → service direto, padrão dos módulos cashless).

Validators Zod (named exports): `createCustomerOrderSchema` (`posId` uuid, `items` array min 1 de `{ productId uuid, qty int 1..50 }` — **sem priceCents**), `updateStatusSchema` (`status` enum), `orderIdParamsSchema`, `myOrdersQuerySchema`.

## 4. Erros / invariantes

- Tudo numa transação Serializable: saldo insuficiente, estoque insuficiente, carteira ausente, POS arquivado/errado, produto de outro POS, transição inválida, cancel fora de `pending` → `BadRequest`/`NotFound` em PT, **sem cobrança nem baixa de estoque parcial**.
- Cancel: estorno + reposição de estoque atômicos.
- Idempotência impede cobrança dupla por double-tap.
- Re-precificação impede manipulação de preço pelo cliente.

## 5. Testes (TDD, vitest, mock prisma in-memory)

Mínimo:
1. Happy: cria pedido, debita wallet, baixa stockQty, grava walletTxId + pickupCode.
2. Saldo insuficiente → erro, nada persistido.
3. Estoque insuficiente → erro, nada persistido.
4. Produto com `stockQty == null` → cria sem mexer em estoque.
5. **Re-pricing: cliente manda priceCents adulterado → total usa preço do banco.**
6. Carteira ausente no evento → erro claro.
7. Idempotência: 2ª chamada com mesma key não cria/cobra de novo.
8. IDOR: `updateStatus` com order de outra org → `NotFoundError`.
9. Transição inválida (`pending→ready`) → erro.
10. `cancelByCustomer` em `pending` → estorna + repõe estoque + status cancelled.
11. `cancelByCustomer` em `preparing` → erro.

Alvo ≥80% no módulo. Strings de erro em PT.

## Definition of Done

- [ ] Refactor `transaction.service.ts`: `debitWithinTx(tx, ...)` extraído, `charge()` reusa, `postCashless*ToLedger` exportados — **testes existentes de `transaction.service` continuam verdes (regressão zero)**
- [ ] Migration roda limpo + `db:generate` ok
- [ ] Service + validators + router + wiring em `app.ts`
- [ ] `assertCustomerOrderBelongsToOrg` em `shared/orgScope.ts`
- [ ] `AuditActions` novos: `CUSTOMER_ORDER_CREATED/STATUS_CHANGED/CANCELLED`
- [ ] Wrapper socket `customerOrderEvents.ts` (`customer_order:new`, `customer_order:status`)
- [ ] ≥11 testes verdes, ≥80% módulo
- [ ] Typecheck verde
- [ ] Commits separados por camada (schema → service → router → wiring)
