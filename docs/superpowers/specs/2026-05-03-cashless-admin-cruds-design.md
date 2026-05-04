# Sub-projeto 1 — CRUDs admin do cashless (Zig parity, parte 1 de 6)

**Data:** 2026-05-03
**Autor:** Erick Berberian (com Claude)
**Status:** Em revisão pelo autor → próximo gate: writing-plans

## 1. Contexto e motivação

### 1.1 Visão estratégica do produto

PulsePass é o **Sistema Operacional de Eventos do Brasil** — primeiro produto a unificar 3 sistemas que hoje vivem separados: **Ticketeria** (Sympla killer), **Guest List + Promoters** (AZList killer) e **Cashless digital** (ZigPay killer). O moat é a integração entre os 3, não paridade isolada com cada concorrente.

### 1.2 Estado atual do cashless

A auditoria CTO 2026-05 (`RESOLVIDO.md`) entregou a fundação transacional do cashless: schema completo (`CashlessConfig`, `CashlessWallet`, `CashlessTransaction`, `PointOfSale`, `POSOperator`, `POSProduct`, `StockMovement`), wire-ups com ledger contábil, NFC, push, Socket.IO, mobile POS com offline queue. Backend ~98% pra produção.

### 1.3 Gap identificado

Comparativo PulsePass × Zig (feito em 2026-05-03) revelou: **o produtor não consegue cadastrar bar, produto, operador ou estoque pela UI** — só via SQL direto. As tabelas existem, parte das rotas de leitura existe, mas:

- Não há rotas REST de mutação para `PointOfSale`, `POSProduct`, `POSOperator`, `StockMovement`.
- Não há tela admin web para nenhuma dessas entidades.
- `ProductCategory` é enum fixo no Prisma (Zig permite categoria livre por evento).
- `POSOperator.userId` é obrigatório (Zig deixa cadastrar bartender freela sem conta).
- `POSOperator.pin` é `VarChar(6)` — não comporta hash bcrypt (~60 chars). O endpoint atual aceita texto puro como fallback. Bug latente de segurança.

Esse gap é o **bloqueador mais imediato** pra qualquer beta com cliente real. Sub-projetos seguintes (monetização, operação, fiscal, comanda pós-paga) assumem que esse cadastro existe.

### 1.4 Escopo deste sub-projeto

CRUDs admin completos (backend + frontend) para:
- Categorias de produto (tabela nova, livre por evento)
- Pontos de venda
- Produtos
- Operadores
- Estoque (operacional: entrada/ajuste/perda + alerta low-stock)

Plus: clone de cardápio entre POSs, upload R2 de foto de produto, Socket.IO push de mudanças de catálogo pro mobile, fix do bug PIN bcrypt.

### 1.5 O que NÃO está neste sub-projeto

| Tema | Sub-projeto futuro |
|---|---|
| Combos / promoções / happy hour / bônus de recarga / caução / taxa de devolução | 2 — Monetização |
| Modificadores de produto (sem gelo, dose dupla) | 2 — Monetização |
| Abertura/fechamento de turno / sangria / comissão por garçom | 3 — Operação |
| Comanda pós-paga / open bar com lista | 4 — Integração lista↔cashless (MOAT) |
| NFCe / impressora Bluetooth Bematech / Sunmi | 5 — Fiscal + hardware |
| Receita/CMV / preço por área | 6 — Diferenciação avançada |
| Import CSV / bulk edit | Sub-projeto 1.5 (cleanup/follow-up) — avaliar demanda real após beta |
| Drop do enum `POSProduct.category` legacy | Sub-projeto 1.5 — após 30 dias dual-state validado em produção |
| Drop da coluna `POSOperator.pin` legacy | Sub-projeto 1.5 — após backfill bcrypt validado |

