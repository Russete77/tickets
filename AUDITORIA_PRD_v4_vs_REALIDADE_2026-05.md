# AUDITORIA PRD v4.0 vs REALIDADE

**Data:** 2026-05-12
**Branch base:** `master` @ `2aca046` (pós-merge `feature/cashless-admin-cruds`)
**Escopo:** Toda a stack (`ticketeria-api`, `ticketeria-web`, `ticketeria-mobile`) cruzada contra PRD v4.0 seções 4-10.

---

## TL;DR — Verdade nua e crua

O sistema entrega **~85% do PRD** e em vários pontos **excede** o documento (46 models no schema vs 17 prometidos, 37 módulos vs 35, 11 workers BullMQ vs 7, multi-gateway Asaas+Pagar.me já operacional, NFC/Sunmi de v1.2 já codado). O backbone está mais maduro do que o PRD descreve.

Os 15% que faltam estão concentrados em **dois buracos bem definidos**:

| Buraco | Tamanho | Razão |
|---|---|---|
| **Engine 5 — Super App** (§4.5) | ~80% missing | Mapa interativo, pedido pelo bar, social/gamificação, push de remarketing — quase nada existe |
| **Operacionalização** (secrets, EAS, LGPD, biometria, load tests) | ~50% missing | Trabalho humano + infra, não é mais código |

**Conclusão de uma frase:** o produto compete com Sympla+AZList+ZigPay hoje na engine 1-4. Para entregar a promessa de "Super App diferencial 10x" do PRD, faltam 4-6 sprints. Para go-live em staging com tráfego real, faltam 1-2 semanas de operação humana.

---

## 1. Visão consolidada por Engine

| Engine | PRD § | Status | % feito | Maior gap |
|---|---|---|---|---|
| 1 — Ticketeria | 4.1 | ✅ Pronto | ~95% | Falta worker de detecção de scalper + lógica `riskScore` |
| 2 — Guest List & Promoters | 4.2 | ✅ Pronto | ~90% | Falta gamificação avançada (badges além de tiers) |
| 3 — Check-in Engine | 4.3 | ⚠️ Parcial | ~80% | TOTP só valida — não gera/rotaciona no backend; worker de fraude duplicado missing |
| 4 — Cashless Engine | 4.4 | ✅ Pronto | ~95% | Falta `offlineLimit` no schema da wallet (validação só em código) |
| 5 — Super App | 4.5 | ❌ Faltando | ~20% | Mapa, pedido pelo bar, social, gamificação, remarketing — quase tudo |

Detalhamento abaixo.

---

## 2. Engine 1 — Ticketeria (§4.1)

### Implementado
- ✅ Reserva atômica via `prisma.$transaction()` + Redis TTL para expiração (`expire-reservations.worker.ts`)
- ✅ Optimistic locking no `TicketBatch` (campo `version`)
- ✅ Fila inteligente / flash-sale virtual (`src/middleware/flashSaleQueue.ts`, 182 linhas — Redis sorted set, `zrank/zadd/zrem`, position + ETA)
- ✅ Anti-overbooking confirmado
- ✅ Webhooks Sympla + Ingresso.com com HMAC SHA256 + idempotência Redis 24h (`webhooks-external.service.ts`)
- ✅ Multi-gateway (Asaas primário + Pagar.me fallback) — `gateways/gateway.registry.ts`
- ✅ Pix + cartão via Asaas, comprovante por Resend

### Gaps
| Gap | Impacto | Prioridade |
|---|---|---|
| Campo `riskScore` existe no schema mas **nenhuma lógica calcula** | Antifraude superficial em compra | **P1** |
| Campo `deviceFp` **NÃO existe** no model `Ticket` (PRD prevê) | Sem fingerprint por device em fraude | **P1** |
| `advancedRateLimiter` aplicado globalmente, mas sem buckets separados por CPF/IP/cartão como PRD descreve | Antifraude menos granular | P2 |
| Detecção de scalper (padrões repetidos em 5min) não implementada | Vulnerável a bots organizados | **P1** |

---

## 3. Engine 2 — Guest List & Promoters (§4.2)

