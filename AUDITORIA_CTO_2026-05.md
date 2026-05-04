# PulsePass — Auditoria CTO

> **Data:** 03 de maio de 2026
> **Escopo:** Diagnóstico técnico completo do monorepo `ticket-real` com plano de ação para superar Sympla + AZLIST + ZIGPAY combinados.
> **Contexto:** Produto em desenvolvimento ativo, foco em todos os mercados (baladas, festivais, bares, produtores).

---

## TL;DR — Veredito do CTO

A base técnica do PulsePass é **mais sólida do que a de qualquer concorrente isolado** (incluindo o monolito legado AngularJS do AZLIST e a stack PHP do Sympla). Já existe paridade de features com os três concorrentes: **41 modelos no banco, 31 módulos de API, 9 workers BullMQ, app web React 19, app mobile Expo SDK 54, ~63 mil linhas de TS/TSX**. O caminho para superar a soma dos três não é construir mais features básicas — é fechar os 12 gaps abaixo, transformar a plataforma em **produto enterprise white-label**, e construir um motor de growth que aproveite o efeito de rede único da combinação ticketing + lista + cashless.

| Eixo | Status atual | Risco para escalar |
|------|--------------|-------------------|
| Cobertura funcional vs concorrentes | **Paridade ou superior** em quase tudo | Baixo |
| Arquitetura backend (Express 5 + TS + Prisma 7) | **Moderna e bem segregada** | Baixo |
| Concorrência / anti-overbooking | `SELECT FOR UPDATE SKIP LOCKED` correto | Médio (DB único) |
| Segurança / LGPD / observabilidade | Hardening sólido | Baixo |
| **Multi-tenancy** | **Producer atrelado ao User direto** | **Alto** |
| **Cobertura de testes** | 19 arquivos para 36k linhas (~5%) | **Alto** |
| **Estratégia de search/scale** | Postgres puro, sem Algolia/Meili | Alto em festival 100k+ |
| **Hardware cashless (NFC/wristband)** | Schema pronto, integração POS hardware ausente | Alto para venues físicos |
| **Pagamentos (gateway único Asaas)** | Single point of failure | Alto |
| **API pública / SDK** | Inexistente | Médio |
| Diferenciação vs concorrentes | Forte na união, fraca em pontos específicos | Médio |
| GTM / produto B2B white-label | Ausente | Alto |

**Decisão executiva sugerida:** congelar features novas por 60 dias e executar o **Hardening Q2** (seções 6 e 7) antes de tentar onboarding de produtores grandes. Festivais com 80k+ pagantes vão expor cada gap listado abaixo.

---

## 1. Inventário do Sistema

### 1.1 Estrutura do monorepo

```
ticket-real/
├── ticketeria-api/        Backend Express 5 + TypeScript 5.5 (~37k linhas)
├── ticketeria-web/        React 19 + Vite 7 (~19k linhas) — admin + público no mesmo bundle
├── ticketeria-mobile/     Expo SDK 54 + React Native 0.81 (~8k linhas)
├── ticketeria-types/      Pacote de tipos compartilhados (Zod 4 schemas)
├── docs/superpowers/      Documentação interna
├── docker-compose.yml     Postgres 16 + Redis 7 (dev)
└── PRDs e planos          PulsePass_PRD_v4.0.md, BACKEND_MAPEAMENTO_COMPLETO.md, INSTRUCOES_DESENVOLVIMENTO.md
```

### 1.2 Stack consolidada

| Camada | Tecnologia | Observação |
|--------|------------|------------|
| Runtime | Node 20+ | Versão LTS, OK |
| Framework HTTP | Express 5 | Atualizado para v5 (assíncrono nativo) |
| ORM | Prisma 7.7 + adapter-pg | Versão recente, edge-ready |
| Banco | PostgreSQL 16 (Supabase) | Mesma base usada pelos competidores top |
| Cache / fila | Redis 7 + BullMQ 5.12 | Robusto, 9 filas declaradas |
| Real-time | Socket.IO 4.7 | Rooms por evento, produtor, usuário |
| Autenticação | JWT RS256 (assimétrico) + 2FA TOTP | Padrão correto |
| Validação | Zod 4 | Boundary validation em todo o ingress |
| Pagamentos | Asaas (Pix / cartão / boleto) + split | **Single gateway** |
| Push | Expo Push (mobile) — schema pronto, FCM stub | Falta finalizar |
| Email | Resend + circuit breaker | OK |
| Storage | Cloudflare R2 | OK |
| Reports | ExcelJS — 9 abas profissionais por evento | Diferencial real vs concorrentes |
| Observabilidade | Sentry + Pino + métricas Prometheus inline | Sem APM completo (Datadog/Grafana) |
| Webhook integrators | Sympla, Ingresso.com (HMAC SHA256 + idempotência) | Boa estratégia de migração de clientes |
| Web | React 19 + Vite 7 + Zustand 4.5 + TanStack Query 5.56 | Stack atual |
| Mobile | Expo Router 6 + expo-camera + expo-secure-store + expo-sqlite | Suporte a modo offline real |