**Sub-projeto 1.5** é uma janela de cleanup técnico, não tem entrega de feature nova. Roda 30 dias após o 1 ir pra produção. Escopo: dropar colunas/enums legacy + qualquer ajuste de bulk se a demanda apareceu.

## 2. Decisões de design (com justificativas)

| # | Tema | Decisão | Por quê |
|---|---|---|---|
| 1 | Categoria de produto | Tabela nova `ProductCategory` por evento (nome, icon, color, sortOrder) | Padrão da indústria (Zig/AZList), enum fixo limita o produtor |
| 2 | Estoque | Operacional — entrada/ajuste/perda + histórico + alerta low-stock | Justifica `StockMovement` que já existe; suficiente pra bar real sem virar ERP |
| 3 | Operador | Híbrido — `userId` opcional, `name` opcional, PIN sempre bcrypt, login por POS+PIN | Bartender freela sem conta no PulsePass; rastreabilidade quando há User; bug bcrypt corrigido |
| 4 | Permissões | `requireOrganizationRole('finance'|'admin'|'owner')` — staff fora | Aproveita gap 4.1 da auditoria; staff opera POS no mobile, não cadastra |
| 5 | Foto | Upload R2 direto + sharp resize 800x800 q85 + strip EXIF | R2 já configurado em env; bar tem 50-100 produtos, colar URL é inviável |
| 6 | Bulk | Clonar cardápio entre POSs | Caso real mais comum (mesmo cardápio em vários bares); CSV/bulk edit deixa pra depois |
| 7 | Sync mobile | Socket.IO push (`catalog:updated`) + polling 5min fallback | Aproveita Socket.IO já wireado; consistência tempo real; UX que Zig tem |
| 8 | Organização do código | Submódulos dentro de `cashless/` (categories/, pos/, products/, operators/, stock/) | Modularidade real, espelha padrão de `events/`; mantém coesão (POS sem cashless não faz sentido) |

### 2.1 Roles que podem mexer no admin (hierarquia)

`requireOrganizationRole` é hierárquico — passar role mínimo aceita roles maiores:
- **`viewer`** (qualquer membro) — todos os GETs
- **`operator`** — pode criar `StockMovement` (ajuste de estoque por operador de chão)
- **`finance`** — CRUD de categories e products (controle financeiro do cardápio)
- **`admin`** — CRUD de POS e operators, archive de tudo
- **`owner`** — passa em tudo automaticamente
- Admin global da plataforma (`User.role = 'admin'`) sempre passa

`promoter` e `staff` não entram no admin (operam POS no app mobile via PIN).

### 2.2 Anti-IDOR (validação de scope)

`requireOrganizationRole` valida que o usuário pertence à org, mas não valida que `:productId`/`:posId`/etc realmente pertence àquela org. Cada service faz `assertXxxBelongsToOrg(id, organizationId)` na primeira linha. Mismatch retorna **404 (não 403)** pra não vazar existência.

## 3. Mudanças de schema (Prisma)

### 3.1 Tabela nova: `ProductCategory`

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

Adicionar `productCategories ProductCategory[]` na relação inversa em `Event`.

### 3.2 Mudanças em `POSProduct`

```prisma
model POSProduct {
  // ... campos existentes ...
  categoryId          String?  @map("category_id") @db.Uuid    // NOVO — FK pra ProductCategory
  category            ProductCategory @enum                    // MANTIDO — dual-write até sub-projeto 1.5
  lowStockThreshold   Int?     @map("low_stock_threshold")    // NOVO
  isArchived          Boolean  @default(false) @map("is_archived") // NOVO — soft delete
  archivedAt          DateTime? @map("archived_at") @db.Timestamptz

  productCategory     ProductCategory? @relation(fields: [categoryId], references: [id])
  // ...
}
```

### 3.3 Mudanças em `POSOperator`