### Implementado
- ✅ Models completos: `GuestList`, `GuestListConfig`, `GuestEntry`, `Promoter`, `PromoterAssignment` (com tier bronze/silver/gold/diamond)
- ✅ Self-registration pública: `/features/guest-registration/GuestRegistrationPage.tsx` (rota `/guest/:slug`)
- ✅ Promoter dashboard web: `/features/promoter/PromoterDashboardPage.tsx` (KPIs, tier badges, ranking, taxa de conversão)
- ✅ Import CSV de convidados (módulo `guest-lists` na API)
- ✅ Virada de lista por horário via `batch-schedule.worker.ts`
- ✅ Campos custom: `EventFormField` + `TicketFormResponse`

### Gaps
| Gap | Impacto | Prioridade |
|---|---|---|
| Gamificação além de tier (badges, achievements, "primeiro convidado", "fechou 100 entradas") | Engajamento de promoter | P2 |
| Promoter sem dashboard mobile (só web) | Promoter em campo precisa do app | **P1** |
| Sem leaderboard cross-evento | Competição entre promoters | P2 |
| Sem digital link share nativo (gerar link, copy, share-sheet) | Fricção pra distribuir convite | P2 |

---

## 4. Engine 3 — Check-in Engine (§4.3)

### Implementado
- ✅ JWT RS256 no Socket.IO handshake (`src/server.ts` — `jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] })`)
- ✅ Anti-replay Redis: `checkin:qr:${ticketHash}:${totpCode}` com TTL 300s + NX (`checkin.service.ts`)
- ✅ Validação em < 200ms (rota `/checkin/validate`)
- ✅ Modo offline mobile: SQLite (`expo-sqlite` v16) com tabelas `offline_tickets`, `pending_checkins` (`lib/offlineDb.ts`, 235 linhas)
- ✅ Modo offline web: IndexedDB (`shared/lib/offlineTickets.ts`, 328 linhas, com export/import/cleanup/quota)
- ✅ Scanner nativo: `expo-camera` CameraView (`CashlessPOSScreen.tsx`, `CheckinScreen.tsx`)
- ✅ Feedback visual (verde/vermelho/laranja) implementado
- ✅ Broadcast Socket.IO de checkins em tempo real

### Gaps
| Gap | Impacto | Prioridade |
|---|---|---|
| **TOTP backend só VALIDA — não gera nem rotaciona** | Mobile usa `otplib` localmente; backend precisa expor secret seguro | **P0** |
| Worker `fraud-detection` (mesmo ticket 2x em <1min) **não existe** | Detecção reativa só, não proativa | **P1** |
| `deviceFp` no Ticket missing | Sem fingerprint na hora do checkin | **P1** |
| 100+ dispositivos = 2000 checkins/s — sem load test que comprove | PRD afirma sem evidência | **P1** |
| Worker conflict detection (mesmo ticket em 2 portas offline) não codificado explicitamente | Vulnerabilidade quando 2 portas offline | **P1** |

---

## 5. Engine 4 — Cashless Engine (§4.4)

### Implementado
- ✅ Wallet com `balanceCents` (nunca calculado) + `CashlessTransaction` com `balanceAfter` (log imutável)
- ✅ Débito atômico via `prisma.$transaction()` (`cashless/transaction.service.ts`)
- ✅ Recarga Pix via Asaas webhook (`topup.service.ts` + webhook configurado em `producers/onboarding.service.ts`)
- ✅ POS CRUD completo: `PointOfSale`, `POSOperator`, `POSProduct`, `StockMovement`, `ProductCategory` (recém-mergeado)
- ✅ 5 telas admin cashless web: Hub, POS, Categories, Products, Operators, Stock Overview
- ✅ Mobile POS: `CashlessPOSScreen.tsx` (461 linhas — QR scan, cart, charge mutation)
- ✅ NFC adapter (`nfc.adapter.ts` no backend + `nfcReader.ts` mobile + `posOfflineQueue.ts`) — **adiantado da v1.2**
- ✅ Multi-tenancy: `Organization`, `OrganizationMember`, `LedgerAccount`, `LedgerEntry`
- ✅ Bcrypt-only login para operadores (fix do bug do pin legacy)
- ✅ Image upload R2 (`imageProcessor.ts` sharp 800x800 q85 + `r2.ts` S3 client)