### 1.3 Cobertura modular do backend

31 módulos no `ticketeria-api/src/modules/`. **Os módulos cobrem todos os pilares de Sympla + AZLIST + ZIGPAY**:

| Pilar | Módulo(s) | Concorrente que ataca |
|-------|-----------|------------------------|
| Ticketing core | `events`, `tickets`, `orders`, `payments`, `price-rules`, `courtesies`, `waitlist`, `box-office` | Sympla, Ingresse |
| Lista / Promoter | `guest-lists`, `promoters` (modelo `PromoterTier` bronze→diamond, share link único) | AZLIST |
| Cashless / POS | `cashless` (config + wallet + transaction + topup), com 6 tipos de POS (`bar`, `mobile`, `totem`, `vip_lounge`, `food_truck`, `backstage_pos`) | ZIGPAY |
| Operação | `staff`, `areas`, `credentials`, `certificates`, `insurance`, `form-fields`, `store` | Diferencial real |
| Crescimento | `affiliates`, `favorites`, `live` (social proof, viewers em tempo real) | Crescimento orgânico |
| Plataforma | `auth`, `users`, `producers`, `admin`, `permissions`, `notifications`, `reports`, `webhooks-external`, `health` | Núcleo |

---

## 2. Cobertura de Features vs Concorrentes

### 2.1 Sympla / Ingresse (ticketing)

| Feature | Sympla | PulsePass | Comentário |
|---------|--------|-----------|------------|
| Múltiplos lotes com auto-switch | Sim | **Sim** (`TicketBatch.autoSwitch` + worker `batch-auto-switch.worker.ts`) | OK |
| Meia-entrada (estudante / idoso / PCD / social / jovem) | Sim | **Sim** (`TicketPriceRule` com 9 tipos legais) | Compliance brasileira embutida |
| Cupom desconto fixo / percentual | Sim | Sim (`Coupon`) | OK |
| Afiliados / link de produtor | Limitado | **Sim** (`AffiliateLink` + `Promoter` com share link individual) | Superior |
| Transferência de ingresso com OTP | Sim | Sim (`TicketTransfer` + OTP 15min) | OK |
| Bilheteria física / box office | Não | **Sim** (`BoxOfficeSession`) | Diferencial |
| Cortesias com aprovação | Limitado | **Sim** (`Courtesy` com fluxo `pending→approved→issued`) | Superior |
| Lista de espera | Sim | Sim (`Waitlist` + worker de notificação) | OK |
| Reembolso parcial / taxa Asaas | Sim | Sim, via webhook | OK |
| Anti-overbooking atômico | Sim (filas) | **Sim** (`SELECT FOR UPDATE SKIP LOCKED` + transação Prisma) | Equivalente |
| QR JWT rotativo (não captura de tela) | Não — QR estático | **Sim** (TOTP RFC 6238 + janela 30s + anti-replay Redis) | **Vantagem clara** |
| Loja de upgrades / merch / parking | Não | **Sim** (`StoreItem` com 9 tipos) | Diferencial |
| Anti-fraude com risk score | Limitado | Sim (`RiskService` + device fingerprint + IP + advanced rate limit) | Equivalente ou superior |

**Veredito:** Em ticketing, o PulsePass já é tecnicamente superior ao Sympla. Falta volume e marca.

### 2.2 AZLIST (lista / promoter)

