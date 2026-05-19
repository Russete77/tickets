# PLANO DE EXECUÇÃO — Fechamento dos 3 buracos

**Data:** 2026-05-12
**Base:** `master` @ `2aca046`
**Referência de convenções:** [`CONVENCOES_CODIGO.md`](./CONVENCOES_CODIGO.md)
**Ordem:** técnica (schema → segurança/compliance → Engine 5)

---

## Justificativa da ordem

| Fase | Por que vem aqui | Risco de não vir |
|---|---|---|
| **1. Schema** | Tem campos faltando que **outras fases dependem** (`deviceFp` pra antifraude, `offlineLimit` pra cashless, `version` pra concorrência). Trivial mas crítico. | Antifraude da fase 2 fica sem chão. Cashless da fase 3 fica com bug latente |
| **2. Segurança + Compliance** | Bloqueia **go-live em produção brasileira** (LGPD) e fecha vulnerabilidades reais (TOTP só valida, biometria ausente). | Não pode lançar, ponto |
| **3. Engine 5 Super App** | É o **diferencial estratégico** mas não bloqueia operação. Sympla+AZList+ZigPay killer funciona sem ele. | Atrasa a promessa "10x melhor" do PRD |

---

# FASE 1 — Schema (2 dias de trabalho efetivo)

## Objetivo
Adicionar 3 campos faltantes via 1 migration única, seguindo convenções (camelCase Prisma + `@map` snake_case + `@db.Uuid`/`@db.Timestamptz`).

## Mudanças

### 1.1 Migration: `{timestamp}_add_antifraude_and_offline_limits`

```sql
-- Ticket: device fingerprint para antifraude
ALTER TABLE "Ticket"
  ADD COLUMN "device_fp" varchar(128);
CREATE INDEX "Ticket_device_fp_idx" ON "Ticket"("device_fp");

-- CashlessWallet: limite offline configurável + optimistic locking
ALTER TABLE "CashlessWallet"
  ADD COLUMN "offline_limit" integer NOT NULL DEFAULT 20000,
  ADD COLUMN "version" integer NOT NULL DEFAULT 0;
```

**Defesas:**
- `device_fp` nullable (legacy tickets não têm)
- `offline_limit` com default 20000 cents (R$ 200 — espelhando PRD §4.4.1)
- `version` com default 0 — `prisma.$transaction` pode usar pra optimistic locking

### 1.2 Schema Prisma (`prisma/schema.prisma`)

```prisma
model Ticket {
  // ... campos existentes ...
  deviceFp  String?  @map("device_fp") @db.VarChar(128)
  
  @@index([deviceFp])
}

model CashlessWallet {
  // ... campos existentes ...
  offlineLimit Int @default(20000) @map("offline_limit")
  version      Int @default(0)
}
```

### 1.3 Uso

- `Ticket.deviceFp` populado no momento de **criar reserva** (`tickets/reservation.service.ts` — receber via header `X-Device-Fingerprint` ou body)
- `CashlessWallet.offlineLimit` lido pelo mobile no boot (`/cashless/wallet/me` ou `/cashless/config/me`), respeitado no PDV offline
- `CashlessWallet.version` usado em `transaction.service.ts` em débito/recarga via `prisma.$transaction` (where `version`, update `version: { increment: 1 }`)

### 1.4 Testes
- Atualizar `tickets/__tests__/reservation.service.test.ts`: validar que `deviceFp` é gravado
- Atualizar `cashless/__tests__/wallet.service.test.ts`: validar `offlineLimit` retornado
- Adicionar `cashless/__tests__/transaction.service.test.ts`: simular race condition com `version`

### 1.5 Backfill
- **Não necessário.** Todos os campos têm default ou são nullable.

### 1.6 Definition of Done
- [ ] Migration roda em ambiente limpo (`docker-compose up` + `npm run db:migrate`)
- [ ] `npm run db:generate` regenera client sem erro
- [ ] Tests passam (`npm test -w ticketeria-api`)
- [ ] Typecheck passa
- [ ] Commit único: `feat(api): add deviceFp + offlineLimit + version (antifraude foundations)`

---

# FASE 2 — Segurança + Compliance (1-2 semanas)

## Objetivo
Fechar os bloqueadores P0 de produção: TOTP rotativo backend, biometria mobile, LGPD endpoints, lógica de `riskScore`, worker fraud-detection.

## 2.1 TOTP rotativo backend

**Problema atual:** `Ticket.totpSecret` existe no schema. Mobile usa `otplib` localmente. Backend só **valida** (não gera/rotaciona/expõe secret de forma segura).