### Gaps
| Gap | Impacto | Prioridade |
|---|---|---|
| `offlineLimit` **não existe** no schema da `CashlessWallet` (validação só em código de aplicação) | Difícil ajustar por plano sem deploy | **P1** |
| Campo `version` (optimistic lock) **NÃO existe** na `CashlessWallet` | Risco de race em recarga concorrente | **P1** |
| Mobile POS marcado como "futuro: cache em expo-sqlite" (linha 11) — offline ainda stub | PDV vai cair em venue sem sinal | **P0** |
| Fechamento automático pós-evento + saque Pix automatizado — sem evidência de worker dedicado | Sobra de caixa parado | **P1** |
| Bonus de recarga (R$100 → R$110) — sem evidência de regra configurável por evento | Feature de marketing perdida | P2 |

---

## 6. Engine 5 — Super App (§4.5) — **MAIOR BURACO**

### Implementado
- ✅ Home com QR + saldo cashless (HomeScreen mobile + Wallet web)
- ✅ Push notifications receive (`expo-notifications` + `useNotifications.ts`)
- ✅ Promoter tier badges (gold/silver/bronze) na web

### Gaps (a maior parte do engine)
| Gap | PRD | Impacto | Prioridade |
|---|---|---|---|
| **Mapa interativo do venue** (zonas, heatmap multidão, friends location, alertas de proximidade) | §4.5.3 | Diferencial central — só Google Maps iframe estático existe | **P1** |
| **Pedido pelo app no bar** (selecionar bar, produtos, status preparando→pronto→entregue, push, retirada VIP) | §4.5.2 | "Zero fila no bar" = a venda da plataforma. Não existe NADA | **P1** |
| **Social** (amigos, ver quem está no evento, ranking com amigos, badge de evento) | §4.5.4 | Engajamento + viralidade | P2 |
| **Promoter digital no app** (usuário compartilha link + pontos por check-in) | §4.5.4 | Aquisição orgânica | P2 |
| **Push de remarketing** (show começando, recarga, pedido pronto, abertura de lista, próximo evento) | §4.5.5 | Tem o canal, não tem os triggers no backend | **P1** |
| **Dynamic pricing alert** ("ingresso do próximo lote por X tempo") | §4.5.5 | Conversão | P2 |
| **Heatmap de multidão em tempo real** | §4.5.3 | Operacional crítico em festival | P2 |

**Estimativa para fechar Engine 5:** 4-6 sprints (mapa SVG/Mapbox + módulo `orders` user-facing + tela de pedidos + worker de push de remarketing + social mínimo).

---

## 7. Schema do Banco (§7)

### Implementado
- ✅ 46 models (PRD prometia 17+)
- ✅ 34 enums (PRD prometia 22+)
- ✅ Multi-tenancy via `Organization`/`OrganizationMember`
- ✅ Ledger contábil (`LedgerAccount`, `LedgerEntry`) — além do PRD
- ✅ 7 migrations versionadas em sequência limpa
- ✅ Última migration: `20260508212947_cashless_admin_setup`

### Gaps de schema (recolhidos dos engines)
| Campo | Model | Onde aparece no PRD | Prioridade |
|---|---|---|---|
| `deviceFp` | `Ticket` | §4.1.3, §7.2 | **P1** |
| `offlineLimit` | `CashlessWallet` | §4.4.1 | **P1** |
| `version` (optimistic) | `CashlessWallet` | §6.1 | **P1** |

**Migration necessária:** 1 SQL adicionando 3 campos. Trivial.

---

## 8. API Express — Rotas (§8)

### Implementado (37 módulos, +2 do PRD)
auth, events, tickets, checkin, cashless, guest-lists, promoters, users, producers, payments, affiliates, admin, favorites, live, staff, areas, store, courtesies, box-office, waitlist, price-rules, permissions, credentials, certificates, insurance, form-fields, **+ orders, notifications, reports, webhooks-external, webhooks-outbound, gateways, health, api-keys, search, organizations, ledger**.

Todos wired em `app.ts` com prefixo `/api/v1/`. Health check + Swagger `/api-docs` presentes.

### Gaps
| Gap | Prioridade |
|---|---|
| Módulo `orders` existe mas é **B2B (POS→cliente)**, não B2C (usuário→bar) — falta endpoint customer-facing "criar pedido no bar" | **P1** |
| LGPD: faltam `GET /users/me/data` (export) e `DELETE /users/me` (anonimização) | **P0** (compliance) |
| Sem rota para "amigos no evento" (Engine 5 social) | P2 |
| Sem rota para "heatmap por zona em tempo real" | P2 |

