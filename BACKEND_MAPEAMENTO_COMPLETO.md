# TICKETERIA DIGITAL - Mapeamento Completo do Backend

## Documento Técnico v2.0 — Abril 2026

**Objetivo:** Mapear 100% do backend existente, identificar o que está completo, e definir os novos módulos inspirados no AZLIST (gestão de listas/promoters) e Zig Pay (cashless/bar/PDV) para construir a ticketeria digital mais completa do Brasil.

---

## PARTE 1: ESTADO ATUAL DO BACKEND

### 1.1 Visão Geral da Arquitetura

```
ticketeria-api/
├── src/
│   ├── app.ts                      ✅ COMPLETO - Express + middleware chain
│   ├── server.ts                   ✅ COMPLETO - HTTP + Socket.IO + graceful shutdown
│   ├── config/                     ✅ COMPLETO - 6 arquivos de configuração
│   ├── middleware/                  ✅ COMPLETO - 7 middlewares de segurança
│   ├── jobs/                       ✅ COMPLETO - 7 workers BullMQ
│   ├── modules/                    ✅ 15 módulos implementados
│   └── shared/                     ✅ Errors, logger, pagination, audit, crypto
├── prisma/
│   ├── schema.prisma               ✅ COMPLETO - 17 models, 10 enums
│   └── seed.ts                     ✅ COMPLETO
└── package.json                    ✅ COMPLETO
```

### 1.2 Módulos Existentes — Status Detalhado

| # | Módulo | Arquivos | Status | Endpoints | Observações |
|---|--------|----------|--------|-----------|-------------|
| 1 | **auth** | router, controller, service, validators | ✅ COMPLETO | 10 endpoints | JWT + 2FA TOTP + email verify + password reset |
| 2 | **events** | router, controller, service, validators, publishing.service, search.service | ✅ COMPLETO | 10 endpoints | CRUD + busca geo + trending + recomendações |
| 3 | **tickets** | router, controller, service, validators | ✅ COMPLETO | 7 endpoints | QR TOTP dinâmico + transferência + validação |
| 4 | **payments** | router, controller, service, validators, checkout.service, risk.service, webhook.controller, webhook.service | ✅ COMPLETO | 2 endpoints | Asaas + split + 3DS + risk scoring |
| 5 | **orders** | router, controller, service, validators | ✅ COMPLETO | 3 endpoints | Listagem cursor + cancelamento |
| 6 | **checkin** | router, controller, service, validators | ✅ COMPLETO | 3 endpoints | TOTP verify + capacidade + sync offline |
| 7 | **producers** | router, controller, service, validators, onboarding.service, finance.service | ✅ COMPLETO | 6 endpoints | Onboarding Asaas + financeiro + saque |
| 8 | **users** | router, controller, service, validators | ✅ COMPLETO | 5 endpoints | Perfil + LGPD (export/delete) |
| 9 | **admin** | router, controller, service, validators | ✅ COMPLETO | 4 endpoints | Dashboard + moderação + gestão |
| 10 | **reports** | router, controller, service, validators | ✅ COMPLETO | 4 endpoints | Vendas + checkin + financeiro + CSV export |
| 11 | **affiliates** | router, controller, service, validators | ✅ COMPLETO | 3 endpoints | Links + dashboard + tracking |
| 12 | **favorites** | router, controller, service, validators | ✅ COMPLETO | 3 endpoints | Toggle + listagem + check |
| 13 | **live** | router, controller, service | ✅ COMPLETO | 4 endpoints | Social proof + viewers + stats real-time |
| 14 | **notifications** | email.service, push.service | ⚠️ PARCIAL | Workers BullMQ | Email COMPLETO, Push STUB (falta FCM) |
| 15 | **coupons** | (dentro de events/payments) | ✅ COMPLETO | Validação no checkout | CRUD básico, desconto fixo/percentual |

### 1.3 Middleware Stack — 100% Implementado

| Middleware | Função | Status |
|-----------|--------|--------|
| `auth.ts` | JWT + role-based + optional auth | ✅ |
| `rateLimiter.ts` | Global: 100 req/min, Auth: 5/15min, Checkout: 10/15min | ✅ |
| `advancedRateLimiter.ts` | Anti-fraude: CPF, device, cartão, IP burst | ✅ |
| `flashSaleQueue.ts` | Fila virtual para flash sales com posição | ✅ |
| `idempotency.ts` | Redis-backed X-Idempotency-Key | ✅ |
| `validate.ts` | Zod schema validation body/query/params | ✅ |
| `requestId.ts` | UUID de rastreamento por request | ✅ |

### 1.4 Workers BullMQ — 7 Implementados

| Worker | CRON | Status | Função |
|--------|------|--------|--------|
| `email.worker.ts` | On demand | ✅ | Templates: welcome, order, transfer, reminder, refund |
| `expire-reservations.worker.ts` | A cada 1 min | ✅ | Expira orders pendentes, devolve estoque |
| `batch-schedule.worker.ts` | A cada 5 min | ✅ | Abre/fecha lotes por horário |
| `batch-auto-switch.worker.ts` | On demand | ✅ | Lote esgotado → ativa próximo |
| `emit-tickets.worker.ts` | On demand | ✅ | Gera hash + TOTP + emite ingressos |
| `capacity-alert.worker.ts` | On demand | ✅ | Alertas: 80%, 95%, 100% capacidade |
| `post-event-review.worker.ts` | Diário | ✅ | E-mail pedindo avaliação 24h pós-evento |

### 1.5 Schema Prisma — 17 Models Existentes

```
User, Producer, Event, TicketBatch, Order, Ticket, TicketTransfer,
CheckinLog, AffiliateLink, Coupon, EventReview, Favorite,
Notification, AuditLog, PaymentSplit, GuestList, EventMedia
```

### 1.6 TODOs Pendentes no Código Existente

| Local | TODO | Impacto |
|-------|------|---------|
| `server.ts` | Verificação JWT no Socket.IO | Médio - conexões WebSocket sem auth |
| `batch-schedule.worker.ts` | Emitir Socket.IO batch:switched | Baixo - funciona, falta real-time |
| `batch-auto-switch.worker.ts` | Broadcast Socket.IO + notificar favoritos | Baixo |
| `capacity-alert.worker.ts` | 3 TODOs: Socket.IO alerts + email equipe | Médio |
| `push.service.ts` | Integrar Firebase Cloud Messaging | Alto - push notifications inexistentes |

---

## PARTE 2: NOVOS MÓDULOS — INSPIRADOS NO AZLIST

### O que é o AZLIST?

O AZLIST (azlist.com.br) é a principal plataforma brasileira de gestão de listas de convidados para casas noturnas e eventos. Funcionalidades mapeadas que precisamos implementar **10x melhor**:

