# BACKEND_MAP — PulsePass API

> **Versão:** 1.0 (2026-05-28) · **Base URL:** `http://localhost:3333/api/v1` · **Stack:** Express 5 + Prisma 7 + Socket.IO + BullMQ
>
> Documento de referência para o time de design/frontend. Cataloga **todos os endpoints REST + eventos Socket.IO** organizados por feature.
> Para mapeamento detalhado de **qual tela usa qual endpoint**, ver `SCREEN_ENDPOINT_MATRIX.md`.

---

## 📑 Sumário

1. [Convenções globais](#1-convenções-globais)
2. [Autenticação](#2-autenticação)
3. [Eventos públicos](#3-eventos-públicos)
4. [Favoritos](#4-favoritos)
5. [Compra & Pagamento](#5-compra--pagamento)
6. [Ingressos do usuário](#6-ingressos-do-usuário)
7. [Check-in](#7-check-in)
8. [Cashless (Wallet & POS)](#8-cashless-wallet--pos)
9. [POS Devices (Kiosk)](#9-pos-devices-kiosk)
10. [Engine 5 — Customer Orders (pedido pelo bar)](#10-engine-5--customer-orders-pedido-pelo-bar)
11. [Engine 5 — Venue Map](#11-engine-5--venue-map)
12. [Engine 5 — Social (Friendships)](#12-engine-5--social-friendships)
13. [Engine 5 — Achievements](#13-engine-5--achievements)
14. [Produtor — gestão de eventos](#14-produtor--gestão-de-eventos)
15. [Produtor — operacional](#15-produtor--operacional)
16. [Admin Multi-Tenant (Organizations)](#16-admin-multi-tenant-organizations)
17. [Promoters, Affiliates & Guest Lists](#17-promoters-affiliates--guest-lists)
18. [Integrações (API Keys, Webhooks)](#18-integrações-api-keys-webhooks)
19. [LGPD](#19-lgpd)
20. [Infra & Health](#20-infra--health)
21. [Socket.IO — eventos em tempo real](#21-socketio--eventos-em-tempo-real)
22. [Tipos TypeScript (resumo)](#22-tipos-typescript-resumo)
23. [Gotchas pro front](#23-gotchas-pro-front)

---

## 1. Convenções globais

### 1.1 Envelope de resposta

```ts
// Sucesso
{ success: true, data: T }

// Erro
{
  success: false,
  error: {
    code: string,           // ex: "NOT_FOUND", "VALIDATION", "UNAUTHORIZED"
    message: string,        // mensagem em PT-BR pro usuário
    details?: Array<{ field: string, message: string }>  // erros Zod por campo
  }
}
```

### 1.2 Códigos HTTP

| Code | Quando | Frontend |
|---|---|---|
| **200** | OK | render `data` |
| **201** | Criado (POST) | toast verde + navega |
| **204** | Sem conteúdo (DELETE) | toast + remove da lista |
| **400** | Validation error | mostra `error.details` por campo |
| **401** | Não autenticado | redireciona pra `/login` |
| **403** | Sem permissão | tela "sem acesso" |
| **404** | Não encontrado | tela 404 / empty state |
| **409** | Conflito (idempotency, duplicate) | mostra `error.message` |
| **422** | Regra de negócio violada (ex: saldo insuficiente) | toast vermelho |
| **429** | Rate limit | toast "muitas tentativas, aguarde" |
| **500** | Erro interno | Sentry capta + toast genérico |

### 1.3 Autenticação

- **Header**: `Authorization: Bearer <access_token>` (JWT RS256, expira 15min)
- **Refresh**: `POST /auth/refresh` com `{refreshToken}` (7 dias)
- **Device fingerprint**: header `X-Device-Fingerprint` opcional (antifraude)
- **POS Device**: header `X-Device-Token` (apenas para tablets POS, ver §9)

### 1.4 Paginação (cursor-based)

```ts
// Request: ?cursor=<last_id>&limit=20
// Response:
{
  success: true,
  data: {
    items: T[],
    pagination: {
      nextCursor: string | null,
      hasMore: boolean
    }
  }
}
```

### 1.5 Idempotência

Endpoints que criam recursos críticos aceitam o header `Idempotency-Key` (UUID v4). Mesma chave em até **24h** retorna o mesmo recurso sem criar duplicado.

**Endpoints idempotentes:**
- `POST /payments/checkout`
- `POST /customer-orders`
- `POST /cashless/transactions/charge`
- `POST /cashless/wallets/:id/topup`

### 1.6 Rate Limits

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /auth/*` (login, register, etc.) | 5 req | 60s por IP |
| `POST /payments/checkout` | 10 req | 60s por user |
| `POST /checkin/validate` | 20 req | 1s por user (anti-replay) |
| `GET /users/me/data` (LGPD export) | 1 req | 1h por user |
| Outras | 100 req | 60s por IP |

### 1.7 Webhooks externos & Socket.IO

- Eventos em tempo real via Socket.IO em rooms: `user:${userId}`, `event:${eventId}`, `pos:${posId}`, `org:${orgId}`
- Cliente entra em room emitindo: `socket.emit('event:join', { eventId })` etc.
- Lista completa em §21.

---

## 2. Autenticação

`base: /api/v1/auth`

| Método | Path | Auth | Request | Response | Notas |
|---|---|---|---|---|---|
| POST | `/register` | — | `{email, password, name, cpf, phone?}` | `{user, accessToken, refreshToken}` | Envia email de verificação |
| POST | `/login` | — | `{email, password, twoFactorCode?}` | `{user, accessToken, refreshToken}` ou `{requires2FA: true, tempToken}` | Rate-limited |
| POST | `/verify-2fa` | optional | `{tempToken, code}` | `{user, accessToken, refreshToken}` | TOTP 6 dígitos |
| POST | `/refresh` | — | `{refreshToken}` | `{accessToken, refreshToken}` (rotaciona) | |
| POST | `/verify-email` | required | `{code}` | `{verified: true}` | |
| POST | `/forgot-password` | — | `{email}` | `{sent: true}` | Sempre retorna sent (anti-enum) |
| POST | `/reset-password` | required | `{token, newPassword}` | `{reset: true}` | |
| POST | `/enable-2fa` | required | — | `{secret, qrCodeUrl}` | Retorna pra scan |
| POST | `/confirm-2fa` | required | `{code}` | `{enabled: true, backupCodes: string[]}` | |
| POST | `/disable-2fa` | required | `{password}` | `{disabled: true}` | |

**Telas que consomem:** Login, Registro, Esqueci senha, Reset senha, Verificar email, 2FA setup, 2FA prompt.

---

## 3. Eventos públicos

`base: /api/v1/events`

| Método | Path | Auth | Request | Response | Tela |
|---|---|---|---|---|---|
| GET | `/search` | optional | query: `q?, category?, city?, dateFrom?, dateTo?, priceMin?, priceMax?, isOpenBar?, cursor?, limit?` | `{items: Event[], pagination}` | Busca, Categoria |
| GET | `/nearby` | optional | query: `lat, lng, radiusKm?` | `Event[]` | Home "Perto de você" |
| GET | `/weekend` | optional | — | `Event[]` (sex-dom desta semana) | Home seção "Fim de semana" |
| GET | `/trending` | optional | — | `Event[]` (top 8 mais vendidos últimos 7d) | Home seção "Em alta" |
| GET | `/recommendations` | required | — | `Event[]` personalizados | Home logged-in |
| GET | `/slug/:slug` | optional | — | `EventFull` (com lotes, lineup, reviews) | Página do evento (URL bonita) |
| GET | `/:id` | optional | — | `EventFull` | Página do evento (UUID) |

**Aliases aceitos em `category=`**: `shows`→`show`, `esportes`→`esporte`, `festivais`→`festival`, etc.

**Enum EventCategory:** `show, festival, esporte, teatro, museu, curso, outro`

**Schema EventFull (resposta de `/:id` e `/slug/:slug`):**
```ts
{
  id: string;
  slug: string;
  title: string;
  description: string;          // HTML
  shortDescription: string;
  category: EventCategory;
  status: 'draft' | 'published' | 'ongoing' | 'finished' | 'cancelled';
  venueName: string;
  venueAddress: string;
  venueLat?: number; venueLng?: number;
  venueCapacity: number;
  startsAt: string;             // ISO
  endsAt: string;
  doorsOpenAt?: string;
  coverImageUrl: string;
  gallery: string[];            // URLs adicionais
  tags: string[];
  ageRating: string;            // '18+', 'Livre', etc.
  isOpenBar: boolean;
  lineup: Array<{ id?: string; name: string; role?: string; image?: string; time?: string }>;
  organizationId: string;
  organization: { id, name, slug, branding };
  batches: TicketBatch[];       // lotes
  reviews?: Review[];           // últimas 10
}
```

**Socket.IO subscriptions:** `event:${eventId}` → `sales:live` (atualiza qty restante)

---

## 4. Favoritos

`base: /api/v1/favorites` · Todas autenticadas.

| Método | Path | Request | Response |
|---|---|---|---|
| POST | `/:eventId/toggle` | — | `{favorited: boolean}` |
| GET | `/` | query: `cursor?, limit?` | `{items: Event[], pagination}` |
| GET | `/:eventId/check` | — | `{favorited: boolean}` |

**Telas:** card de evento (ícone coração), tab "Favoritos".

---

## 5. Compra & Pagamento

### Orders (consulta dos meus pedidos)
`base: /api/v1/orders` · Auth required.

| Método | Path | Request | Response |
|---|---|---|---|
| GET | `/` | query: `status?, cursor?, limit?` | `{items: Order[], pagination}` |
| GET | `/:id` | — | `OrderFull` (com tickets emitidos) |
| POST | `/:id/cancel` | — | `Order` (status=cancelled) |

### Payments (criar checkout)
`base: /api/v1/payments`

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/checkout` | required + idempotency | `{eventId, batches: [{batchId, quantity, holders:[{name,cpf,email}]}], paymentMethod: 'pix'|'credit_card'|'boleto', couponCode?, installments?, savedCardId?}` | `{order, paymentInfo: {pixQrCode?, pixCopyPaste?, boletoUrl?, paymentUrl?, expiresAt}}` |
| POST | `/webhook` | — (HMAC) | Asaas payload | `{ok: true}` |

**Schema Order:**
```ts
{
  id: string;
  userId: string;
  eventId: string;
  totalCents: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled' | 'refunded';
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  gatewayProvider: 'asaas' | 'pagarme';
  expiresAt: string;
  items: Array<{batchId, quantity, priceCents, holders}>;
  tickets?: Ticket[];           // só em GET /:id e quando status='paid'
  createdAt: string;
}
```

**Fluxo:**
1. Front chama `POST /payments/checkout` com idempotency-key UUID
2. Backend cria Order (pending), reserva lotes, chama gateway
3. Resposta tem `paymentInfo` (PIX QR ou link)
4. Front mostra QR, faz polling em `GET /orders/:id` (status=paid) **ou** subscribe `user:${userId}` Socket.IO
5. Quando pago: backend emite tickets, popula `order.tickets[]`

**Telas:** Checkout (3 steps), Pagamento PIX, Sucesso, Meus Pedidos.

---

## 6. Ingressos do usuário

`base: /api/v1/tickets` · Auth required.

| Método | Path | Request | Response | Tela |
|---|---|---|---|---|
| GET | `/mine` | query: `status?, cursor?, limit?` | `Ticket[]` (apenas active+used) | Meus ingressos |
| GET | `/history` | — | `Ticket[]` (todos incluindo cancelled) | Histórico |
| GET | `/:id` | — | `TicketFull` (com event + batch) | Detalhe do ingresso |
| GET | `/:id/qr` | — | `{qrPayload: string, ticketHash, expiresIn}` | Mostra QR fullscreen |
| GET | `/:id/totp-secret` | — | `{totpSecret: string}` (1× por mostrar QR) | App calcula TOTP local |
| POST | `/:id/rotate-totp` | — | `{rotated: true}` | Se suspeita de leak |
| POST | `/:id/transfer` | body: `{toEmail}` | `{transferId, expiresAt}` | Transferir ingresso |
| POST | `/transfers/:id/confirm` | body: `{token}` | `Ticket` (novo titular) | Aceitar transferência |
| POST | `/validate-qr` | body: `{qrPayload}` | `{valid, ticket?, result, message}` | Validador rápido (operador) |

**Schema Ticket:**
```ts
{
  id: string;
  code: string;             // visível ao usuário, ex "TIK-A7B3K9"
  orderId: string;
  eventId: string;
  batchId: string;
  status: 'active' | 'used' | 'cancelled' | 'transferred' | 'refunded';
  holderName: string;
  holderCpf: string;
  ticketHash: string;
  checkedInAt: string | null;
  event: { title, venueName, startsAt, coverImageUrl };
  batch: { name, priceCents };
  createdAt: string;
}
```

**Detalhe QR:** payload formato `${ticketHash}:${totp6digits}` — TOTP rotaciona a cada 30s.

---

## 7. Check-in

`base: /api/v1/checkin` · Auth required (operador de evento).

| Método | Path | Request | Response |
|---|---|---|---|
| POST | `/validate` | `{qrPayload, eventId, deviceId, zoneId?}` | `{result, ticket?, message, checkedInAt?}` |
| GET | `/capacity/:eventId` | — | `{capacity, checkedIn, available, occupancyRate}` |
| POST | `/sync` | `{checkins: OfflineCheckin[]}` | `{processed, conflicts: []}` |

**Result enum:** `valid, invalid_hash, invalid_totp, already_used, wrong_event, ticket_cancelled, offline_valid, offline_conflict`

**Socket.IO publish:** `event:${eventId}` → `checkin:success` + `checkin:capacity` (capacidade atualizada)

**Telas:** Operador check-in (mobile), painel admin "ao vivo".

---

## 8. Cashless (Wallet & POS)

`base: /api/v1/cashless`

### 8.1 Config do evento (produtor)

| Método | Path | Auth | Notas |
|---|---|---|---|
| POST | `/:eventId/config` | producer + ownership | Cria CashlessConfig (taxa devolução, valor mínimo recarga, NFC habilitado) |
| GET | `/:eventId/config` | — | Público (cliente lê pra mostrar config) |
| PATCH | `/:eventId/config` | producer + ownership | |

### 8.2 Wallet (cliente)

| Método | Path | Request | Response |
|---|---|---|---|
| POST | `/wallets` | `{eventId, walletType: 'digital'|'nfc'}` | `Wallet` |
| GET | `/wallets/me/:eventId` | — | `Wallet` do user no evento (ou 404) |
| POST | `/wallets/:id/topup` | `{amountCents, paymentMethod}` | `{transaction, paymentInfo}` |
| POST | `/wallets/:id/block` | `{reason}` | `Wallet` (status=blocked) |
| POST | `/wallets/:id/refund` | `{reason, bankAccount?}` | `{refundId, status}` |
| GET | `/wallets/:id/balance` | — | `{balanceCents, status, version}` |
| GET | `/wallets/:id/transactions` | query: `type?, cursor?, limit?` | `{items: Transaction[], pagination}` |

**Schema Wallet:**
```ts
{
  id: string;
  eventId: string;
  userId: string;
  walletType: 'digital' | 'nfc';
  walletCode: string;       // ex "WALLET-MARIA-001"
  nfcTagId?: string;        // se walletType=nfc
  balanceCents: number;
  status: 'wallet_active' | 'wallet_blocked' | 'wallet_refunded';
  offlineLimit: number;     // limite offline em centavos (default 20000 = R$200)
  version: number;          // optimistic locking
}
```

### 8.3 Transactions (operador/cliente)

| Método | Path | Request | Response |
|---|---|---|---|
| POST | `/transactions/charge` | `{walletId, amountCents, items?, tipCents?, posId, idempotencyKey}` | `{transactionId, newBalance, timestamp}` |
| POST | `/transactions/reverse` | `{transactionId, reason}` | `Transaction` |
| GET | `/transactions/:id` | — | `Transaction` |

### 8.4 Dashboard cashless (produtor)

| Método | Path | Auth | Response |
|---|---|---|---|
| GET | `/:eventId/dashboard` | producer | `{totalRevenue, transactions, avgTicket, refundRate, ...}` |
| GET | `/:eventId/transactions` | producer | Lista paginada |
| GET | `/:eventId/top-products` | producer | `Product[]` ordenados por venda |
| GET | `/:eventId/revenue-by-pos` | producer | `Array<{posId, posName, revenue}>` |
| GET | `/:eventId/hourly-stats` | producer | `Array<{hour, revenue, transactions}>` |
| GET | `/:eventId/export` | producer | CSV/JSON download |

### 8.5 POS endpoints (mobile operador)

| Método | Path | Auth | Response |
|---|---|---|---|
| GET | `/pos/:posId/products` | required | `POSProduct[]` (catálogo do bar) |
| POST | `/pos/:posId/operator/login` | required | body: `{pin}` → `{valid, operatorId, name}` |
| GET | `/wallet/by-code/:code` | required | `{id, walletCode, balanceCents, userName}` |

### 8.6 Admin CRUDs cashless

Sub-routers em `/api/v1/cashless/orgs/:organizationId/events/:eventId/`:

- `/pos` — gestão de pontos de venda (bar, food truck, totem, vip_lounge)
- `/categories` — categorias de produto (cervejas, drinks, comida, etc.)
- `/products` — cardápio por POS (CRUD + upload imagem + clone entre POS)
- `/operators` — bartenders e seus PINs
- `/stock` — entrada/ajuste/perda + auto-disable produto em low-stock

Cada um tem o CRUD padrão (`GET /`, `POST /`, `PATCH /:id`, `DELETE /:id` ou archive). Detalhes em endpoints específicos abaixo.

**Socket.IO publish:** `pos:${posId}` → `catalog:updated`, `stock:low`, `stock:out`

**Telas:**
- Cliente: tela cashless (saldo + recarga + transações + tap NFC)
- Operador mobile: `CashlessPOSScreen` (PIN → scan QR/NFC → cart → charge)
- Admin: hub cashless com 6 cards + dashboard

---

## 9. POS Devices (Kiosk)

`base: /api/v1/pos-devices` · Para tablets dedicados em modo kiosk.

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/pair` | producer | `{posId, deviceName}` | `{pairingCode}` (6 chars) |
| GET | `/` | producer | query: `posId?` | `PosDevice[]` |
| DELETE | `/:id` | producer | — | `{revoked: true}` |
| POST | `/redeem` | — | `{pairingCode, deviceFingerprint}` | `{deviceToken}` (long-lived, usar em `X-Device-Token`) |
| GET | `/me` | device-token | — | `{id, posId, organizationId}` |
| POST | `/heartbeat` | device-token | `{batteryLevel?, version?}` | `{ok: true}` (a cada 5min) |
| POST | `/operator-login` | device-token | `{pin}` | `{operatorId, name}` |

**Telas:**
- Admin web `/admin/.../cashless/pos` → tab "Devices" → gera pair code
- Mobile POS variant: tela setup (digitar pair code) → tela PIN → tela POS lock-task

---

## 10. Engine 5 — Customer Orders (pedido pelo bar)

`base: /api/v1/customer-orders`

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/` | required + idempotency | `{eventId, posId, items: [{productId, qty}]}` | `CustomerOrder` (com `pickupCode`) |
| GET | `/me` | required | query: `status?, eventId?, cursor?, limit?` | `{items, pagination}` |
| GET | `/admin` | producer + role viewer | query: `organizationId, eventId?, posId?, status?, cursor?, limit?` | `{items, pagination}` |
| PATCH | `/:id/status` | required | `{organizationId, status: 'preparing'|'ready'|'delivered'}` | `CustomerOrder` |
| POST | `/:id/cancel` | required | — | `CustomerOrder` (status=cancelled, estorno) |

**Schema CustomerOrder:**
```ts
{
  id: string;
  userId: string;
  eventId: string;
  posId: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  totalCents: number;
  items: Array<{ productId, name, qty, priceCents }>;
  pickupCode: string;       // 6 chars ex "A7B3K9"
  walletTxId: string | null;
  createdAt: string;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}
```

**Fluxo:**
1. Cliente abre catálogo do POS → escolhe items
2. `POST /customer-orders` (re-precificação server-side, débito atomic na wallet)
3. Backend emite `customer_order:new` em `pos:${posId}` e `org:${orgId}` (admin vê na fila)
4. Operador clica "Iniciar preparo" → `PATCH /:id/status` (pending→preparing)
5. Operador "Marcar pronto" → status=ready → backend dispara `pushQueue` (push pro user)
6. Cliente vê pickup code → retira → operador "Confirmar retirada" → status=delivered

**Socket.IO emits:**
- `customer_order:new` (room: `pos:${posId}`, `org:${orgId}`)
- `customer_order:status` (room: `user:${userId}`, `pos:${posId}`)

**Telas:** Mobile `BarMenuScreen` + `MyOrdersScreen`, Web admin `AdminOrdersQueuePage`.

---

## 11. Engine 5 — Venue Map

`base: /api/v1`

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/events/:eventId/map` | required | — | `{id, eventId, svgUrl, zones: Zone[]}` |
| GET | `/events/:eventId/zones/occupancy` | required | — | `ZoneOccupancy[]` |
| PUT | `/orgs/:organizationId/events/:eventId/venue-map` | admin | `{svgUrl?, zones: Zone[]}` | `VenueMap` |
| DELETE | `/orgs/:organizationId/events/:eventId/venue-map` | admin | — | `{deleted: true}` |

**Schema Zone:**
```ts
{
  id: string;                  // ex 'palco-principal'
  name: string;                // ex 'Palco Principal'
  polygon: Array<[x, y]>;       // ≥3 pontos
  capacity?: number;
  color?: string;              // ex '#10b981'
  kind?: 'general' | 'vip' | 'bar' | 'bathroom' | 'first_aid' | 'stage' | 'exit';
}
```

**Schema ZoneOccupancy:**
```ts
{
  zoneId: string;
  name: string;
  current: number;             // checkins na zona
  capacity: number | null;
  ratio: number | null;        // 0-1
  status: 'green' | 'yellow' | 'red' | 'unknown';
}
```

**Socket.IO:** `event:${eventId}` → `zone:occupancy` (publicado a cada 30s pelo worker)

**Telas:** Admin SVG editor (`AdminVenueMapPage`), Mobile `VenueMapScreen` com heatmap overlay.

---

## 12. Engine 5 — Social (Friendships)

`base: /api/v1`

| Método | Path | Request | Response |
|---|---|---|---|
| POST | `/friendships/request` | `{addressee: emailOrId}` | `Friendship` (status=pending; auto-accepta se já houver pendente inverso) |
| POST | `/friendships/:id/accept` | — | `Friendship` (status=accepted) |
| POST | `/friendships/:id/reject` | — | `{deleted: true}` |
| POST | `/friendships/block` | `{userId}` | `Friendship` (status=blocked) |
| GET | `/friendships/me` | query: `status: 'accepted'|'pending'` | `Array<{id, status, friend: {id,name,email,avatarUrl}, createdAt}>` |
| GET | `/events/:eventId/friends-present` | — | `Array<{id, name, avatarUrl, checkedInAt}>` |

**Telas:** Mobile `FriendsScreen`, "X amigos presentes" no detalhe do evento.

---

## 13. Engine 5 — Achievements

`base: /api/v1/achievements`

| Método | Path | Request | Response |
|---|---|---|---|
| GET | `/me` | — | `Achievement[]` (com progress e unlockedAt) |
| POST | `/me/evaluate` | — | `{unlocked: string[], progress: Record<key, number>}` |

**Catálogo seed (6 badges):**
| Key | Nome | Threshold |
|---|---|---|
| `first_event` | Estreante | 1 evento usado |
| `five_events` | Frequentador | 5 eventos |
| `ten_events` | Insider | 10 eventos |
| `first_purchase` | Primeira compra | 1 order paid |
| `big_spender` | Mão Aberta | R$ 500+ recarregados |
| `social_butterfly` | Sociável | 10+ amigos |

**Worker:** roda diariamente às 5h reavalia todos os usuários.

**Telas:** Mobile `AchievementsScreen`, badges no perfil.

---

## 14. Produtor — gestão de eventos

`base: /api/v1/events` (cont. de §3, agora com auth)

| Método | Path | Auth | Notas |
|---|---|---|---|
| POST | `/` | producer | Cria evento (status=draft) |
| PATCH | `/:id` | producer + ownership | Edita |
| POST | `/:id/publish` | producer + ownership | draft → published |
| POST | `/:id/cancel` | producer + ownership | published → cancelled (gera refund) |
| GET | `/producer/mine` | producer | Eventos do produtor logado |

**Lotes (TicketBatch):** gerenciados via PATCH no evento (campo `batches: [...]`). Estrutura: `{name, description?, priceCents, quantity, startsAt?, endsAt?, type: 'regular'|'vip'|'camarote'|'presale', isVisible}`.

### Cupons / Price rules
`base: /api/v1/price-rules`

CRUD padrão (não detalhado aqui). Tipos: cupom de desconto, regra de preço dinâmico, gratuidades (cortesias).

### Cortesias
`base: /api/v1/courtesies`

CRUD + atribuição. Cortesia = ingresso gratuito emitido manualmente pelo produtor pra convidado.

### Box-Office (PDV físico)
`base: /api/v1/box-office`

Operações de venda na portaria com cash, débito ou Pix. 5 endpoints (criar sessão, registrar venda, fechar sessão, listar sessões, relatório).

### Waitlist (lista de espera)
`base: /api/v1/waitlist`

Quando evento esgota, usuários se inscrevem na waitlist. CRUD básico.

### Lineup, mídia, etc.
Atualizações via campos do `PATCH /events/:id` (json fields: `lineup`, `gallery`, `tags`, `timeline`).

---

## 15. Produtor — operacional

### Staff
`base: /api/v1/staff` · Equipe do produtor por evento (escala de produção).

CRUD + assignment a evento. 6 endpoints.

### Areas
`base: /api/v1/areas` · Áreas físicas do venue (palco, camarote A, B, etc.).

CRUD. 6 endpoints.

### Store (merch)
`base: /api/v1/store` · Loja de merchandise no evento (camisetas, copos).

CRUD. 6 endpoints.

### Form fields
`base: /api/v1/form-fields` · Campos customizados no checkout (ex: "qual artista te trouxe aqui?").

CRUD + ordem + reordenamento. 7 endpoints.

### Credentials
`base: /api/v1/credentials` · Credenciais de imprensa, fotógrafo, equipe técnica (com QR próprio).

CRUD + emit. 5 endpoints.

### Certificates
`base: /api/v1/certificates` · Certificados de presença (para cursos/eventos educacionais).

| Método | Path | Notas |
|---|---|---|
| POST | `/` | Emite |
| GET | `/` | Lista do user |
| GET | `/verify/:code` | Público — verifica autenticidade |
| GET | `/:id` | Detalhe |
| GET | `/:id/download` | PDF download |

### Insurance
`base: /api/v1/insurance` · Seguro do evento (cancelamento, chuva).

CRUD básico (4 endpoints: POST, GET, PATCH, DELETE).

---

## 16. Admin Multi-Tenant (Organizations)

### Organizations
`base: /api/v1/organizations` · Gestão de tenants.

CRUD + membros (invite, remove, change role). Roles: `owner > admin > finance > operator > promoter > viewer`. ~10 endpoints.

### Branding
`base: /api/v1/branding` · White-label.

| Método | Path | Notas |
|---|---|---|
| GET | `/by-domain` | Público — query: `host` → resolve org por domínio customizado |
| PUT | `/orgs/:orgId` | admin — atualiza branding (logo, cores, fonte) |

### Ledger (contabilidade double-entry)
`base: /api/v1/ledger` · Contabilidade interna.

| Método | Path | Notas |
|---|---|---|
| GET | `/orgs/:orgId/accounts` | Plano de contas |
| GET | `/orgs/:orgId/entries` | Movimentos |
| POST | `/orgs/:orgId/events/:eventId/close` | Fecha evento (valida invariantes débito==crédito) |

### Admin global
`base: /api/v1/admin` · Acessos administrativos da plataforma (não produtor).

CRUDs e dashboards globais (financeiro consolidado, gestão de usuários, force-action). ~15 endpoints internos.

### Reports
`base: /api/v1/reports` · Relatórios pós-evento (Excel 9 abas).

Geração assíncrona via worker.

### Producers
`base: /api/v1/producers` · Onboarding e finance do produtor (KYC, saques, comprovantes).

5 endpoints (POST onboarding, GET status, etc.).

---

## 17. Promoters, Affiliates & Guest Lists

### Promoters
`base: /api/v1/promoters` · Cadastro de promoter (AZList killer).

CRUD do promoter + dashboard de vendas + link de tracking.

### Affiliates
`base: /api/v1/affiliates` · Sistema de afiliados com comissão.

CRUD + tracking de cliques + cálculo de comissão.

### Guest Lists
`base: /api/v1/guest-lists` · Listas de convidados (CSV import, status).

CRUD + import CSV + check-in awareness (sabe quem está na lista quando faz check-in).

---

## 18. Integrações (API Keys, Webhooks)

### API Keys
`base: /api/v1/organizations/:orgId/api-keys` (estimado — rota incluída via organizations router)

CRUD de API keys (formato `pk_live_*.*`) com scopes. Permite integradores externos consumirem a API.

### Webhooks Outbound
`base: /api/v1/webhooks/outbound`

Subscriptions + delivery log. Eventos emitidos: `order.paid`, `ticket.issued`, `ticket.transferred`, `ticket.checked_in`, `cashless.topup`, `cashless.purchase`, `cashless.refund`, `event.published`, `user.anonymized`.

Header de segurança: `X-PulsePass-Signature: <hmac_sha256_hex>`

### Webhooks External (recebe de gateways/integradores)
`base: /api/v1/webhooks/external` · Recebe payloads de Sympla, Ingresso.com, Asaas etc.

3 endpoints. Auth via secret no path/header.

---

## 19. LGPD

`base: /api/v1/lgpd`

| Método | Path | Rate Limit | Notas |
|---|---|---|---|
| GET | `/me/export` | 1/hora | Gera ZIP com profile, tickets, transactions, audit-trail. Envia por email (Resend) com link R2 expirável 24h. |
| DELETE | `/me/anonymize` | 1/hora | Anonimização (não deleta — substitui PII por `[REDACTED-{prefix}]`). Exige password + 2FA. |

E também via `/users/me/data` e `DELETE /users/me` (atalhos legados).

---

## 20. Infra & Health

`base: /api/v1/health`

| Método | Path | Notas |
|---|---|---|
| GET | `/` | OK básico (uptime, version) |
| GET | `/ready` | Liveness + readiness (DB + Redis) |
| GET | `/full` | Detalhado com todos os services |
| GET | `/db` | Só DB |
| GET | `/redis` | Só Redis |
| GET | `/queues` | Profundidade das filas BullMQ |

### Live
`base: /api/v1/live` · WebSocket/SSE endpoints especializados (real-time analytics).

### Permissions
`base: /api/v1/permissions` · Permissões granulares (overlay de RBAC além das roles).

---

## 21. Socket.IO — eventos em tempo real

**Conexão:** `io(API_URL, { auth: { token } })` (JWT)

**Rooms:**
- `user:${userId}` — automaticamente joined no auth
- `event:${eventId}` — `socket.emit('event:join', { eventId })`
- `pos:${posId}` — `socket.emit('pos:join', { posId })`
- `org:${organizationId}` — `socket.emit('org:join', { organizationId })`

**Eventos emitidos pelo backend:**

| Evento | Room | Payload | Quando |
|---|---|---|---|
| `customer_order:new` | `pos:${posId}` + `org:${orgId}` | `{orderId, posId, userId, status, totalCents, pickupCode, ts}` | Cliente cria pedido pelo bar |
| `customer_order:status` | `user:${userId}` + `pos:${posId}` | mesmo payload | Status do pedido muda |
| `catalog:updated` | `pos:${posId}` | `{posId, ts}` | Produto/categoria criada/editada |
| `stock:low` | `pos:${posId}` + `org:${orgId}` | `{productId, currentQty, threshold}` | Estoque atinge low threshold |
| `stock:out` | mesmos | `{productId}` | Estoque esgota (auto-disable) |
| `checkin:success` | `event:${eventId}` | `{ticketId, holderName, zoneId?, ts}` | Check-in válido |
| `checkin:capacity` | `event:${eventId}` | `{capacity, checkedIn, occupancyRate}` | Após cada check-in |
| `zone:occupancy` | `event:${eventId}` | `{eventId, zones: ZoneOccupancy[], ts}` | Worker tick (30s) |
| `sales:live` | `event:${eventId}` | `{batchId, sold, remaining, ts}` | Após cada compra paga |

---

## 22. Tipos TypeScript (resumo)

Workspace `@ticketeria/types` exporta:

```ts
// Modelos Prisma (subconjunto público)
export type { User, Event, EventCategory, EventStatus, Order, OrderStatus, Ticket, TicketStatus, TicketBatch, BatchType, CashlessWallet, CashlessTransaction, CustomerOrder, CustomerOrderStatus, Favorite, Review, Organization, OrganizationMember, OrgMemberRole, VenueMap, Friendship, FriendshipStatus, Achievement, UserAchievement, PointOfSale, POSType, POSProduct, ProductCategoryEnum, PosDevice } from './models';

// DTOs (request/response shapes)
export type { LoginRequest, LoginResponse, RegisterRequest, CheckoutRequest, CheckoutResponse, CreateCustomerOrderRequest, ... } from './dto';

// Enums utilitários
export { EventCategory, EventStatus, OrderStatus, TicketStatus, CashlessTransactionType, FriendshipStatus, ... } from './enums';

// Validators (Zod schemas pra reuso no front se quiser)
export { loginSchema, checkoutSchema, ... } from './validators';
```

Front pode importar com:
```ts
import type { Event, Ticket, Order } from '@ticketeria/types';
```

---

## 23. Gotchas pro front

### 23.1 IDs vs Slugs
- `eventId` (UUID) — uso interno, APIs admin, deep-links mobile
- `eventSlug` (string) — URL bonita (`/event/festival-eletronica-sp-2026`)
- Use `/events/slug/:slug` no público, `/events/:id` em todos os outros casos

### 23.2 Dinheiro sempre em centavos
**Nunca floats.** Tudo é `priceCents`, `balanceCents`, `totalCents`. Formate na view com `(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.

### 23.3 Datas
Sempre **ISO 8601 UTC**. Front converte com `new Date(iso).toLocaleString('pt-BR')` ou date-fns.

### 23.4 Refresh token rotation
A cada `POST /auth/refresh` o **refresh token também rotaciona**. Front precisa atualizar o storage. Não chamar `/refresh` em paralelo (race condition) — usar mutex.

### 23.5 QR de ingresso
- O QR contém `${ticketHash}:${totp6digits}`
- TOTP gerado **localmente no app** com `totpSecret` baixado uma vez via `/tickets/:id/totp-secret`
- TOTP rotaciona a cada 30s — front mostra contador e re-renderiza QR

### 23.6 Idempotency
SEMPRE envie `Idempotency-Key: <uuid>` em endpoints marcados na §1.5. Se o request falhar (timeout), o retry com a mesma key recupera a mesma resposta sem criar duplicado.

### 23.7 Empty states
- `/events/recommendations` — pode retornar `[]` se user é novo (mostre CTA "Compre seu 1º ingresso")
- `/friendships/me` — `[]` para usuário novo (CTA "Adicione amigos por email")
- `/achievements/me` — sempre retorna 6 itens (catálogo seed); filtra `unlockedAt != null` pra mostrar "conquistados"

### 23.8 Erros 409 (conflict)
Vários endpoints retornam 409 em casos legítimos:
- `POST /payments/checkout` 409 → batch esgotou no meio da reserva (mostre "evento esgotou, volte pra home")
- `POST /customer-orders` 409 → idempotency-key reutilizada com payload diferente (force re-gera UUID)
- `POST /tickets/:id/transfer` 409 → ticket já transferido (recarregue a lista)

### 23.9 Status do evento e do ticket — UI
- `status = 'cancelled'` → mostre banner vermelho permanente, esconda CTA
- `status = 'finished'` → mostre badge "Encerrado", reviews permitidos
- `status = 'ongoing'` → mostre badge "AO VIVO" verde piscando, expõe VenueMap heatmap

### 23.10 Mobile push tokens
- Após login, app envia: `PUT /users/push-token` com `{pushToken, deviceFp}`
- Expo tokens E FCM tokens aceitos (backend roteia automaticamente)
- Re-enviar se token muda (rotação periódica do Expo)

### 23.11 Multi-tenant URL pattern
Rotas admin sempre seguem `/admin/orgs/:organizationId/...`. Front pega `organizationId` da sessão (após login, dropdown se usuário pertence a múltiplas orgs).

### 23.12 Socket.IO em dev
Em `import.meta.env.DEV && !VITE_API_BASE_URL`, o cliente **não conecta** ao Socket.IO (evita flood de erros no console). Front deve fallback pra polling em dev sem VITE_API_BASE_URL setado.

### 23.13 Endpoints que NÃO existem (TODOs)
Não há endpoint público para listar POSes de um evento (só admin). Quando o mobile precisar de "lista de bares no evento atual", precisamos criar:

```
GET /api/v1/events/:eventId/pos-public
→ filtra type IN ('bar','mobile','totem','vip_lounge','food_truck')
→ retorna só id, name, location (sem dados sensíveis)
```

Adicionar ao backlog.

---

**Documento gerado: 2026-05-28**
**Próximo entregável:** `SCREEN_ENDPOINT_MATRIX.md` (qual tela usa qual endpoint, com estados de erro/loading/empty).