**Solução:**
- Novo módulo: `src/modules/tickets/totp/` com `totp.service.ts` + tests
- Geração do `totpSecret` (32 bytes base32 via `otplib.authenticator.generateSecret()`) **na emissão do ticket** (`emit-tickets.worker.ts`)
- Endpoint protegido `GET /api/v1/tickets/:id/totp-secret` retorna o secret **só pro dono** do ticket (validar `req.user.id === ticket.userId`)
- Mobile recebe o secret uma vez, salva em `expo-secure-store`
- Validação no checkin já existe (`checkin.service.ts` — anti-replay Redis OK)

**Arquivos a criar:**
```
src/modules/tickets/totp/
├── totp.router.ts
├── totp.service.ts
├── totp.validators.ts
└── __tests__/totp.service.test.ts
```

**Convention check:** `assertTicketBelongsToUser(ticketId, userId)` em `shared/` se ainda não existir.

## 2.2 Worker fraud-detection

**Arquivo:** `src/jobs/workers/fraud-detection.worker.ts`

**Trigger:** após cada `CheckinLog` criado (BullMQ event listener ou enqueue dentro de `checkin.service.ts`)

**Lógica:**
- Query: mesmo `ticketHash` com 2+ checkins em <60s?
- Se sim: criar `AuditLog` com `action: FRAUD_DUPLICATE_CHECKIN_DETECTED`, emit Socket.IO `event:${eventId}` payload `{ type: 'fraud_alert', ticketId, ... }`, marcar `Ticket.flagged = true` (campo a adicionar? — verificar se já existe `riskScore` permite uso similar)

**Teste:** simular 2 checkins do mesmo ticket em janela, esperar AuditLog.

## 2.3 Lógica de `riskScore` na compra

**Onde:** `tickets/reservation.service.ts` (método `reserve`)

**Inputs:** `userId`, `deviceFp` (novo), `ipAddress`, `eventId`, `batchId`, `quantity`

**Cálculo (regra simples, refinar):**
- Base 0
- +20 se `quantity > 4`
- +30 se mesmo CPF já tem N tickets nos últimos 7 dias
- +25 se IP/deviceFp tem >5 tentativas/5min
- +40 se velocidade de compra (timestamp delta) <1s desde view do batch
- Threshold P1: 70 → review manual (campo `Ticket.status = pending_review` em vez de `active`)

**Convention check:** criar `shared/antifraud.ts` com função pura `computeRiskScore(input)`. Testar isoladamente (sem prisma).

## 2.4 Biometria mobile

**Pacotes:**
```bash
npx expo install expo-local-authentication
```

**Arquivos:**
- `ticketeria-mobile/src/lib/biometrics.ts` — wrappers `isBiometricsAvailable()`, `authenticate(reason)`
- Integração em:
  - `LoginScreen.tsx`: opção "Entrar com Face ID/digital" se hash refresh token armazenado em `expo-secure-store`
  - `CashlessPOSScreen.tsx`: confirmar débito acima de R$50 com biometria
  - `MyTicketsScreen.tsx`: revelar QR só após biometria (opcional, configurável)

**Settings:** nova tela `SettingsScreen` (ou aba) com toggle "Exigir biometria para [Login | Pagamento | Ingresso]".

## 2.5 LGPD endpoints

**Convention check:** novo módulo `src/modules/lgpd/`

**Endpoints:**
- `GET /api/v1/lgpd/me/export` — gera ZIP com:
  - `profile.json` (User + Producer/OrganizationMember filtrado)
  - `tickets.json` (todos os Ticket do user)
  - `transactions.json` (CashlessTransaction onde user é dono)
  - `audit-trail.json` (AuditLog onde actorId = req.user.id)
  - Worker BullMQ assíncrono (export grande) → email via Resend com link R2 expirável 24h
- `DELETE /api/v1/lgpd/me` — anonimização (não deleta de fato — substitui campos PII por `[REDACTED-{userId-prefix}]`, mantém integridade referencial)
  - Confirma com password + 2FA se ativo
  - Audit log `LGPD_USER_ANONYMIZED`
  - Webhook outbound `user.anonymized` para integrações externas

**Política:** documento `LGPD_POLICY.md` no repo (template, time jurídico revisa).

## 2.6 Definition of Done — Fase 2
- [ ] TOTP: secret expostor seguro + mobile lê via secure-store + checkin valida
- [ ] Worker fraud-detection: roda nos testes + dispara em duplicata real
- [ ] riskScore: função pura testada + integrada no fluxo de reserva
- [ ] Biometria: 3 telas integradas + toggle em settings
- [ ] LGPD export: gera ZIP via worker + email
- [ ] LGPD anonimização: endpoint funcional + audit log
- [ ] `LGPD_POLICY.md` esqueleto criado
- [ ] Cobertura novos módulos ≥80%
- [ ] Commits separados por feature (rastreabilidade)