- Gestão de listas de convidados (nome na lista, VIP, free, backstage, press)
- Promoters com links individuais para compartilhar listas
- Check-in específico de lista (separado do check-in de ingressos)
- Relatórios de performance por promoter
- Auto-cadastro: convidado coloca o próprio nome na lista via link
- Listas segmentadas por tipo (free até X hora, desconto, VIP)
- Painel do promoter com ranking e métricas

### 2.1 Módulo: `guest-lists` (AZLIST 10x Melhor)

**Conceito:** Sistema completo de gestão de listas de convidados que vai muito além do AZLIST — com promoters inteligentes, auto-cadastro com validação, segmentação dinâmica e integração com todo o ecossistema de ingressos.

#### 2.1.1 Novas Tabelas Prisma

```prisma
// ============================================
// AZLIST 10x — GUEST LISTS AVANÇADO
// ============================================

enum GuestListStatus {
  active
  closed
  archived
}

enum GuestEntryStatus {
  pending        // Aguardando aprovação
  confirmed      // Confirmado na lista
  checked_in     // Já entrou no evento
  rejected       // Rejeitado pelo produtor
  no_show        // Confirmou mas não apareceu
}

enum PromoterTier {
  bronze
  silver
  gold
  platinum
  diamond
}

model GuestListConfig {
  id                  String          @id @default(uuid()) @db.Uuid
  eventId             String          @unique @map("event_id") @db.Uuid
  maxGuestsTotal      Int             @map("max_guests_total")
  maxGuestsPerPromoter Int?           @map("max_guests_per_promoter")
  maxPlusOnes         Int             @default(1) @map("max_plus_ones")
  requiresCpf         Boolean         @default(true) @map("requires_cpf")
  requiresPhone       Boolean         @default(false) @map("requires_phone")
  autoApprove         Boolean         @default(true) @map("auto_approve")
  closesAt            DateTime?       @map("closes_at") @db.Timestamptz
  freeUntilHour       String?         @map("free_until_hour")  // "23:00"
  discountPercent     Decimal?        @map("discount_percent") @db.Decimal(5,2)
  discountUntilHour   String?         @map("discount_until_hour") // "00:00"
  welcomeMessage      String?         @map("welcome_message") @db.Text
  status              GuestListStatus @default(active)
  createdAt           DateTime        @default(now()) @map("created_at") @db.Timestamptz

  event       Event        @relation(fields: [eventId], references: [id])
  entries     GuestEntry[]
  promoters   PromoterAssignment[]

  @@map("guest_list_configs")
}

model Promoter {
  id              String       @id @default(uuid()) @db.Uuid
  userId          String       @map("user_id") @db.Uuid
  displayName     String       @map("display_name") @db.VarChar(100)
  slug            String       @unique @db.VarChar(100) // URL amigável
  instagram       String?      @db.VarChar(100)
  whatsapp        String?      @db.VarChar(20)
  tier            PromoterTier @default(bronze)
  totalGuests     Int          @default(0) @map("total_guests")
  totalCheckins   Int          @default(0) @map("total_checkins")
  conversionRate  Decimal      @default(0) @map("conversion_rate") @db.Decimal(5,2)
  score           Int          @default(0) // Pontuação gamificada
  isActive        Boolean      @default(true) @map("is_active")
  createdAt       DateTime     @default(now()) @map("created_at") @db.Timestamptz

  user         User                @relation(fields: [userId], references: [id])
  assignments  PromoterAssignment[]
  entries      GuestEntry[]

  @@map("promoters")
}

model PromoterAssignment {
  id              String   @id @default(uuid()) @db.Uuid
  promoterId      String   @map("promoter_id") @db.Uuid
  guestListId     String   @map("guest_list_id") @db.Uuid
  maxGuests       Int?     @map("max_guests") // Limite individual
  shareLink       String   @unique @map("share_link") @db.VarChar(100)
  qrCodeUrl       String?  @map("qr_code_url") @db.VarChar(500)
  guestCount      Int      @default(0) @map("guest_count")
  checkinCount    Int      @default(0) @map("checkin_count")
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  promoter    Promoter         @relation(fields: [promoterId], references: [id])
  guestList   GuestListConfig  @relation(fields: [guestListId], references: [id])
  entries     GuestEntry[]

  @@unique([promoterId, guestListId])
  @@map("promoter_assignments")
}

model GuestEntry {
  id              String           @id @default(uuid()) @db.Uuid
  guestListId     String           @map("guest_list_id") @db.Uuid
  promoterId      String?          @map("promoter_id") @db.Uuid
  assignmentId    String?          @map("assignment_id") @db.Uuid
  name            String           @db.VarChar(255)
  cpf             String?          @db.VarChar(14)
  phone           String?          @db.VarChar(20)
  email           String?          @db.VarChar(255)
  plusOnes        Int              @default(0) @map("plus_ones")
  plusOnesChecked  Int              @default(0) @map("plus_ones_checked")
  listType        GuestListType    @map("list_type")
  status          GuestEntryStatus @default(pending)
  checkedInAt     DateTime?        @map("checked_in_at") @db.Timestamptz
  checkedInBy     String?          @map("checked_in_by") @db.Uuid
  notes           String?          @db.VarChar(500)
  source          String           @default("manual") @db.VarChar(50) // manual, link, import, api
  createdAt       DateTime         @default(now()) @map("created_at") @db.Timestamptz

  guestList   GuestListConfig     @relation(fields: [guestListId], references: [id])
  promoter    Promoter?            @relation(fields: [promoterId], references: [id])
  assignment  PromoterAssignment?  @relation(fields: [assignmentId], references: [id])

  @@index([guestListId, status])
  @@index([cpf])
  @@map("guest_entries")
}
```

#### 2.1.2 Endpoints da API

```
# Configuração de lista (Produtor)
POST   /api/v1/guest-lists/:eventId/config      — Criar/atualizar config da lista
GET    /api/v1/guest-lists/:eventId/config      — Obter config
PATCH  /api/v1/guest-lists/:eventId/config      — Atualizar (fechar lista, alterar limites)

# Gestão de entries (Produtor)
POST   /api/v1/guest-lists/:eventId/entries       — Adicionar convidado manualmente
POST   /api/v1/guest-lists/:eventId/import        — Import CSV/XLSX em massa
GET    /api/v1/guest-lists/:eventId/entries       — Listar com filtros (status, tipo, promoter)
PATCH  /api/v1/guest-lists/entries/:id            — Aprovar/rejeitar/editar
DELETE /api/v1/guest-lists/entries/:id            — Remover

# Auto-cadastro público (Convidado)
POST   /api/v1/guest-lists/register/:shareLink    — Convidado se cadastra via link do promoter
GET    /api/v1/guest-lists/event/:slug/register   — Página de registro geral do evento

# Promoters (Admin/Produtor)
POST   /api/v1/promoters                          — Cadastrar promoter
GET    /api/v1/promoters                          — Listar promoters
GET    /api/v1/promoters/:id                      — Detalhes com métricas
PATCH  /api/v1/promoters/:id                      — Editar/ativar/desativar
POST   /api/v1/promoters/:id/assign/:eventId      — Atribuir promoter a evento
GET    /api/v1/promoters/:id/events               — Eventos do promoter

# Dashboard do Promoter
GET    /api/v1/promoters/me/dashboard             — Métricas gerais do promoter logado
GET    /api/v1/promoters/me/events                — Eventos atribuídos
GET    /api/v1/promoters/me/events/:eventId/stats — Stats por evento

# Ranking & Gamificação
GET    /api/v1/promoters/ranking                  — Ranking geral de promoters
GET    /api/v1/promoters/ranking/:eventId         — Ranking por evento

# Check-in de lista (Operador)
POST   /api/v1/guest-lists/:eventId/checkin       — Check-in por nome/CPF
GET    /api/v1/guest-lists/:eventId/search        — Busca rápida na lista (autocomplete)
GET    /api/v1/guest-lists/:eventId/stats         — Estatísticas em tempo real

# Relatórios (Produtor)
GET    /api/v1/guest-lists/:eventId/report        — Relatório completo
GET    /api/v1/guest-lists/:eventId/export        — Export CSV/PDF
```