```prisma
model POSOperator {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  posId         String    @map("pos_id") @db.Uuid
  userId        String?   @map("user_id") @db.Uuid          // MUDOU — opcional
  name          String?   @db.VarChar(255)                  // NOVO — operador leve
  cpf           String?   @db.VarChar(14)                   // NOVO — opcional
  pin           String    @db.VarChar(6)                    // DEPRECATED — mantém pra rollback
  pinHash       String?   @map("pin_hash") @db.VarChar(255) // NOVO — bcrypt; vira NOT NULL no sub-projeto 1.5
  isActive      Boolean   @default(true) @map("is_active")
  isArchived    Boolean   @default(false) @map("is_archived")
  archivedAt    DateTime? @map("archived_at") @db.Timestamptz
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz

  pos  PointOfSale @relation(fields: [posId], references: [id], onDelete: Cascade)
  user User?       @relation(fields: [userId], references: [id])

  // Remove @@unique([posId, userId]) — userId virou opcional
  @@index([posId, isActive])
  @@map("pos_operators")
}
```

Validação no service: dentro de um POS, `name` OU `userId` deve estar preenchido. PIN é único por POS (`assertPinUniqueInPos`).

### 3.4 Mudanças em `PointOfSale`

```prisma
model PointOfSale {
  // ... campos existentes ...
  isArchived    Boolean  @default(false) @map("is_archived")  // NOVO
  archivedAt    DateTime? @map("archived_at") @db.Timestamptz
}
```

### 3.5 `StockMovement` — sem mudança de schema

Tabela já adequada. Falta só rotas + UI.

### 3.6 Migrations

- **Migration A** (`20260503100000_cashless_admin_setup`): cria `product_categories`, adiciona colunas novas. Tudo nullable. Zero-downtime.
- **Backfill** `scripts/backfill-cashless-admin.ts` (idempotente, `--apply` flag, padrão de `backfill-organizations.ts`):
  - Pra cada Event com produtos: cria 1 `ProductCategory` por enum em uso, popula `POSProduct.categoryId`
  - Pra cada `POSOperator` com `pin` text: gera `pinHash = bcrypt.hash(pin, 10)`

## 4. Rotas REST

Padrão de path: `/cashless/orgs/:organizationId/...` (necessário porque `requireOrganizationRole` extrai `organizationId` de `params/query/body`). Dentro, scope por evento via `events/:eventId/...` quando necessário.

### 4.1 Categorias

| Método | Path | Role mínimo |
|---|---|---|
| GET | `/cashless/orgs/:organizationId/events/:eventId/categories` | viewer |
| POST | `/cashless/orgs/:organizationId/events/:eventId/categories` | finance |
| PATCH | `/cashless/orgs/:organizationId/categories/:categoryId` | finance |
| DELETE | `/cashless/orgs/:organizationId/categories/:categoryId` | admin |
| PATCH | `/cashless/orgs/:organizationId/events/:eventId/categories/reorder` | finance |

`DELETE` faz soft-archive; rejeita se há produtos ativos vinculados (force=true via query string permite mover produtos pra "Sem categoria").

`reorder` body: `[{id, sortOrder}]`. Atualiza em transação.

### 4.2 Pontos de venda

| Método | Path | Role |
|---|---|---|
| GET | `/cashless/orgs/:organizationId/events/:eventId/pos` | viewer |
| POST | `/cashless/orgs/:organizationId/events/:eventId/pos` | admin |
| PATCH | `/cashless/orgs/:organizationId/pos/:posId` | admin |
| DELETE | `/cashless/orgs/:organizationId/pos/:posId` | admin |

`DELETE` soft-archive; bloqueia se há `CashlessTransaction` nas últimas 24h (proteção contra perder relatórios em andamento).

### 4.3 Produtos