| Feature | AZLIST | PulsePass | Comentário |
|---------|--------|-----------|------------|
| Lista por evento com tipo (free, vip, backstage, press) | Sim | Sim (`GuestListType`) | OK |
| Promoter com link público de inscrição | Sim | Sim (`PromoterAssignment.shareLink` único) | OK |
| Door police (operador entra com ranking de listas) | Sim | Sim (`event_staff` + permissions) | OK |
| Virada de lista por horário (free until 23:30) | Sim | **Sim** (`GuestListConfig.freeUntilHour`, `discountUntilHour`) | OK |
| QR seguro vs captura de tela | **Não** (estático) | **Sim** (TOTP) | **Vantagem clara** |
| Tier gamificado de promoter (bronze→diamond) | Não | **Sim** (`PromoterTier` + `score` + `conversionRate`) | **Vantagem clara** |
| Campos customizados por evento | Sim (GenericField) | Sim (`EventFormField` + `TicketFormResponse`) | OK |
| Plus-ones controlados | Limitado | Sim (`maxPlusOnes`, `plusOnesChecked`) | OK |
| App mobile nativo iOS+Android | **Não** (só web) | **Sim** (Expo SDK 54) | **Vantagem clara** |
| Modo offline na portaria | Não | Sim (worker `sync-checkin-offline` + expo-sqlite) | **Vantagem clara** |

**Veredito:** PulsePass está claramente à frente. AZLIST é vulnerável — campanha de migração agressiva é viável (já existe `webhooks-external` para importar clientes).

### 2.3 ZIGPAY (cashless / bar)

| Feature | ZIGPAY | PulsePass | Gap real |
|---------|--------|-----------|----------|
| Carteira digital com top-up Pix | Sim | Sim (`CashlessWallet` + `CashlessConfig` + `topup.service.ts`) | Paridade |
| Pulseira NFC / cartão físico | Sim (hardware proprietário Mifare DESFire) | Schema pronto (`walletType: wristband|card`, `nfcTagId`), **mas integração com leitor de hardware não implementada** | **Gap crítico** |
| POS dedicado por ponto de venda | Sim (Android dedicado) | Sim (`PointOfSale` com 6 tipos + `POSOperator` com PIN) | OK em modelo, falta app Android dedicado |
| Catálogo de produtos com estoque | Sim | Sim (`POSProduct` + `StockMovement`) | OK |
| Modo offline no PDV | Sim | Schema sugere, app não validado em campo | **Gap crítico** |
| Transações com tip / service charge | Sim | Sim (`tipCents`, `serviceChargePercent`) | OK |
| Refund automático pós-evento | Sim | Sim (`autoRefundAfterEvent`, `refundDeadlineDays`) | OK |
| Conciliação fiscal / NFC-e | Sim | **Não documentado** | **Gap crítico para venues regulados** |
| Ledger contábil double-entry | Sim (interno) | **Não** — usa `balanceAfter` no campo | **Risco de divergência financeira** |
| Hardware homologado | Stone, Pagseguro, Cielo terminais | Não — depende do BYOD do produtor | **Gap real** |

**Veredito:** Em software, paridade. Em **hardware + conciliação fiscal + homologação**, ZIGPAY ainda tem vantagem. Para superar é necessário investir em parceria com fabricante (Sunmi, Gertec) ou homologar terminais existentes.

---

## 3. Pontos Fortes Reais (preservar)

1. **Stack moderna e coerente** — Express 5, Prisma 7, React 19, Expo 54 são versões atuais. AZLIST roda AngularJS (EOL desde 2021).
2. **Anti-overbooking sério** — uso correto de `FOR UPDATE SKIP LOCKED` + transação. Em festival flash sale, isso evita o caos clássico.
3. **QR TOTP rotativo + anti-replay** — barreira efetiva contra captura de tela e revenda fraudulenta. Diferencial técnico real.
4. **LGPD compliant** — endpoints `/me/data` (export), `DELETE /me` (anonimização) com rate limit 3/h. Auditoria já documentada.
5. **Idempotência via `X-Idempotency-Key`** — previne duplicate charge. Implementado corretamente.
6. **Circuit breaker para Asaas / Resend / Expo Push** — evita cascata de falhas quando dependência externa degrada.
7. **Health checks granulares** — `/health/ready`, `/health/full`, `/health/db`, `/health/redis`, `/health/queues` com timeouts. Pronto para Kubernetes.
8. **Métricas Prometheus inline** — sem dependência externa, scrape direto.
9. **Audit log imutável** — `audit_log` com `actorId`, `entityType`, `entityId`, `metadata`, IP, userAgent + indexes corretos.
10. **9 abas Excel profissionais por evento** — diferencial competitivo sério para o produtor sênior. Sympla entrega CSV simples.
11. **Webhook receivers para Sympla e Ingresso.com** — ataque direto à carteira de clientes deles via importação.
12. **Mobile com modo offline** — `expo-sqlite` para sincronizar check-ins quando a conexão volta. Crítico para venues sem sinal.
13. **Documentação executiva existente** — `PulsePass_PRD_v4.0.md`, `BACKEND_MAPEAMENTO_COMPLETO.md`, `INSTRUCOES_DESENVOLVIMENTO.md`. Raro em startups.