#### 2.1.3 Estrutura de Arquivos

```
src/modules/guest-lists/
├── guest-lists.router.ts
├── guest-lists.controller.ts
├── guest-lists.service.ts
├── guest-lists.validators.ts
├── import.service.ts           // Import CSV/XLSX
├── registration.service.ts     // Auto-cadastro público
└── __tests__/

src/modules/promoters/
├── promoters.router.ts
├── promoters.controller.ts
├── promoters.service.ts
├── promoters.validators.ts
├── ranking.service.ts          // Ranking e gamificação
├── assignment.service.ts       // Atribuição a eventos
└── __tests__/
```

#### 2.1.4 Funcionalidades 10x vs AZLIST

| Feature | AZLIST | Nossa Implementação |
|---------|--------|-------------------|
| Lista básica | Nome na lista via link | + CPF validado + telefone + acompanhantes |
| Promoters | Link único por promoter | + QR Code + slug personalizado + Instagram + WhatsApp share |
| Check-in | Check-in manual | + Busca autocomplete + scanner QR + offline + integrado com ingressos |
| Relatórios | Relatório básico | + Real-time Socket.IO + ranking gamificado + conversão por promoter |
| Segmentação | Free/VIP | + Free até hora X + desconto até hora Y + backstage + press |
| Auto-cadastro | Simples | + Validação CPF + anti-duplicata + confirmação SMS + acompanhantes |
| Gamificação | Não tem | Tiers (bronze→diamond) + score + ranking + badges |
| Import | Não tem | CSV + XLSX + Google Sheets com dedup e validação |
| Integração | Isolado | 100% integrado com ingressos, check-in, financeiro, analytics |
| API pública | Não tem | API REST + webhooks para integrações externas |

---

## PARTE 3: NOVOS MÓDULOS — INSPIRADOS NO ZIG PAY

### O que é o Zig Pay?

O Zig (zig.fun / zigpay.com.br) é a principal plataforma brasileira de cashless e gestão de consumo para eventos ao vivo. Usado no Lollapalooza, Rock in Rio, e milhares de casas noturnas. Funcionalidades mapeadas:

- **Zig Cashless:** Pulseiras/cartões NFC para pagamento sem dinheiro
- **Zig PDV:** POS móvel para bar/restaurante com comanda digital
- **Zig Totem:** Autoatendimento para recarga e pagamento
- **Zig Dashboard:** Gestão de estoque, financeiro, relatórios em tempo real
- **Zig App:** App do consumidor para recarga e controle de gastos
- **Zig Data:** BI com análise de consumo, tendências, previsões

### 3.1 Módulo: `cashless` (Zig Pay 10x Melhor)

**Conceito:** Sistema cashless digital completo que funciona com QR Code no celular (não precisa de pulseira NFC física, mas suporta). O consumidor carrega créditos via PIX/cartão, paga no bar apontando QR do celular ou aproximando pulseira, e o produtor gerencia tudo em tempo real.

#### 3.1.1 Novas Tabelas Prisma