| Método | Path | Role |
|---|---|---|
| GET | `/cashless/orgs/:organizationId/events/:eventId/products` (?posId=&categoryId=&isAvailable=) | viewer |
| POST | `/cashless/orgs/:organizationId/pos/:posId/products` | finance |
| PATCH | `/cashless/orgs/:organizationId/products/:productId` | finance |
| DELETE | `/cashless/orgs/:organizationId/products/:productId` | admin |
| POST | `/cashless/orgs/:organizationId/products/:productId/image` | finance |
| DELETE | `/cashless/orgs/:organizationId/products/:productId/image` | finance |
| POST | `/cashless/orgs/:organizationId/pos/:posId/products/clone-from/:sourcePosId` | admin |

Image upload: multipart, max 5MB, sharp resize 800x800 cover JPEG q85, strip EXIF, R2 put, retorna `imageUrl`. Idempotência por hash do conteúdo (evita duplicar no R2).

Clone: copia produtos ativos do `sourcePosId`. Reseta `stockQty/soldQty`. Idempotente por nome (pula colisão; `?overwrite=true` força replace). Retorna `{ created, skipped, overwritten }`.

### 4.4 Operadores

| Método | Path | Role |
|---|---|---|
| GET | `/cashless/orgs/:organizationId/pos/:posId/operators` | viewer |
| POST | `/cashless/orgs/:organizationId/pos/:posId/operators` | admin |
| PATCH | `/cashless/orgs/:organizationId/operators/:operatorId` | admin |
| PATCH | `/cashless/orgs/:organizationId/operators/:operatorId/reset-pin` | admin |
| DELETE | `/cashless/orgs/:organizationId/operators/:operatorId` | admin |

POST body: `{ name?, cpf?, userId?, pin }`. Validação: `name OR userId` obrigatório. PIN bcrypt(rounds=10) → `pinHash`. Verifica unicidade do PIN dentro do POS (rejeita 409 com `{code: 'PIN_TAKEN'}`).

PATCH não muda PIN. Reset-PIN é endpoint separado pra audit log claro.

### 4.5 Estoque

| Método | Path | Role |
|---|---|---|
| GET | `/cashless/orgs/:organizationId/events/:eventId/stock` | viewer |
| GET | `/cashless/orgs/:organizationId/pos/:posId/stock` | viewer |
| GET | `/cashless/orgs/:organizationId/products/:productId/stock-movements` (cursor pagination) | viewer |
| POST | `/cashless/orgs/:organizationId/products/:productId/stock-movements` | operator |

POST body: `{ type: 'entry'|'adjustment'|'loss', quantity, notes? }`. Atualiza `POSProduct.stockQty` em transação atômica (read-modify-write seguro com `UPDATE ... SET stockQty = stockQty + ?`).

`stock_transfer` fora desse sub-projeto. `sale` continua criado automaticamente em `transaction.service.ts`.

### 4.6 Rotas mobile/POS já existentes

- `GET /cashless/pos/:posId/products` — mantém (consumida pelo mobile)
- `POST /cashless/pos/:posId/operator/login` — **REFATORAR**: só `bcrypt.compare(pin, op.pinHash)`. Remove fallback texto puro. Após backfill, todo operador tem `pinHash`.
- `GET /cashless/wallet/by-code/:code` — mantém

## 5. Socket.IO

### 5.1 Rooms (handlers novos em `server.ts`)

```ts
io.on('connection', (socket) => {
  socket.on('pos:join', ({ posId }) => {
    if (typeof posId === 'string' && /^[0-9a-f-]{36}$/i.test(posId)) {
      socket.join(`pos:${posId}`);
    }
  });
  socket.on('org:join', ({ organizationId }) => {
    if (typeof organizationId === 'string' && /^[0-9a-f-]{36}$/i.test(organizationId)) {
      socket.join(`org:${organizationId}`);
    }
  });
});
```

Auth no socket já é validada no handshake (`server.ts:35` — RS256 JWT). Nada novo de auth precisa entrar.

### 5.2 Eventos emitidos

Via `publishBroadcast(room, event, data)` (Redis pub/sub, `shared/socketBridge.ts`).