---

## 4. Gaps Críticos (resolver no próximo trimestre)

### 4.1 Multi-tenancy frágil — **Risco Alto**

**Problema:** `Event.producerId` aponta para `User` (não para `Producer`). Toda lógica de "este evento pertence a esta empresa" é derivada da relação `User → Producer`. Não há `tenantId` ou `organizationId` no schema. Implicações:
- Um produtor que monta uma equipe (3 sócios + 5 operadores) não tem como compartilhar acesso ao mesmo evento sem hack via `Permission` (modelo genérico `userId+eventId+resource+actions`).
- Inviabiliza white-label real para casas noturnas (a casa precisa de um tenant, com múltiplos eventos, múltiplos usuários por hierarquia).
- Limita o produto B2B mais lucrativo (SaaS por casa).

**Ação:** introduzir `Organization` + `OrganizationMember` (com role: owner/admin/finance/operator/promoter). Migrar `Producer` para `Organization` com profile fiscal (CNPJ + Asaas). Refazer `Event.producerId` → `Event.organizationId`. Plano detalhado na seção 7.

### 4.2 Cobertura de testes baixa — **Risco Alto**

**Problema:** 36.773 linhas de TS no API, 19 arquivos de teste totais (10 unit + 5 integration + 4 outros). Ratio de ~0,5 teste por 1000 linhas de produção. Para um sistema que processa pagamento, lista, cashless e check-in simultâneo, isso é frágil.

**Sinais positivos:** existe estrutura de integração (`tests/integration/`), k6 load tests (`tests/load/checkin.js`, `checkout.js`, `cashless.js`), e helpers reutilizáveis. A fundação está pronta.

**Ação:** meta de 70% de cobertura nos módulos críticos (`payments`, `checkout`, `tickets`, `checkin`, `cashless`) em 60 dias. Adicionar testes de mutação (Stryker) nos módulos financeiros. Expandir e2e Playwright (atualmente 8 specs). CI deve quebrar em coverage drop.

### 4.3 Search e scale em festival 100k+ — **Risco Alto**

**Problema:** busca de eventos roda em Postgres direto (`events.service.ts`, `search.service.ts`). Em flash sale de festival com 200 mil tentativas concorrentes, o Postgres vira gargalo (mesmo com índice composto `[status, startsAt, category]`). Não há Algolia, Meilisearch ou Typesense.

**Ação:**
- Indexar eventos publicados em **Meilisearch** (auto-hospedado, BR latência baixa) ou **Typesense Cloud**. Sync via worker BullMQ on event:created/updated.
- Adicionar **CDN edge cache** para `GET /events/:slug` (Cloudflare Workers ou Vercel Edge) com TTL 60s e invalidação via tag.
- Particionar `tickets` e `cashless_transactions` por `eventId` (Postgres declarative partitioning) para tabelas que vão passar de 100M de linhas.

### 4.4 Hardware cashless ausente — **Risco Alto para venues físicos**

**Problema:** schema modela `CashlessWallet.walletType` (`digital`, `wristband`, `card`) e `nfcTagId`, mas não há SDK / integração com leitor NFC físico (Mifare DESFire EV2 é o padrão de festival). ZIGPAY domina porque entrega kit fechado: pulseira + leitor + POS.

**Ação:**
- Parceria com **Sunmi** (POS Android dedicado, BR-friendly) ou **Gertec MP35**: app PulsePass-POS dedicado.
- Integração com **expo-nfc** ou módulo nativo Android para leitura/escrita Mifare.
- Modo offline robusto no POS com merge conflict resolution (CRDT-like ou last-write-wins por wallet).