---

# FASE 3 — Engine 5 Super App (4-6 sprints, incremental)

> **Decisão estratégica pendente:** lançar produção MVP **sem** Engine 5 (P1, vira v1.2) ou **com** Engine 5 mínimo (P0, atrasa 2-3 meses)?
>
> Recomendação: **lançar sem, entregando Engine 5 incremental nas semanas seguintes**. Razão: as engines 1-4 já matam Sympla+AZList+ZigPay separadamente. Super App é diferenciação de upsell, não de entrada.

## Sprint 1 — Módulo `customer-orders` (pedido pelo bar)

**Backend:**
- Novo módulo `src/modules/customer-orders/`
- Models a adicionar:
  ```prisma
  model CustomerOrder {
    id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    userId          String   @map("user_id") @db.Uuid
    eventId         String   @map("event_id") @db.Uuid
    posId           String   @map("pos_id") @db.Uuid  // bar destino
    status          CustomerOrderStatus @default(pending)
    totalCents      Int      @map("total_cents")
    items           Json     // [{ productId, name, qty, priceCents }]
    pickupCode      String   @unique @map("pickup_code") @db.VarChar(8)
    createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz
    updatedAt       DateTime @updatedAt @map("updated_at") @db.Timestamptz
    walletTxId      String?  @map("wallet_tx_id") @db.Uuid  // FK CashlessTransaction
    preparingAt     DateTime? @map("preparing_at") @db.Timestamptz
    readyAt         DateTime? @map("ready_at") @db.Timestamptz
    deliveredAt     DateTime? @map("delivered_at") @db.Timestamptz
  }
  enum CustomerOrderStatus {
    pending preparing ready delivered cancelled
  }
  ```
- Endpoints:
  - `POST /api/v1/customer-orders` (cliente cria) → debita wallet → Socket.IO emit `pos:${posId}` evento `customer_order:new`
  - `GET /api/v1/customer-orders/me` (cliente lista)
  - `PATCH /api/v1/customer-orders/:id/status` (operador atualiza) → push pro cliente

**Mobile:**
- Nova tela `BarMenuScreen` (lista de POS bares do evento, produtos por bar, cart, confirmar)
- Nova tela `MyOrdersScreen` (lista de pedidos com status visual)
- Worker push: status `ready` → push notification "🍺 Seu pedido está pronto no Bar X"

**Web admin:**
- Nova tela `AdminOrdersQueuePage` no hub cashless: fila de pedidos por POS, drag-drop entre `preparing` → `ready` → `delivered`

**Definition of Done Sprint 1:**
- Cliente faz pedido → vê na tela → status muda → recebe push
- Operador atualiza status → cliente vê em tempo real (Socket.IO)
- 5 testes mínimo (criar, debitar wallet, atualizar status com IDOR, push trigger, cancelar)

## Sprint 2 — Push de remarketing + status triggers

**Backend:**
- Worker `notification-trigger.worker.ts` com regras:
  - `event.starts_in_30min` → push pra todos os tickets do evento
  - `wallet.recharge_confirmed` → push pro user
  - `event.batch_opens` → push pra users com favorito no evento
  - `event.upsell_remarketing` → push 24h após evento com cupom próximo evento da produtora
- BullMQ jobs scheduled via `expo-cron`-like (cron de eventos)

**Push integração FCM:**
- App.json mobile: configurar `googleServicesFile` (precisa do Firebase Service Account JSON — **bloqueador humano**)
- Backend: refinar `push.worker.ts` pra usar FCM nativo quando token FCM disponível, Expo Push como fallback

## Sprint 3 — Mapa do venue (zonas, sem heatmap inicialmente)

**Decisão técnica:** SVG próprio (sem dependência de Mapbox $$$ no MVP).

**Backend:**
- Novo modelo `VenueMap`:
  ```prisma
  model VenueMap {
    id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    eventId   String @unique @map("event_id") @db.Uuid
    svgUrl    String @map("svg_url")  // R2
    zones     Json   // [{ id, name, polygon: [[x,y],...], capacity, color }]
    createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz
  }
  ```
- Endpoint `GET /api/v1/events/:id/map` retorna `{ svgUrl, zones }`

**Web admin:**
- Nova tela `AdminVenueMapEditor` — upload SVG do venue + desenhar polígonos sobre zones + atribuir capacity

**Mobile:**
- Nova tela `VenueMapScreen` — renderiza SVG com `react-native-svg`, zonas clicáveis
- Cada zona mostra capacidade atual (Socket.IO `event:${id}` evento `zone:occupancy`)
- Marcadores: bares (POS), banheiros, primeiros socorros, palcos

## Sprint 4 — Heatmap de ocupação ao vivo