```prisma
// ============================================
// ZIG PAY 10x — CASHLESS / BAR / CONSUMO
// ============================================

enum WalletType {
  digital      // QR no celular
  wristband    // Pulseira NFC
  card         // Cartão NFC
}

enum WalletStatus {
  active
  blocked
  refund_pending
  refunded
  expired
}

enum TransactionType {
  topup           // Recarga
  purchase        // Compra
  refund          // Devolução
  transfer        // Transferência entre wallets
  cashout         // Saque de crédito residual
  courtesy        // Cortesia do produtor
}

enum TransactionStatus {
  completed
  pending
  failed
  reversed
}

enum ProductCategory {
  beer
  drink
  cocktail
  soft_drink
  water
  food
  snack
  merch
  service
  other
}

enum POSType {
  bar           // Bar fixo
  mobile        // Vendedor ambulante
  totem         // Totem autoatendimento
  vip_lounge    // Lounge VIP
  food_truck    // Food truck
  backstage     // Área backstage
}

enum StockMovementType {
  entry         // Entrada de estoque
  sale          // Venda
  loss          // Perda/quebra
  adjustment    // Ajuste manual
  transfer      // Transferência entre pontos
}

// Configuração cashless do evento
model CashlessConfig {
  id                    String   @id @default(uuid()) @db.Uuid
  eventId               String   @unique @map("event_id") @db.Uuid
  isEnabled             Boolean  @default(false) @map("is_enabled")
  minTopup              Int      @default(2000) @map("min_topup")           // R$20 mínimo
  maxTopup              Int      @default(100000) @map("max_topup")         // R$1000 máximo
  maxWalletBalance      Int      @default(200000) @map("max_wallet_balance") // R$2000 máximo
  allowPartialPayment   Boolean  @default(false) @map("allow_partial_payment")
  autoRefundAfterEvent  Boolean  @default(true) @map("auto_refund_after_event")
  refundDeadlineDays    Int      @default(30) @map("refund_deadline_days")
  tipEnabled            Boolean  @default(false) @map("tip_enabled")
  tipOptions            Json     @default("[10, 15, 20]") @map("tip_options") @db.JsonB // percentuais
  serviceChargePercent  Decimal? @map("service_charge_percent") @db.Decimal(5,2)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz

  event   Event @relation(fields: [eventId], references: [id])

  @@map("cashless_configs")
}

// Carteira digital do participante no evento
model CashlessWallet {
  id                String       @id @default(uuid()) @db.Uuid
  eventId           String       @map("event_id") @db.Uuid
  userId            String       @map("user_id") @db.Uuid
  ticketId          String?      @map("ticket_id") @db.Uuid // Vinculado ao ingresso
  walletType        WalletType   @map("wallet_type")
  walletCode        String       @unique @map("wallet_code") @db.VarChar(100) // QR ou NFC ID
  balanceCents      Int          @default(0) @map("balance_cents")
  totalTopupCents   Int          @default(0) @map("total_topup_cents")
  totalSpentCents   Int          @default(0) @map("total_spent_cents")
  status            WalletStatus @default(active)
  nfcTagId          String?      @map("nfc_tag_id") @db.VarChar(100)
  activatedAt       DateTime?    @map("activated_at") @db.Timestamptz
  lastUsedAt        DateTime?    @map("last_used_at") @db.Timestamptz
  createdAt         DateTime     @default(now()) @map("created_at") @db.Timestamptz

  event        Event               @relation(fields: [eventId], references: [id])
  user         User                @relation(fields: [userId], references: [id])
  transactions CashlessTransaction[]

  @@unique([eventId, userId])
  @@index([walletCode])
  @@index([nfcTagId])
  @@map("cashless_wallets")
}

// Transações cashless
model CashlessTransaction {
  id                String            @id @default(uuid()) @db.Uuid
  walletId          String            @map("wallet_id") @db.Uuid
  posId             String?           @map("pos_id") @db.Uuid
  operatorId        String?           @map("operator_id") @db.Uuid
  type              TransactionType
  status            TransactionStatus @default(completed)
  amountCents       Int               @map("amount_cents")
  tipCents          Int               @default(0) @map("tip_cents")
  balanceAfter      Int               @map("balance_after")
  items             Json?             @db.JsonB  // [{productId, qty, price}]
  paymentMethod     PaymentMethod?    @map("payment_method") // Para topups
  asaasPaymentId    String?           @map("asaas_payment_id") @db.VarChar(100)
  metadata          Json?             @db.JsonB
  createdAt         DateTime          @default(now()) @map("created_at") @db.Timestamptz

  wallet    CashlessWallet @relation(fields: [walletId], references: [id])
  pos       PointOfSale?   @relation(fields: [posId], references: [id])

  @@index([walletId, createdAt(sort: Desc)])
  @@index([posId, createdAt(sort: Desc)])
  @@map("cashless_transactions")
}

// Pontos de venda (bar, food truck, ambulante, totem)
model PointOfSale {
  id          String   @id @default(uuid()) @db.Uuid
  eventId     String   @map("event_id") @db.Uuid
  name        String   @db.VarChar(100) // "Bar Principal", "Food Truck Burguer"
  type        POSType
  location    String?  @db.VarChar(255) // Descrição da localização
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  event        Event                @relation(fields: [eventId], references: [id])
  operators    POSOperator[]
  products     POSProduct[]
  transactions CashlessTransaction[]
  stockMovements StockMovement[]

  @@map("points_of_sale")
}

// Operadores vinculados ao POS
model POSOperator {
  id        String   @id @default(uuid()) @db.Uuid
  posId     String   @map("pos_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  pin       String   @db.VarChar(6)  // PIN de acesso rápido
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  pos  PointOfSale @relation(fields: [posId], references: [id])
  user User        @relation(fields: [userId], references: [id])

  @@unique([posId, userId])
  @@map("pos_operators")
}

// Cardápio digital do POS
model POSProduct {
  id            String          @id @default(uuid()) @db.Uuid
  posId         String          @map("pos_id") @db.Uuid
  name          String          @db.VarChar(255)
  description   String?         @db.VarChar(500)
  category      ProductCategory
  priceCents    Int             @map("price_cents")
  imageUrl      String?         @map("image_url") @db.VarChar(500)
  isAvailable   Boolean         @default(true) @map("is_available")
  stockQty      Int?            @map("stock_qty")  // NULL = ilimitado
  soldQty       Int             @default(0) @map("sold_qty")
  sortOrder     Int             @default(0) @map("sort_order")
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz

  pos PointOfSale @relation(fields: [posId], references: [id])

  @@index([posId, category, isAvailable])
  @@map("pos_products")
}

// Controle de estoque
model StockMovement {
  id          String            @id @default(uuid()) @db.Uuid
  posId       String            @map("pos_id") @db.Uuid
  productId   String            @map("product_id") @db.Uuid
  type        StockMovementType
  quantity    Int
  operatorId  String?           @map("operator_id") @db.Uuid
  notes       String?           @db.VarChar(500)
  createdAt   DateTime          @default(now()) @map("created_at") @db.Timestamptz

  pos PointOfSale @relation(fields: [posId], references: [id])

  @@index([posId, productId, createdAt])
  @@map("stock_movements")
}
```

#### 3.1.2 Endpoints da API — Cashless

```
# Configuração (Produtor)
POST   /api/v1/cashless/:eventId/config         — Habilitar/configurar cashless
GET    /api/v1/cashless/:eventId/config         — Obter config
PATCH  /api/v1/cashless/:eventId/config         — Atualizar

# Wallet do consumidor
POST   /api/v1/cashless/wallets                  — Criar wallet (digital ou vincular NFC)
GET    /api/v1/cashless/wallets/me/:eventId      — Minha wallet no evento
POST   /api/v1/cashless/wallets/:id/topup        — Recarregar (PIX/cartão via Asaas)
POST   /api/v1/cashless/wallets/:id/block        — Bloquear (perda/roubo)
POST   /api/v1/cashless/wallets/:id/refund       — Solicitar devolução de crédito
GET    /api/v1/cashless/wallets/:id/transactions  — Extrato de transações
GET    /api/v1/cashless/wallets/:id/balance       — Saldo atual

# Transações / Pagamento no bar (POS)
POST   /api/v1/cashless/transactions/charge      — Cobrar do wallet (POS → scan QR/NFC)
POST   /api/v1/cashless/transactions/reverse     — Estornar transação
GET    /api/v1/cashless/transactions/:id         — Detalhe da transação

# Dashboard cashless (Produtor)
GET    /api/v1/cashless/:eventId/dashboard       — KPIs: total recargas, gastos, saldo retido
GET    /api/v1/cashless/:eventId/transactions    — Todas as transações do evento
GET    /api/v1/cashless/:eventId/top-products    — Produtos mais vendidos
GET    /api/v1/cashless/:eventId/revenue-by-pos  — Faturamento por ponto de venda
GET    /api/v1/cashless/:eventId/hourly-stats    — Consumo por hora (heatmap)
GET    /api/v1/cashless/:eventId/export          — Export relatórios
```

#### 3.1.3 Endpoints da API — POS / Bar / Cardápio