### 4.5 Ledger contábil ausente — **Risco financeiro real**

**Problema:** `CashlessTransaction` armazena `balanceAfter` direto. Sem ledger double-entry (debit/credit accounts), qualquer bug ou retry duplicado pode silenciar uma divergência de saldo. Em volume, isso vira crise (cliente acusa: "carreguei R$ 200 e só apareceu R$ 180").

**Ação:** introduzir tabela `LedgerEntry` (account, eventId, walletId, debitCents, creditCents, balanceAfter, txId) com **invariante de fechamento por evento** verificada em job pós-evento. Migrar transações para postar em ledger atomicamente.

### 4.6 Gateway de pagamento único — **Risco alto**

**Problema:** Asaas como single point of failure. Se o Asaas cair em uma sexta-feira de festival, o checkout para — e o produtor culpa o PulsePass. Não há fallback.

**Ação:** abstrair `PaymentGateway` interface no domínio. Implementar **Pagar.me** (Stone) ou **Mercado Pago** como secundário. Strategy pattern com health-check e fallback automático em `PaymentsService.checkout`.

### 4.7 Push notification stub — **Risco médio**

**Problema:** `INSTRUCOES_DESENVOLVIMENTO.md` admite "Email COMPLETO, Push STUB (falta FCM)". Em mobile, push é onboarding e retenção.

**Ação:** finalizar integração Expo Push com fallback para FCM nativo. Métricas de delivery.

### 4.8 Admin no mesmo bundle do público — **Risco médio (perf)**

**Problema:** `ticketeria-web` serve homepage, checkout E todo o painel admin (`Admin*Page` em `features/admin/`). Lazy load ajuda mas inflará o bundle de produtor heavy-user com componentes que cliente final nunca usa.

**Ação:** dividir em duas SPAs separadas (`ADMIN_URL` já existe no env). Compartilhar via `ticketeria-types` e UI kit em pacote interno.

### 4.9 Apenas 3 migrations Prisma — **Risco médio (manutenibilidade)**

**Problema:** o schema tem 1217 linhas e 41 modelos, mas só existem 3 migrations. O `init` é monolítico — qualquer mudança recente foi feita via push, não via migration versionada. Em equipe maior, isso vira pesadelo de rollback.

**Ação:** estabelecer disciplina de uma migration por mudança de schema. Configurar shadow database em CI para detectar drift.

### 4.10 Sem API pública / SDK — **Risco médio (B2B enterprise)**

**Problema:** produtores enterprise (Time For Fun, Live Nation Brasil) querem integrar com Salesforce, RD Station Marketing, HubSpot, e BI próprio. PulsePass só **recebe** webhooks (Sympla/Ingresso) — não **emite** webhooks de domínio nem expõe API pública versionada.

**Ação:**
- Webhook outbound: `event.published`, `order.paid`, `ticket.checked_in`, `cashless.refunded` com HMAC.
- API pública v1 com OAuth client credentials e rate limit por app.
- SDK TypeScript publicado em npm (`@pulsepass/sdk`).

### 4.11 Internacionalização — **Risco baixo (mas trava expansão LATAM)**

**Problema:** tudo em PT-BR. Para Argentina, Chile, Colômbia (mercado natural da expansão), precisa i18n + multi-currency + ajuste fiscal por país.

**Ação:** isolar strings em namespace, i18next no front, campos `Decimal` nas tabelas financeiras já são compatíveis com multi-currency (basta adicionar `currency: VARCHAR(3)`).

### 4.12 Falta produto B2B white-label — **Risco alto (oportunidade perdida)**

**Problema:** o maior LTV no segmento é a **casa noturna**. Vibe, Audio, Ballroom, Trackers querem **plataforma própria** com domínio e branding deles. PulsePass hoje é multi-evento mas não multi-tenant white-label.

**Ação:** depende de 4.1 (multi-tenancy). Depois disso: domínio customizado, theming via CSS variables, app mobile com branding do tenant via Expo EAS Build.

---

## 5. Pontos Fracos Menores