**Backend:**
- Endpoint `GET /api/v1/events/:id/zones/occupancy` (snapshot)
- Worker `zone-occupancy.worker.ts` agrega CheckinLog por zona a cada 10s, publica em Socket.IO
- Cálculo: `(checkins_in - checkins_out) / zone.capacity` → escala HSL verde→amarelo→vermelho

**Mobile:**
- Overlay no `VenueMapScreen` colorindo polígonos por ocupação real

## Sprint 5 — Social mínimo

**Backend:**
- Modelo `Friendship`:
  ```prisma
  model Friendship {
    id           String @id @default(...) @db.Uuid
    requesterId  String @map("requester_id") @db.Uuid
    addresseeId  String @map("addressee_id") @db.Uuid
    status       FriendshipStatus  // pending accepted blocked
    createdAt    DateTime @default(now())
    @@unique([requesterId, addresseeId])
  }
  ```
- Endpoints:
  - `POST /api/v1/friendships/request`
  - `POST /api/v1/friendships/:id/accept`
  - `GET /api/v1/friendships/me`
  - `GET /api/v1/events/:id/friends-present` (quem dos amigos fez checkin)

**Mobile:**
- Nova tela `FriendsScreen` (adicionar via email/QR)
- No `VenueMapScreen` ou Home: badge "X amigos no evento"

## Sprint 6 — Gamificação cross-evento

**Backend:**
- Modelo `Achievement` + `UserAchievement`
- Worker `achievement-evaluator.worker.ts` rodando pós-evento — atribui badges (`first_event`, `5_events`, `first_purchase`, `100_drinks`, etc.)

**Mobile:**
- Nova tela `AchievementsScreen` com badges desbloqueados + progresso pra próximos

---

## Resumo de comandos (uma vez aprovado, executo na ordem)

```bash
# Fase 1
cd ticketeria-api
npx prisma migrate dev --name add_antifraude_and_offline_limits
npm run db:generate
npm test
git commit -m "feat(api): add deviceFp + offlineLimit + version (antifraude foundations)"

# Fase 2 (commits separados — sequência exemplificada)
git commit -m "feat(api): TOTP secret exposed via secured endpoint + emission worker"
git commit -m "feat(api): fraud-detection BullMQ worker for duplicate checkins"
git commit -m "feat(api): riskScore computation in ticket reservation"
git commit -m "feat(mobile): biometric authentication via expo-local-authentication"
git commit -m "feat(api): LGPD data export endpoint + worker"
git commit -m "feat(api): LGPD user anonymization endpoint"
git commit -m "docs: LGPD_POLICY skeleton"

# Fase 3 (uma branch por sprint, mergeada após review)
git checkout -b feature/customer-orders
# ... sprint 1 ...
git checkout -b feature/push-remarketing
# ... sprint 2 ...
# ... etc
```

---

## O que SÓ VOCÊ pode fazer (bloqueadores humanos da Fase 2-3)

| # | Tarefa | Custo/tempo | Quando precisa |
|---|---|---|---|
| 1 | Firebase Service Account JSON → `ticketeria-mobile/google-services.json` | Grátis, 30min Firebase console | Sprint 2 (push FCM nativo) |
| 2 | Apple Developer Program $99/ano + `ascAppId` + `appleTeamId` em `eas.json` | $99, 1-2 dias aprovação | Antes do primeiro EAS build prod |
| 3 | Google Play Console $25 one-time + service account JSON | $25, 1h | Antes do primeiro EAS build Android prod |
| 4 | GitHub Actions secrets (`CI_JWT_*`, `CLOUDFLARE_*`, `PROD_API_BASE_URL`, `EXPO_TOKEN`, `R2_*`, `RESEND_*`, `SENTRY_DSN`) | Grátis, 1h | Antes do primeiro deploy via CI |
| 5 | Política de privacidade + DPA revisados por advogado LGPD | R$ 2-8k, 1-3 semanas | Antes de Fase 2.5 entrar em prod |
| 6 | Credenciais Pagar.me produção | Grátis, dependente de aprovação Pagar.me | Antes de fallback gateway atuar em prod |
| 7 | Provisionar Meilisearch (VPS self-host ou Meilisearch Cloud ~$30/mês) | $30-100/mês | Antes da feature search escalar |

---

## Próximo passo

Aguardo aprovação **explícita** da ordem (1→2→3) e do plano da Fase 1 antes de tocar em qualquer arquivo de produção. Se a ordem aprovada for diferente, ou se quiser que comece por uma fase só (ex.: "começa pela 1 e me mostra antes da 2"), me diz que ajusto.

**Sugestão de primeiro corte:** aprovar Fase 1 isoladamente, eu executo, mostro o diff, validamos, e só então abrimos Fase 2.