```
# Gestão de POS (Produtor)
POST   /api/v1/pos/:eventId                     — Criar ponto de venda
GET    /api/v1/pos/:eventId                     — Listar POS do evento
PATCH  /api/v1/pos/:id                          — Editar/ativar/desativar
DELETE /api/v1/pos/:id                          — Remover POS

# Operadores (Produtor)
POST   /api/v1/pos/:id/operators                — Adicionar operador
DELETE /api/v1/pos/:id/operators/:userId         — Remover operador

# Cardápio digital (Produtor)
POST   /api/v1/pos/:id/products                 — Adicionar produto
GET    /api/v1/pos/:id/products                 — Listar cardápio
PATCH  /api/v1/pos/products/:id                 — Editar produto
DELETE /api/v1/pos/products/:id                 — Remover produto
PATCH  /api/v1/pos/products/:id/availability    — Marcar disponível/indisponível

# Cardápio público (Consumidor)
GET    /api/v1/pos/:id/menu                     — Ver cardápio público do POS

# Estoque (Produtor)
POST   /api/v1/pos/:id/stock                    — Registrar movimentação
GET    /api/v1/pos/:id/stock                    — Consultar estoque atual
GET    /api/v1/pos/:id/stock/movements          — Histórico de movimentações
GET    /api/v1/pos/:eventId/stock/alerts        — Alertas de estoque baixo
```

#### 3.1.4 Estrutura de Arquivos

```
src/modules/cashless/
├── cashless.router.ts
├── cashless.controller.ts
├── cashless.service.ts
├── cashless.validators.ts
├── wallet.service.ts           // Criação, recarga, bloqueio, devolução
├── transaction.service.ts      // Cobranças, estornos, extrato
├── topup.service.ts            // Integração Asaas para recargas
├── analytics.service.ts        // Dashboard, relatórios, heatmap
└── __tests__/

src/modules/pos/
├── pos.router.ts
├── pos.controller.ts
├── pos.service.ts
├── pos.validators.ts
├── products.service.ts         // Cardápio digital
├── stock.service.ts            // Controle de estoque
├── operator.service.ts         // Gestão de operadores
└── __tests__/
```

#### 3.1.5 Funcionalidades 10x vs Zig Pay

| Feature | Zig Pay | Nossa Implementação |
|---------|---------|-------------------|
| Pagamento | Pulseira NFC obrigatória | QR no celular + pulseira NFC opcional + cartão NFC |
| Recarga | Totems + caixa | PIX instantâneo no app + cartão + totem + caixa |
| POS | Hardware proprietário | App web PWA em qualquer celular/tablet + API para hardware |
| Cardápio | Cardápio no POS | Cardápio digital público (convidado vê no celular) |
| Estoque | Controle básico | Tempo real + alertas automáticos + movimentações auditadas |
| Extrato | No app Zig | Real-time no app + push a cada transação |
| Devolução | Presencial no totem | Automática pós-evento + via app + PIX instantâneo |
| Relatórios | Dashboard Zig | Real-time WebSocket + heatmap horário + análise por POS + export |
| Gorjeta | Não tem | Gorjeta digital com opções configuráveis |
| Integração | Sistema isolado | 100% integrado com ingressos, check-in, wallet do usuário |
| Offline | Funciona offline | Offline + sync automático + fila de transações |
| Multi-evento | Por evento | Wallet do usuário persiste entre eventos (créditos acumulam) |

---

## PARTE 4: MÓDULOS ADICIONAIS DE PRODUÇÃO

### 4.1 Módulo: `staff` (Gestão de Equipe de Produção)

Para ser uma plataforma completa para produtores, precisamos gerenciar toda a equipe do evento.

```
src/modules/staff/
├── staff.router.ts
├── staff.controller.ts
├── staff.service.ts
├── staff.validators.ts
├── schedule.service.ts          // Escalas e turnos
└── __tests__/
```

#### Tabelas

```prisma
enum StaffRole {
  coordinator     // Coordenador geral
  checkin_op      // Operador de check-in
  cashier         // Caixa
  bartender       // Barman
  security        // Segurança
  promoter_op     // Promoter/lista
  vip_host        // Host VIP
  runner          // Runner/apoio
  medic           // Equipe médica
  tech            // Técnico (som/luz)
  custom          // Personalizado
}

model EventStaff {
  id          String    @id @default(uuid()) @db.Uuid
  eventId     String    @map("event_id") @db.Uuid
  userId      String?   @map("user_id") @db.Uuid  // NULL se não tem conta
  name        String    @db.VarChar(255)
  cpf         String?   @db.VarChar(14)
  phone       String?   @db.VarChar(20)
  role        StaffRole
  customRole  String?   @map("custom_role") @db.VarChar(100)
  accessAreas Json      @default("[]") @map("access_areas") @db.JsonB
  shiftStart  DateTime? @map("shift_start") @db.Timestamptz
  shiftEnd    DateTime? @map("shift_end") @db.Timestamptz
  checkedIn   Boolean   @default(false) @map("checked_in")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("event_staff")
}
```

#### Endpoints

```
POST   /api/v1/staff/:eventId              — Adicionar membro da equipe
GET    /api/v1/staff/:eventId              — Listar equipe
PATCH  /api/v1/staff/:id                   — Editar
DELETE /api/v1/staff/:id                   — Remover
POST   /api/v1/staff/:eventId/import       — Import em massa (CSV)
POST   /api/v1/staff/:id/checkin           — Check-in do staff
GET    /api/v1/staff/:eventId/schedule     — Escala completa
GET    /api/v1/staff/:eventId/dashboard    — Status da equipe em tempo real
```

### 4.2 Módulo: `areas` (Gestão de Áreas/Setores do Evento)

Controle de capacidade e acesso por área (pista, VIP, camarote, backstage).

```prisma
model EventArea {
  id            String   @id @default(uuid()) @db.Uuid
  eventId       String   @map("event_id") @db.Uuid
  name          String   @db.VarChar(100) // "Pista", "VIP", "Camarote A"
  capacity      Int
  currentCount  Int      @default(0) @map("current_count")
  batchTypes    Json     @default("[]") @map("batch_types") @db.JsonB // Quais tipos de ingresso acessam
  posIds        Json     @default("[]") @map("pos_ids") @db.JsonB     // POS vinculados à área
  mapCoords     Json?    @map("map_coords") @db.JsonB  // Para mapa interativo
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("event_areas")
}
```

#### Endpoints

```
POST   /api/v1/areas/:eventId              — Criar área
GET    /api/v1/areas/:eventId              — Listar áreas com contagem real-time
PATCH  /api/v1/areas/:id                   — Editar
DELETE /api/v1/areas/:id                   — Remover
GET    /api/v1/areas/:eventId/capacity     — Capacidade por área em tempo real (WebSocket)
POST   /api/v1/areas/:id/count             — Incrementar/decrementar contagem
```

### 4.3 Módulo: `store` (Loja/Upgrades)

Venda de produtos, upgrades de ingresso e extras.