---

## 9. Segurança e Anti-fraude (§9)

### Implementado
- ✅ JWT RS256 com par de chaves (par no `env.ts`)
- ✅ TTL 5min em token guest list
- ✅ Anti-replay Redis 5min window em check-in
- ✅ `helmet`, CORS allow-list (FRONTEND_URL, ADMIN_URL, CHECKIN_URL), `requestId` middleware
- ✅ Rate limit: `advancedRateLimiter` (custom) + `express-rate-limit` (global)
- ✅ `bcryptjs` cost 10-12 nas senhas
- ✅ Zod validation em 73 lugares
- ✅ Idempotency middleware (`/middleware/idempotency.ts`)
- ✅ Audit log imutável (`shared/audit.ts`)
- ✅ Anti-IDOR helpers (`cashless/shared/orgScope.ts`) — recém-mergeado

### Gaps
| Gap | Prioridade |
|---|---|
| **TOTP rotativo no backend** — `totpSecret` no Ticket mas geração rotativa só no mobile (`lib/totp.ts` com `otplib`). Backend precisa expor secret de forma segura + rotacionar | **P0** |
| **Biometria mobile** — `expo-local-authentication` **não está instalado**. PRD §1.3 + §4.3 prometem Face ID/digital | **P1** |
| **Lógica de `riskScore`** — campo existe, sem cálculo (limites por CPF/IP, score em rota de compra) | **P1** |
| Worker BullMQ de fraude duplicada (ticket 2x em <1min) | **P1** |
| Pen test externo — listado como ALTA na auditoria CTO 05 | **P0** pra festival 80k+ |
| LGPD compliance: ausência de DPA + política privacidade + endpoints de export/delete | **P0** pra launch BR |

---

## 10. Relatórios Excel (§5)

### Implementado
- ✅ ExcelJS v4 em `reports.excel.service.ts` (607 linhas)
- ✅ 7 das 9 abas: Resumo Executivo, Lista Convidados, Por Promoter, Por Lista, Por Hostess, Análise Temporal, Por Gênero
- ✅ Paleta de cores PulsePass, headers estilizados, data bars

### Gaps
| Gap | Prioridade |
|---|---|
| Aba 8 — **Cashless e Financeiro** (receita total, ticket médio, color scale verde) | **P1** |
| Aba 9 — **KPIs Avançados** (20+ indicadores) | **P1** |
| Charts embutidos (line chart temporal, pie chart por lista, bar chart promoter) — ExcelJS suporta mas implementação atual usa só formatação de células | P2 |

---

## 11. Infra, Deploy e Observabilidade (§10)

### Implementado
- ✅ Backend `Dockerfile` multi-stage Node 20-alpine, non-root uid 1001, healthcheck (~180MB)
- ✅ GitHub Actions: `ci.yml` (lint+typecheck+unit+integration+e2e+gitleaks) + `deploy.yml` (Docker GHCR + CF Pages + EAS)
- ✅ `Caddyfile` produção (HTTPS, HSTS 1y, X-Frame-Options: DENY, access logs JSON, rate limit)
- ✅ `docker-compose.yml` dev (Postgres 16-alpine + Redis 7-alpine + healthchecks)
- ✅ 59 env vars em `.env.example` (todos os do PRD)
- ✅ Sentry frontend+backend (tracesSampleRate 0.2 prod / 1.0 dev)
- ✅ Pino estruturado + pino-pretty dev + request ID + audit imutável
- ✅ `setup.sh` + `setup.ps1` funcionais
- ✅ ESLint + Prettier (`no-explicit-any: warn`, `no-console: warn`)
- ✅ EAS `eas.json` com profiles dev/preview/production + OTA configurado

### Gaps operacionais (você ou time precisa fazer)
| Gap | Onde | Prioridade |
|---|---|---|
| **Secrets do GitHub Actions** ausentes (`CI_JWT_*`, `CLOUDFLARE_*`, `PROD_API_BASE_URL`, `EXPO_TOKEN`) | Repo Settings → Secrets | **P0** |
| **EAS credentials** com `ascAppId`/`appleTeamId`/`serviceAccountKeyPath` vazios | Apple Dev + Google Play + `eas.json` | **P0** pra build mobile prod |
| Husky pre-commit hooks ausentes | Repo root | P2 |
| Backup/DR runbook + script de restore drill | `PRODUCTION.md` | **P1** |
| Provisionar Meilisearch (self-host VPS ou Typesense Cloud) | Infra | **P1** |
| Firebase Service Account p/ FCM nativo | `app.json` mobile | **P1** |