| Evento | Room | Trigger |
|---|---|---|
| `catalog:updated` | `pos:${posId}` | POST/PATCH/DELETE em product/category daquele POS, criar/editar operator, clone-from com POS como destino |
| `stock:low` | `pos:${posId}` + `org:${organizationId}` | `StockMovement` deixa `qty < lowStockThreshold && qty > 0` |
| `stock:out` | `pos:${posId}` + `org:${organizationId}` | `qty == 0` → produto auto `isAvailable=false` |

Mobile escuta `catalog:updated` → refaz GET de products. Polling fallback de 5min se socket cair.

### 5.3 Mudança em `transaction.service.ts` (existente)

Após registrar movimento `sale` em compra, checar `stockQty` resultante:
- `stockQty <= lowStockThreshold && stockQty > 0` → `emitStockLow`
- `stockQty == 0` → `emitStockOut` + `UPDATE pos_products SET is_available = false WHERE id = ?`

Mudança ~15 linhas, preserva fluxo existente.

## 6. Audit log

Adicionar em `shared/audit.ts → AuditActions`:

```ts
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

Toda mutação chama `logAudit({ actorId, action, entityType, entityId, metadata })` no service layer.

## 7. Organização de arquivos

```
ticketeria-api/src/modules/cashless/
├── (arquivos existentes intocados, exceto transaction.service.ts)
├── categories/
│   ├── categories.service.ts
│   ├── categories.router.ts
│   ├── categories.validators.ts
│   └── __tests__/categories.service.test.ts
├── pos/
│   ├── pos.service.ts
│   ├── pos.router.ts
│   ├── pos.validators.ts
│   └── __tests__/pos.service.test.ts
├── products/
│   ├── products.service.ts
│   ├── products.router.ts
│   ├── products.validators.ts
│   └── __tests__/products.service.test.ts
├── operators/
│   ├── operators.service.ts
│   ├── operators.router.ts
│   ├── operators.validators.ts
│   └── __tests__/operators.service.test.ts
├── stock/
│   ├── stock.service.ts
│   ├── stock.router.ts
│   ├── stock.validators.ts
│   └── __tests__/stock.service.test.ts
└── shared/
    ├── orgScope.ts        # assertXxxBelongsToOrg helpers
    └── catalogEvents.ts   # emitCatalogUpdated/StockLow/StockOut wrappers
```

Plus shared global novo:
```
ticketeria-api/src/shared/storage/
├── r2.ts                  # S3-compatible client (Cloudflare R2), singleton
└── imageProcessor.ts      # sharp wrapper: processProductImage(buffer)
```

Wiring em `cashless.router.ts` raiz:
```ts
router.use('/orgs', categoriesRouter);
router.use('/orgs', posRouter);
router.use('/orgs', productsRouter);
router.use('/orgs', operatorsRouter);
router.use('/orgs', stockRouter);
```

Cada sub-router declara seus paths completos com `:organizationId` no início.

### 7.1 Padrões de cada submódulo

- **Service** — lógica pura, params validados, retorna data, chama `logAudit()` e `catalogEvents.emit()` quando aplicável, faz `assertXxxBelongsToOrg()` na primeira linha. Padrão de `OrganizationsService`.
- **Router** — só compõe `authenticate + requireOrganizationRole(role) + validate(schemas) + asyncHandler(controller)`. Padrão idêntico a `organizations.router.ts`.
- **Validators** — schemas Zod. Naming: `createXxxSchema`, `updateXxxSchema`, `xxxIdParamSchema`.

## 8. Frontend web (admin)

### 8.1 Estrutura

```
ticketeria-web/src/features/admin/cashless/
├── AdminCashlessHubPage.tsx        # hub: cards "POS", "Produtos", "Categorias", "Operadores", "Estoque"
├── pos/AdminPosPage.tsx
├── categories/AdminCategoriesPage.tsx       # CRUD + drag-and-drop reorder via @dnd-kit/core
├── products/
│   ├── AdminProductsPage.tsx                # tabela + filtros (POS, categoria, available)
│   ├── ProductFormDrawer.tsx                # criar/editar (nome, preço, categoria, foto, estoque, threshold)
│   └── CloneCatalogDialog.tsx               # modal "copiar de outro POS"
├── operators/AdminOperatorsPage.tsx          # CRUD + reset PIN
└── stock/
    ├── AdminStockOverviewPage.tsx           # produto×POS×qty×status
    └── StockMovementsDrawer.tsx             # histórico + form entry/adjustment/loss