```prisma
enum StoreItemType {
  upgrade        // Upgrade de ingresso (pista → VIP)
  merch          // Merchandising
  parking        // Estacionamento
  locker         // Armário
  fast_lane      // Fila rápida
  meet_greet     // Meet & greet
  after_party    // After party
  food_combo     // Combo alimentação
  cashless_credit // Crédito cashless pré-carregado
}

model StoreItem {
  id           String        @id @default(uuid()) @db.Uuid
  eventId      String        @map("event_id") @db.Uuid
  type         StoreItemType
  name         String        @db.VarChar(255)
  description  String?       @db.Text
  priceCents   Int           @map("price_cents")
  quantity     Int?          // NULL = ilimitado
  soldCount    Int           @default(0) @map("sold_count")
  imageUrl     String?       @map("image_url") @db.VarChar(500)
  isActive     Boolean       @default(true) @map("is_active")
  metadata     Json?         @db.JsonB // Dados extras (ex: de qual lote para qual lote no upgrade)
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("store_items")
}
```

---

## PARTE 5: WEBSOCKET EVENTS — NOVOS

Além dos Socket.IO events existentes, os novos módulos adicionam:

| Evento | Room | Payload | Módulo |
|--------|------|---------|--------|
| `guestlist:entry` | `event:{eventId}` | `{name, promoter, type, plusOnes}` | guest-lists |
| `guestlist:checkin` | `event:{eventId}` | `{name, type, checkedBy, time}` | guest-lists |
| `guestlist:stats` | `event:{eventId}` | `{total, checkedIn, pending, byType}` | guest-lists |
| `promoter:ranking` | `event:{eventId}` | `{rankings: [{name, count, checkins}]}` | promoters |
| `cashless:topup` | `event:{eventId}` | `{amount, method, walletId}` | cashless |
| `cashless:purchase` | `pos:{posId}` | `{items, total, walletCode}` | cashless |
| `cashless:stats` | `event:{eventId}` | `{totalRevenue, avgTicket, topProducts}` | cashless |
| `stock:alert` | `event:{eventId}` | `{posId, productId, currentQty, threshold}` | pos |
| `area:capacity` | `event:{eventId}` | `{areaId, name, current, max, percent}` | areas |
| `staff:status` | `event:{eventId}` | `{totalStaff, checkedIn, byRole}` | staff |

---

## PARTE 6: NOVOS WORKERS BULLMQ

| Worker | CRON | Módulo | Função |
|--------|------|--------|--------|
| `guestlist-close.worker.ts` | A cada 5 min | guest-lists | Fecha listas no horário configurado |
| `guestlist-noshow.worker.ts` | Pós-evento | guest-lists | Marca no-show em convidados não checados |
| `promoter-ranking.worker.ts` | A cada 15 min | promoters | Recalcula ranking e tiers |
| `cashless-refund.worker.ts` | Diário | cashless | Processa devoluções automáticas pós-evento |
| `cashless-settlement.worker.ts` | Diário | cashless | Consolida recebimentos POS → produtor |
| `stock-alert.worker.ts` | A cada 10 min | pos | Alertas de estoque baixo |
| `push-notification.worker.ts` | On demand | notifications | FCM push notifications (completar o TODO) |

---

## PARTE 7: APPS E SUAS APIS

Cada app consome subsets diferentes da API:

| App | Módulos API Consumidos | Auth |
|-----|----------------------|------|
| **Web (consumidor)** | auth, events, tickets, payments, orders, favorites, live, cashless/wallet, store, guest-lists/register | JWT consumer |
| **App Mobile (consumidor)** | Mesmo que web + push notifications + offline tickets | JWT consumer + biometria |
| **App Produtor** | events, tickets, payments, orders, reports, affiliates, guest-lists, promoters, cashless, pos, staff, areas, admin | JWT producer |
| **App Máquina de Vendas (POS)** | cashless/transactions, pos/products, pos/stock | JWT + PIN operador |
| **App Lista (AZLIST killer)** | guest-lists, promoters | JWT promoter + link público |

---

## PARTE 8: PRIORIDADES DE IMPLEMENTAÇÃO

### Fase 1 — Resolver TODOs existentes (1-2 semanas)
1. Push notifications (Firebase Cloud Messaging)
2. Socket.IO JWT verification
3. Socket.IO broadcasts nos workers existentes

### Fase 2 — Módulo Guest Lists / AZLIST (2-3 semanas)
1. Schema Prisma + migrations
2. GuestListConfig CRUD
3. GuestEntry management + import
4. Auto-cadastro público (registration.service)
5. Check-in de lista
6. Relatórios e export

### Fase 3 — Módulo Promoters (1-2 semanas)
1. Cadastro de promoters
2. Assignment a eventos
3. Links e QR codes de compartilhamento
4. Dashboard do promoter
5. Ranking e gamificação

### Fase 4 — Módulo Cashless (3-4 semanas)
1. Schema Prisma + migrations
2. CashlessConfig por evento
3. Wallet creation + topup (Asaas)
4. Transações (cobranças + estornos)
5. Dashboard cashless
6. Devoluções automáticas

### Fase 5 — Módulo POS / Bar (2-3 semanas)
1. Gestão de pontos de venda
2. Cardápio digital
3. Operadores
4. Controle de estoque
5. Relatórios por POS

### Fase 6 — Módulos de Produção (1-2 semanas)
1. Staff management
2. Areas management
3. Store/upgrades

### Fase 7 — Workers e Real-time (1-2 semanas)
1. Novos workers BullMQ
2. Socket.IO events completos
3. Testes de integração

---

## PARTE 9: RESUMO QUANTITATIVO

| Métrica | Existente | Novo | Total |
|---------|-----------|------|-------|
| Módulos | 15 | 6 | **21** |
| Endpoints | ~64 | ~68 | **~132** |
| Models Prisma | 17 | 13 | **30** |
| Enums | 10 | 10 | **20** |
| Workers BullMQ | 7 | 7 | **14** |
| Socket.IO Events | 5 | 10 | **15** |
| Middleware | 7 | 0 | **7** |

---

---

## PARTE 10: LACUNAS CRÍTICAS IDENTIFICADAS — O QUE FALTA PARA SER COMPLETO

Após auditoria comparativa com Sympla, Zig Pay, AZLIST e concorrentes (Bilhete Premium, PowerList, PDV365, Softaliza), identificamos lacunas que **nenhum módulo acima cobre** e que são essenciais para uma plataforma enterprise:

### 10.1 Tipos de Ingresso Especiais (LEI OBRIGATÓRIA)

**Problema:** O sistema atual só tem `BatchType: regular | vip | backstage | camarote`. Faltam tipos legalmente obrigatórios no Brasil.