---

## 12. Qualidade e Testes

### Estado atual
- API: **33** arquivos de teste (vitest, coverage v8, baseline 50%)
- Web: **14** arquivos de teste (vitest)
- E2E: **8** specs Playwright (auth, event, checkout, admin, checkin, search, event-detail, home)
- **Cobertura real: ~45%** (PRD/meta interna: 70% nos críticos)

### Gaps
| Gap | Prioridade |
|---|---|
| Cobertura críticos (payments, checkout, ledger, multi-tenant, cashless) abaixo de 70% | **P1** |
| **~9.168 ocorrências de `any`** na API (TS strict efetivamente furado) | **P1** |
| **Load tests k6** — ZERO scripts em `tests/load/` | **P0** pra festival |
| Sem testes mobile (Jest/Detox/Maestro) | **P1** |
| i18n web só em ~40% das features (mistura `t()` + hardcoded) | **P1** |
| i18n backend (erros) — 100% hardcoded em português | P2 |

---

## 13. Compliance e Negócio

| Item | Status | Prioridade |
|---|---|---|
| LGPD: política de privacidade + DPA + termos | ❌ Missing | **P0** |
| LGPD: endpoint export `/users/me/data` | ❌ Missing | **P0** |
| LGPD: endpoint delete `/users/me` (anonimização) | ❌ Missing | **P0** |
| Audit log já presente | ✅ | — |
| Pen test externo | ❌ Não feito | **P0** pra festival 80k+ |
| Reunião Sunmi BR + lote 50 V2s | ❌ Comercial pendente | P2 (hardware POS) |
| Drop `Event.producerId` legado | ⚠️ Migration pronta, esperar 30d dual-state | P1 (já mergeada `20260601000000_event_drop_legacy_producer`) |

---

## 14. Roadmap priorizado por nível de "produção"

### Nível 1 — Staging dev (1 semana)
**Bloqueadores P0:**
1. Rodar `npm run db:generate && npm run db:migrate` em ambiente sem restrição de filesystem
2. Aplicar `backfill-organizations --apply` no banco real
3. Aplicar `backfill-cashless-admin --apply` (veio com o merge)
4. Configurar Secrets do GitHub Actions
5. Setar env vars críticas no host de staging
6. **TOTP rotativo backend** (Engine 3, blocker funcional do app)
7. **PDV offline mobile** (Engine 4, blocker funcional)
8. **LGPD endpoints** (compliance — não dá pra subir banco real no BR sem isso)

### Nível 2 — Staging com beta-testers (+1-2 semanas)
**P1 funcional:**
9. Aba 8 + Aba 9 Excel (cashless financeiro + KPIs avançados)
10. Lógica `riskScore` + worker fraud-detection BullMQ
11. Campo `deviceFp` + migration + uso em check-in/compra
12. Campos `offlineLimit` + `version` na `CashlessWallet`
13. Biometria mobile (`expo-local-authentication`)
14. Promoter dashboard mobile
15. Aba Excel adicional + charts embutidos
16. Provisionar Meilisearch + FCM service account

### Nível 3 — Produção MVP (1 produtor pequeno, +2-3 semanas)
**P1 operacional:**
17. Cobertura testes 70% nos críticos (payments, checkout, ledger)
18. Reduzir `any` types em payment gateway + ledger
19. Load tests k6 em staging real
20. Backup/DR drill documentado
21. Sentry alertas + dashboards
22. i18n web 80%+ adoption

### Nível 4 — Engine 5 Super App diferencial (4-6 sprints)
**P1 produto:**
23. **Mapa interativo venue** (Mapbox/SVG com zonas, heatmap, friends location)
24. **Pedido pelo app no bar** (módulo `customer-orders` backend + tela mobile + status tracker)
25. **Push de remarketing** (workers BullMQ pra eventos: show começando, recarga confirmada, pedido pronto, abertura de lista, próximo evento)
26. **Social mínimo** (amigos, ver quem está no evento, ranking)
27. **Promoter digital no app** (gerar/compartilhar link + pontos por check-in trazido)