```

### 8.2 Rotas em `app/router.tsx`

```ts
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless', element: adminWrap(<AdminCashlessHubPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/pos', element: adminWrap(<AdminPosPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/categories', element: adminWrap(<AdminCategoriesPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/products', element: adminWrap(<AdminProductsPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/operators', element: adminWrap(<AdminOperatorsPage />) },
{ path: '/admin/orgs/:organizationId/events/:eventId/cashless/stock', element: adminWrap(<AdminStockOverviewPage />) },
```

### 8.3 Padrão de implementação

- React Query (`useQuery`/`useMutation`) — padrão de `AdminBrandingPage.tsx`
- Helper `api()` local em cada arquivo (mesma assinatura usada em todas as telas admin atuais)
- `useToastStore` pra feedback, `useTranslation` pra i18n
- Componentes de `@shared/ui/*` (Button, Input, Spinner)
- Drawer = `<dialog>` HTML5 + CSS (zero dep, padrão atual)
- Drag-and-drop = `@dnd-kit/core` (dep nova)
- Upload de foto = `<input type="file">` + `FormData` + POST direto. Preview via `URL.createObjectURL`.

### 8.4 Integração com hub atual

Adicionar entrada "Cashless" na navegação interna do evento. Local exato a confirmar na implementação lendo `AdminEvents.tsx` e estrutura de tabs/sidebar do admin atual — ajuste pequeno (~10 linhas), não bloqueia o resto. Se a navegação por evento ainda não existe (admin atual é mais org-scoped), criar uma sub-nav simples no topo do `AdminCashlessHubPage` mostrando event name + breadcrumb pra `/admin/orgs/:organizationId`.

## 9. Mobile

### 9.1 Sync via Socket.IO

- **Dep nova:** `socket.io-client` em `ticketeria-mobile/package.json`
- **Arquivo novo:** `ticketeria-mobile/src/lib/socket.ts`
  - `getSocket()` singleton (auth via JWT no handshake)
  - `joinPos(posId)` → emite `pos:join`
  - `onCatalogUpdated(cb)` / `offCatalogUpdated(cb)` listener wrappers
- **Mudanças em `CashlessPOSScreen.tsx`:**
  - No login do operador: `joinPos(posId)`
  - Após mount: `onCatalogUpdated(() => refetch products)`
  - Cleanup no unmount
  - Polling fallback `setInterval(refetch, 5*60*1000)` se `socket.connected === false`

## 10. Storage R2

Novo serviço compartilhado, primeira utilização em image upload de produto.

**`shared/storage/r2.ts`:**
- Singleton `S3Client` configurado pra Cloudflare R2 (endpoint `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`)
- `uploadObject(key, body, contentType): Promise<string>` retorna URL pública (`${R2_PUBLIC_URL}/${key}`)
- `deleteObject(key): Promise<void>`

**`shared/storage/imageProcessor.ts`:**
- `processProductImage(buffer): Promise<{buffer, contentType: 'image/jpeg'}>` — sharp resize 800x800 cover, JPEG q85, strip EXIF
- Lança `BadRequestError` se input não é imagem válida

**Deps novas em `ticketeria-api/package.json`:**
- `@aws-sdk/client-s3`
- `multer`
- `sharp`
- `@types/multer` (dev)

Validação no router: max 5MB, mimetype `image/jpeg|image/png|image/webp`. Idempotência por hash do conteúdo (chave R2 = `products/${productId}/${sha256(buffer).slice(0,16)}.jpg`).

## 11. Testes

### 11.1 Unit (Vitest, mock Prisma)

| Suite | Cobertura mínima |
|---|---|
| `categories.service.test.ts` | criar/editar/arquivar happy path, rejeita arquivar com produtos ativos, scope-mismatch → 404, reorder em transação |
| `pos.service.test.ts` | CRUD, bloqueio de archive com transação <24h |
| `products.service.test.ts` | CRUD, scope, image upload (mock R2 client), clone idempotente |
| `operators.service.test.ts` | CRUD, PIN bcrypt, validação `name OR userId`, PIN único por POS |
| `stock.service.test.ts` | entry/adjustment/loss, low/out emit chamado, atomicidade |

Cobertura alvo: **80%+** por service novo (espelha padrão da auditoria).

### 11.2 Integração

`tests/integration/cashless-admin-flow.test.ts` — fluxo end-to-end:
1. Criar POS
2. Criar categoria
3. Criar produto vinculado à categoria, com foto (R2 mockado)
4. Dar entrada de estoque (50 unidades)
5. Fazer venda (debita 1)
6. Verificar `stockQty=49`, sem evento `stock:low`
7. Repetir vendas até cruzar threshold → verificar `stock:low` emitido
8. Esgotar → verificar `stock:out` emitido + `isAvailable=false`

## 12. Rollout

1. **Migration A** — Prisma migrate dev/prod (zero-downtime, tudo nullable)
2. **Backfill** — `npx tsx scripts/backfill-cashless-admin.ts --apply` (idempotente)
3. **Deploy do código novo** — endpoints antigos continuam respondendo
4. **Validação manual em staging** — criar POS, cardápio, operador, fazer venda fim-a-fim
5. **Telas web vão pra produção** após validação
6. **Update do app mobile** — `npm run build:eas` (Socket.IO + polling fallback)

## 13. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Backfill bcrypt em base grande de operadores trava | Script com batch de 100, sleep 100ms entre batches |
| Upload R2 falha durante alta demanda | Try/catch, retorna 503 com retry-after; produto fica sem foto até retry manual |
| Socket.IO disconnect em rede ruim do bar | Polling fallback de 5min já cobre |
| Conflito de `(eventId, name)` em ProductCategory ao backfill | Backfill cria categorias com nome "Categoria: <enum>"; produtor renomeia depois |
| Produto vendido enquanto admin edita preço | Race aceitável; preço aplicado é o do snapshot da transação (já é o caso hoje) |
| Operador esquece PIN no meio do evento | Endpoint reset-pin é admin-only; supervisor reseta na hora |

## 14. Critérios de sucesso

- [ ] Produtor cria evento → cria 2 POS → cria 5 categorias → cria 30 produtos → cria 4 operadores → tudo via UI web sem tocar SQL
- [ ] Bartender abre app → digita PIN → vê catálogo → vende → estoque decrementa → admin vê em tempo real
- [ ] Admin clica "clonar Bar Central pro Bar VIP" → 30 produtos aparecem no Bar VIP em < 2s
- [ ] Admin altera preço da cerveja → app POS atualiza em < 5s sem refresh manual
- [ ] Estoque chega a threshold → notificação no admin web; chega a 0 → produto some do app POS automaticamente
- [ ] Cobertura de testes ≥ 80% nos services novos
- [ ] Zero regressão nos fluxos existentes (cashless transactional, ledger, push, NFC, offline queue)

## 15. Próximos passos (após este sub-projeto)

Sub-projeto 2 — Monetização (combos, bônus de recarga, taxa de devolução, modificadores, caução).

Spec do sub-projeto 2 vai exigir um novo brainstorming.