```prisma
// ADICIONAR ao TicketBatch ou como configuração separada
enum TicketPriceType {
  inteira         // Preço cheio
  meia_estudante  // 50% - Lei 12.933/2013 (Carteira estudantil)
  meia_idoso      // 50% - Estatuto do Idoso (60+)
  meia_pcd        // 50% - Pessoa com deficiência
  meia_jovem      // 50% - ID Jovem (15-29 anos baixa renda)
  meia_social     // 50% - Programas sociais (CadÚnico)
  cortesia        // 100% desconto - Convite do produtor
  promocional     // Preço especial/customizado
  crianca         // Regra customizável (grátis até X anos, meia, etc.)
}

model TicketPriceRule {
  id            String         @id @default(uuid()) @db.Uuid
  batchId       String         @map("batch_id") @db.Uuid
  priceType     TicketPriceType @map("price_type")
  priceCents    Int            @map("price_cents")
  quantity      Int?           // NULL = proporcional ao lote (até 40% do total = lei)
  soldCount     Int            @default(0) @map("sold_count")
  requiresDoc   Boolean        @default(true) @map("requires_doc") // Exige doc na portaria
  isActive      Boolean        @default(true) @map("is_active")
  createdAt     DateTime       @default(now()) @map("created_at") @db.Timestamptz

  batch TicketBatch @relation(fields: [batchId], references: [id])

  @@map("ticket_price_rules")
}
```

**Endpoints necessários:**
```
POST   /api/v1/batches/:batchId/price-rules     — Configurar regras de preço (meia, cortesia)
GET    /api/v1/batches/:batchId/price-rules     — Listar regras
PATCH  /api/v1/price-rules/:id                  — Editar
DELETE /api/v1/price-rules/:id                  — Remover
```

### 10.2 Sistema de Cortesias

**Problema:** O modelo `GuestList` atual é muito básico. Cortesias são diferentes de lista de convidados — envolvem geração de ingresso real (gratuito) com controle de quem autorizou.

```prisma
enum CourtesyStatus {
  pending       // Solicitada
  approved      // Aprovada pelo produtor
  issued        // Ingresso emitido
  used          // Check-in feito
  expired       // Não usada
  revoked       // Cancelada
}

model Courtesy {
  id            String          @id @default(uuid()) @db.Uuid
  eventId       String          @map("event_id") @db.Uuid
  batchId       String?         @map("batch_id") @db.Uuid // Qual lote (VIP, pista, etc.)
  requestedBy   String          @map("requested_by") @db.Uuid // Quem solicitou
  approvedBy    String?         @map("approved_by") @db.Uuid // Quem aprovou
  recipientName String          @map("recipient_name") @db.VarChar(255)
  recipientCpf  String?         @map("recipient_cpf") @db.VarChar(14)
  recipientEmail String?        @map("recipient_email") @db.VarChar(255)
  reason        String?         @db.VarChar(500) // Motivo da cortesia
  status        CourtesyStatus  @default(pending)
  ticketId      String?         @map("ticket_id") @db.Uuid // Ingresso gerado
  maxQuantity   Int             @default(1) @map("max_quantity")
  issuedAt      DateTime?       @map("issued_at") @db.Timestamptz
  createdAt     DateTime        @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("courtesies")
}
```

**Endpoints:**
```
POST   /api/v1/courtesies/:eventId              — Solicitar cortesia
GET    /api/v1/courtesies/:eventId              — Listar (com filtros: status, solicitante)
PATCH  /api/v1/courtesies/:id/approve           — Aprovar e emitir ingresso
PATCH  /api/v1/courtesies/:id/reject            — Rejeitar
PATCH  /api/v1/courtesies/:id/revoke            — Revogar (cancela ingresso)
GET    /api/v1/courtesies/:eventId/report       — Relatório de cortesias
```

### 10.3 Waitlist (Lista de Espera)

**Problema:** Quando um lote esgota, perdemos ~20% de vendas potenciais. Sympla tem "Lista de Interesse".

```prisma
model Waitlist {
  id         String   @id @default(uuid()) @db.Uuid
  eventId    String   @map("event_id") @db.Uuid
  batchId    String?  @map("batch_id") @db.Uuid // NULL = qualquer lote
  userId     String   @map("user_id") @db.Uuid
  email      String   @db.VarChar(255)
  quantity   Int      @default(1)
  notified   Boolean  @default(false)
  notifiedAt DateTime? @map("notified_at") @db.Timestamptz
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@unique([eventId, userId])
  @@map("waitlists")
}
```

**Endpoints:**
```
POST   /api/v1/waitlist/:eventId                — Entrar na lista de espera
DELETE /api/v1/waitlist/:eventId                — Sair da lista
GET    /api/v1/waitlist/:eventId                — (Produtor) Ver lista de espera
```

**Worker:** `waitlist-notify.worker.ts` — Quando ingressos voltam ao estoque (cancelamento, desistência), notifica a lista por e-mail/push.

### 10.4 Credenciamento (Eventos Corporativos)

**Problema:** Sympla tem credenciamento como feature separada. Para eventos corporativos, não basta check-in — precisa de credencial com foto, empresa, cargo.

```prisma
model Credential {
  id            String   @id @default(uuid()) @db.Uuid
  eventId       String   @map("event_id") @db.Uuid
  ticketId      String?  @map("ticket_id") @db.Uuid
  name          String   @db.VarChar(255)
  company       String?  @db.VarChar(255)
  role          String?  @db.VarChar(100) // Cargo
  category      String?  @db.VarChar(100) // Palestrante, Patrocinador, Imprensa, Participante
  photoUrl      String?  @map("photo_url") @db.VarChar(500)
  qrCode        String   @unique @map("qr_code") @db.VarChar(100)
  customFields  Json?    @map("custom_fields") @db.JsonB
  printedAt     DateTime? @map("printed_at") @db.Timestamptz
  checkedInAt   DateTime? @map("checked_in_at") @db.Timestamptz
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("credentials")
}
```

### 10.5 Formulários Personalizados por Evento

**Problema:** Sympla permite formulários customizados na compra. Nosso checkout só pede nome + CPF. Eventos corporativos pedem empresa, cargo, restrição alimentar, tamanho de camiseta, etc.

```prisma
model EventFormField {
  id         String  @id @default(uuid()) @db.Uuid
  eventId    String  @map("event_id") @db.Uuid
  label      String  @db.VarChar(255)
  type       String  @db.VarChar(50) // text, select, checkbox, radio, date, file
  options    Json?   @db.JsonB // Para select/radio: ["P", "M", "G", "GG"]
  required   Boolean @default(false)
  sortOrder  Int     @default(0) @map("sort_order")
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("event_form_fields")
}

model TicketFormResponse {
  id         String   @id @default(uuid()) @db.Uuid
  ticketId   String   @map("ticket_id") @db.Uuid
  fieldId    String   @map("field_id") @db.Uuid
  value      String   @db.Text
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("ticket_form_responses")
}
```

### 10.6 Reembolso Automático por Cancelamento de Evento

**Problema:** O código atual NÃO implementa reembolso automático quando um evento é cancelado. Isso é obrigatório pelo CDC.

```
// Worker: event-cancel-refund.worker.ts
// Quando event.status muda para 'cancelled':
// 1. Busca todos os orders com status 'paid'
// 2. Para cada order, chama Asaas refund API
// 3. Marca tickets como 'refunded'
// 4. Envia email de notificação com prazo de devolução
// 5. Registra no audit_log
```