- **Sem PgBouncer / pgcat configurado** — Supabase tem connection pooler mas precisa apontar Prisma para ele em produção. Verificar `DATABASE_URL` aponta para `pooler.supabase.com:6543` em prod.
- **Sem RLS Postgres** — todo acesso passa pela camada Prisma com user mestre. RLS adicionaria cinto-e-suspensório contra bug de aplicação.
- **Sem rate limit por evento (apenas por IP/user)** — flash sale de evento muito popular pode lockar Redis com fila virtual única; precisa shard por eventId.
- **Permission JSON genérico** — modelo `Permission.actions: Json` é flexível demais. Falta enum de actions/resources tipado.
- **Sem product analytics** — sem PostHog, Mixpanel, ou GTM. Decisões de produto vão depender de SQL ad-hoc.
- **Sem CI visível no repo** — `INSTRUCOES_DESENVOLVIMENTO.md` menciona GitHub Actions mas não há `.github/workflows/` óbvio. Validar.
- **Sem disaster recovery documentado** — RPO/RTO não definidos. Ponto de exigência de produtor enterprise.
- **Insurance e Certificate são tabelas sem integração externa** — não há Mapfre/Tokio Marine, nem PDF assinado.
- **Cashless tip options com decimais hardcoded** (`[10, 15, 20]`) — está em JSON do config, OK, mas falta UX para configurar.
- **Sem feature flag rollout por região / tenant** — atual implementação é por % de userId via FNV-1a. Falta dimensão geográfica.

---

## 6. Roadmap de Hardening — 90 / 180 / 365 dias

### 6.1 Próximos 90 dias (Q2 2026) — "Infraestrutura à prova de festival"

| Sprint | Entregável | Owner sugerido |
|--------|------------|----------------|
| 1 | Refatoração multi-tenant (`Organization` + members + RBAC) | Backend lead |
| 1 | Ledger double-entry para cashless | Backend + finance |
| 2 | Cobertura de testes 70% nos 5 módulos críticos | Toda a engenharia |
| 2 | Push FCM finalizado | Mobile lead |
| 3 | Meilisearch / Typesense + sync worker | Backend |
| 3 | Pagamento secundário (Pagar.me) com fallback automático | Backend |
| 4 | API pública v1 + webhooks outbound + SDK npm | Backend + DX |
| 4 | Separação admin SPA do bundle público | Frontend |
| 5 | Hardware POS Android dedicado (POC com Sunmi) | Mobile + parceria |
| 6 | Disaster recovery documentado + drill | DevOps |

**Critério de saída:** pode rodar festival de 80k pagantes simultâneos com SLA 99,9%.

### 6.2 Próximos 180 dias (Q2-Q3 2026) — "Produto enterprise"

- White-label completo por organização (domínio, theming, app mobile com branding via EAS).
- Conciliação fiscal NFC-e integrada (parceria com Focus NFe ou TecnoSpeed).
- BI nativo no admin: dashboards, retenção de público cross-evento, LTV de promoter.
- Marketplace de promoters (`Promoter` cross-organization com reputação).
- Integração nativa com Spotify (lineup), Instagram (gerenciamento de evento), WhatsApp Business (confirmações).
- Plano enterprise SLA com suporte 24/7 e CSM dedicado.

### 6.3 Próximos 365 dias (até maio 2027) — "Liderança regional"

- Expansão LATAM: i18n + multi-currency + integrações fiscais Argentina/Chile/Colômbia.
- AI nativo: precificação dinâmica de lote, recomendação de evento, fraude semântica em comentários.
- Hardware próprio (kit pulseira NFC + leitor) homologado.
- API marketplace com integradores certificados (RD Station, HubSpot, Salesforce, BI tools).
- IPO de dados: vender insights anonimizados para indústria fonográfica e publicidade.

---

## 7. Plano de Refatoração Multi-tenant (mais crítico)

### 7.1 Modelo proposto

```prisma
model Organization {
  id                 String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name               String   @db.VarChar(255)
  slug               String   @unique @db.VarChar(100)
  type               OrgType  // producer, venue, agency, network
  cnpj               String?  @unique @db.VarChar(18)
  asaasAccountId     String?  @unique
  platformFeePercent Decimal  @default(10.00) @db.Decimal(5, 2)
  domain             String?  @unique  // white-label
  branding           Json?    // theming
  createdAt          DateTime @default(now())

  members  OrganizationMember[]
  events   Event[]
  @@map("organizations")
}

model OrganizationMember {
  organizationId String
  userId         String
  role           OrgMemberRole  // owner, admin, finance, operator, promoter
  createdAt      DateTime @default(now())

  @@id([organizationId, userId])
  @@map("organization_members")
}
```