### Nível 5 — Festival 80k+ pagantes (+4-6 semanas total)
**P0 para escala crítica:**
28. **Pen test externo** (ALTA da auditoria CTO 05)
29. **DPA jurídico + política de privacidade**
30. **Drill DR completo** (restore drill, failover gateway)
31. **Reunião comercial Sunmi BR** + lote 50 V2s pra POS hardware
32. **Validar 2.000 check-ins/s** com load test real (k6 em staging gemêo da prod)
33. **Gamificação avançada** (badges cross-evento, achievements, leaderboard nacional)
34. **Dynamic pricing** (preço sobe conforme demanda + alerta de janela)

---

## 15. Estimativas de esforço (TL;DR)

| Frente | Esforço calendário | Esforço pessoa-dia |
|---|---|---|
| Staging dev (P0 staging) | 1 semana | 5 dias |
| Staging beta-testers (+P1 funcional) | +1-2 semanas | 8 dias |
| Produção MVP (1 produtor) | +2-3 semanas | 15 dias |
| Engine 5 Super App | 4-6 sprints (2-3 meses) | 50-70 dias |
| Festival 80k+ (P0 escala) | +4-6 semanas | 25 dias |
| **Total para "10x melhor que SYMPLA+AZList+ZigPay"** | **~5-7 meses calendário** | **~100-120 dias** |

---

## 16. Próximas 5 decisões de produto

| # | Decisão | Trade-off |
|---|---|---|
| 1 | Engine 5 Super App é P0 pra diferenciar OU é v1.2? | "10x melhor" promete super app. Sem ele, está empatado com Sympla+ZigPay |
| 2 | Mapbox vs Google Maps vs SVG próprio pro mapa do venue | Mapbox $$ mas profissional / SVG grátis mas manual |
| 3 | Cashless residual: reverte pra organizador ou mantém pro usuário? | Receita extra vs UX hostil |
| 4 | Lançar como SaaS multi-tenant agora ou single-tenant pro primeiro produtor? | Receita recorrente vs ciclo de validação |
| 5 | Hardware Sunmi: parceria oficial ou compatibilidade-só? | $$$$ + 3-6 meses de negociação vs liberdade técnica |

---

## 17. Bloqueadores que SÓ VOCÊ pode resolver (não dá pra delegar pra Claude)

1. **Configurar Secrets do GitHub Actions** — Settings → Secrets and variables → Actions
2. **EAS:** Apple Developer Program ($99/ano) + Google Play Console ($25 one-time) + preencher `ascAppId`, `appleTeamId`, `serviceAccountKeyPath` em `eas.json`
3. **Provisionar Meilisearch** — VPS self-host ou conta Meilisearch Cloud
4. **Firebase Service Account JSON** pra FCM nativo (push Android nativo, não-Expo)
5. **Credenciais Pagar.me** de produção (Asaas você já tem)
6. **Aplicar 3 migrations** em ambiente real: `20260503000000`, `20260503010000`, `20260508212947` + backfills
7. **Gerar JWT keys** com `scripts/generate-keys.ts` e setar em env de prod
8. **Reunião comercial Sunmi BR** se for hardware POS oficial
9. **Contratar pen test** externo antes de festival grande
10. **Política de privacidade + DPA** com advogado de LGPD

---

## 18. Resumo executivo para 1 minuto

O sistema é **operacionalmente staging-ready** depois de 4-5 ações humanas (secrets, migrations, env vars). É **produção-MVP-ready** depois de mais 2-3 semanas de desenvolvimento (TOTP backend, PDV offline mobile, LGPD endpoints, Excel completo, riskScore, biometria). É **competitivo com Sympla+AZList+ZigPay hoje** nas engines 1-4. **Não cumpre a promessa do PRD de "Super App diferencial"** até o Engine 5 sair do papel (estimativa 4-6 sprints).

A maior decisão é Engine 5: ou é P0 e atrasa o launch por 2-3 meses, ou é v1.2 e lança-se "Sympla+AZList+ZigPay killer sem super app" agora, com super app vindo no primeiro upgrade major.

---

**Auditoria gerada em 2026-05-12, baseada no `master` @ `2aca046`.**
Próxima auditoria recomendada: após fechar nível 1 (staging dev).