### 10.7 Certificados Digitais (Eventos/Cursos)

**Problema:** Sympla oferece certificados grátis. Para cursos, workshops e congressos isso é essencial.

```prisma
model Certificate {
  id            String   @id @default(uuid()) @db.Uuid
  eventId       String   @map("event_id") @db.Uuid
  ticketId      String   @map("ticket_id") @db.Uuid
  userId        String   @map("user_id") @db.Uuid
  templateId    String?  @map("template_id") @db.Uuid
  code          String   @unique @db.VarChar(20) // Código de verificação
  holderName    String   @map("holder_name") @db.VarChar(255)
  hours         Int?     // Carga horária
  pdfUrl        String?  @map("pdf_url") @db.VarChar(500)
  issuedAt      DateTime @default(now()) @map("issued_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("certificates")
}
```

### 10.8 Seguro de Evento

**Problema:** Sympla oferece seguro. Produtores grandes precisam.

```prisma
model EventInsurance {
  id              String   @id @default(uuid()) @db.Uuid
  eventId         String   @unique @map("event_id") @db.Uuid
  provider        String   @db.VarChar(100)
  policyNumber    String?  @map("policy_number") @db.VarChar(100)
  coverageType    String   @map("coverage_type") @db.VarChar(100) // cancelamento, responsabilidade_civil, etc
  coverageAmount  Int      @map("coverage_amount") // Em centavos
  premiumCents    Int      @map("premium_cents")
  status          String   @db.VarChar(50)
  startsAt        DateTime @map("starts_at") @db.Timestamptz
  endsAt          DateTime @map("ends_at") @db.Timestamptz
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  event Event @relation(fields: [eventId], references: [id])

  @@map("event_insurance")
}
```

### 10.9 PDV Presencial (Bilheteria Física)

**Problema:** Nenhum módulo cobre venda presencial de ingressos na porta do evento. A "máquina de vendas tipo Zig Pay" precisa de um módulo dedicado.

```
// Módulo: box-office (Bilheteria)
src/modules/box-office/
├── box-office.router.ts
├── box-office.controller.ts
├── box-office.service.ts
├── box-office.validators.ts
└── __tests__/
```

**Endpoints:**
```
POST   /api/v1/box-office/:eventId/sell        — Vender ingresso presencial (dinheiro/cartão/PIX)
GET    /api/v1/box-office/:eventId/open         — Abrir caixa (turno do operador)
POST   /api/v1/box-office/:eventId/close        — Fechar caixa (conferência)
GET    /api/v1/box-office/:eventId/report       — Relatório de vendas presenciais
POST   /api/v1/box-office/:eventId/print-ticket  — Gerar ingresso para impressão
```

### 10.10 RBAC Granular (Permissões por Função)

**Problema:** O sistema atual tem apenas 3 roles: `consumer | producer | admin`. Para operação real, precisamos de permissões granulares.

```prisma
model Permission {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  eventId     String?  @map("event_id") @db.Uuid // NULL = permissão global
  resource    String   @db.VarChar(50) // events, tickets, cashless, pos, guest-lists, reports, financial
  actions     Json     @db.JsonB // ["read", "create", "update", "delete"]
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@unique([userId, eventId, resource])
  @@map("permissions")
}
```

---

## PARTE 11: RESUMO QUANTITATIVO ATUALIZADO

| Métrica | Existente | Mapeamento v1 | Lacunas v2 | **Total Final** |
|---------|-----------|---------------|------------|-----------------|
| Módulos | 15 | +6 | +4 | **25** |
| Endpoints | ~64 | +68 | +22 | **~154** |
| Models Prisma | 17 | +13 | +9 | **39** |
| Enums | 10 | +10 | +3 | **23** |
| Workers BullMQ | 7 | +7 | +2 | **16** |
| Socket.IO Events | 5 | +10 | +2 | **17** |

### Novos Módulos Adicionados nesta Revisão

| Módulo | Prioridade | Justificativa |
|--------|------------|---------------|
| `price-rules` (meia-entrada/cortesia) | **CRÍTICA - Lei** | Lei 12.933/2013 obriga meia-entrada em eventos |
| `courtesies` | Alta | Todo produtor precisa de gestão de cortesias |
| `waitlist` | Alta | Recupera ~20% de vendas perdidas |
| `credentials` | Média | Essencial para eventos corporativos |
| `box-office` | Alta | Venda presencial na porta/bilheteria |
| `certificates` | Média | Obrigatório para cursos/workshops |
| `form-fields` | Média | Formulários customizados no checkout |
| `insurance` | Baixa | Diferencial para grandes produtores |
| `permissions` (RBAC) | **CRÍTICA** | Segurança operacional insuficiente sem isso |

---

## PARTE 12: ROADMAP REVISADO E COMPLETO

### Fase 0 — Crítico / Legal (1 semana)
1. TicketPriceRule (meia-entrada obrigatória por lei)
2. RBAC / Permissions granulares
3. Push notifications (FCM)
4. Socket.IO JWT verification

### Fase 1 — Core Revenue (2-3 semanas)
1. Cortesias completas com fluxo de aprovação
2. Box-office / Bilheteria presencial
3. Waitlist com notificação automática
4. Reembolso automático por cancelamento

### Fase 2 — AZLIST Killer (2-3 semanas)
1. GuestListConfig + GuestEntry avançado
2. Promoters + assignments + links
3. Auto-cadastro público + import CSV
4. Ranking e gamificação

### Fase 3 — Cashless / Zig Pay Killer (3-4 semanas)
1. CashlessConfig + Wallets + Topup via Asaas
2. Transações + estornos
3. Dashboard cashless real-time
4. Devoluções automáticas pós-evento

### Fase 4 — Bar / POS (2-3 semanas)
1. PointOfSale + operadores
2. Cardápio digital + produtos
3. Controle de estoque
4. Relatórios por POS

### Fase 5 — Produção (2 semanas)
1. Staff management + escalas
2. Areas + capacidade por zona
3. Store / upgrades / merch
4. Formulários customizados

### Fase 6 — Enterprise (2 semanas)
1. Credenciamento corporativo
2. Certificados digitais
3. Seguro de evento
4. Advanced analytics + BI

### Fase 7 — Polish (1-2 semanas)
1. Workers completos
2. Socket.IO events completos
3. Testes de integração E2E
4. Documentação OpenAPI

**Tempo total estimado: 14-20 semanas (3.5-5 meses) para plataforma 100% completa**

---

*Este documento é o mapa DEFINITIVO do backend. Cobre 100% do ciclo de vida: planejamento → venda → dia do evento → pós-evento. Cada módulo segue a arquitetura vertical existente (router → controller → service → validators). Schema Prisma atualizado incrementalmente com migrations versionadas.*