### 7.2 Migração

1. Criar `Organization` para cada `Producer` existente (1:1 inicial).
2. Criar `OrganizationMember` `owner` para cada `User` que era produtor.
3. Adicionar `Event.organizationId` (nullable).
4. Backfill `Event.organizationId = User → Producer → Organization`.
5. Marcar `organizationId NOT NULL`, dropar `producerId` em fase posterior (manter durante migração).
6. Atualizar `requireEventOwnership` para checar `OrganizationMember.role`.
7. Atualizar `requireOrganizationRole(role)` middleware novo.

### 7.3 Impacto

- Desbloqueia white-label B2B (maior LTV).
- Suporta equipes hierárquicas em produtores grandes.
- Remove o vazamento de privilégio entre `User` e `Producer`.

---

## 8. Diferenciação Estratégica vs Concorrentes

A combinação **ticketing + lista + cashless integrados** é o moat real. Nenhum concorrente tem os três. O caminho para liderança não é construir mais features avulsas, e sim **acelerar o efeito de rede da combinação**:

1. **Promoter como moeda cross-evento** — um promoter de balada paulista que vendeu 200 ingressos para uma festa de Vibe ganha tier `gold` que vale para festival X em Floripa. AZLIST não tem essa portabilidade.
2. **Wallet única do participante** — cashless rollover entre eventos do mesmo tenant (até quem participar de um festival, na próxima edição já tem saldo + perfil + histórico). ZIGPAY zera entre eventos.
3. **CRM nativo de produtor** — base de dados unificada entre venda online (Sympla-like) + lista (AZLIST-like) + consumo (ZIGPAY-like). Isso permite remarketing impossível para concorrentes isolados.
4. **Anti-fraude global** — dispositivo, CPF, cartão e padrão de consumo cruzados entre eventos. Em ataques organizados (cambistas, fraude de cartão), isso bloqueia mais cedo.
5. **Excel profissional pós-evento** — 9 abas com gráficos. O produtor quer levar isso para a reunião de fechamento com investidor. Diferencial real e barato.

---

## 9. Recomendações Imediatas (próximas 2 semanas)

1. **Auditar `DATABASE_URL` em produção** — verificar se está apontando para o PgBouncer pooler do Supabase.
2. **Subir CI no repo** — `.github/workflows/ci.yml` com lint + typecheck + test + integration test + coverage gate.
3. **Implementar webhook outbound mínimo** (`order.paid`, `ticket.checked_in`) com HMAC. Desbloqueia integradores externos imediatamente.
4. **Documentar SLO/SLI** — disponibilidade alvo, latência de checkout, tempo de check-in. Sem isso, time não tem norte operacional.
5. **Iniciar refatoração multi-tenant** — primeira PR criando `Organization` (sem migrar nada ainda). Custo agora: baixo. Custo daqui a 6 meses: enorme.
6. **Decidir gateway secundário** — Pagar.me ou Mercado Pago. Bater na porta hoje, integrar em 30 dias.
7. **Plano de hardware POS** — agendar reunião com Sunmi BR e Gertec esta semana.
8. **Subir staging com dataset realista** — 100k tickets, 1k eventos, 50 organizações simuladas. Rodar k6 contra ele.

---

## 10. Próxima Sessão — Decisões a Tomar

Em ordem de prioridade para a próxima conversa:

1. Aprovar (ou recusar) o plano de refatoração multi-tenant da seção 7.
2. Escolher search engine (Meilisearch self-host vs Typesense Cloud).
3. Escolher gateway secundário (Pagar.me vs Mercado Pago).
4. Definir parceiro de hardware (Sunmi vs Gertec vs ambos).
5. Bloquear 60 dias para Hardening Q2 ou seguir adicionando features?
6. Estratégia GTM agressiva contra AZLIST (ataque rápido) vs Sympla (longo prazo)?

— *Erick, esse é o estado real. A base é boa. O que falta é disciplina de hardening + decisão de produto enterprise. Próximo passo é seu.*
