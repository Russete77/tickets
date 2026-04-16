# PulsePass (Ticketeria) - Instrucoes de Desenvolvimento

> Documento gerado em 2026-04-16 a partir da auditoria do projeto + analise do PRD v3.0
> Objetivo: servir como referencia unica para decisoes de desenvolvimento

---

## 1. Identidade do Projeto

| Campo | Valor |
|---|---|
| **Nome comercial** | PulsePass |
| **Nome tecnico (repo)** | Ticketeria / ticket-real |
| **Proposta** | Sistema Operacional de Eventos - ticketeria + guest list + check-in + cashless + super app |
| **Autor** | Erick Berberian - SMU Producoes (CNPJ 29.693.164/0001-23) |
| **Concorrentes** | Sympla, Ingresse, AZList, ZigPay, Shotgun |

---

## 2. Stack Tecnica ATUAL (Implementada)

> **ATENCAO**: A stack atual difere do PRD v3.0. O PRD especifica FastAPI/Python, mas o projeto foi construido com Express/TypeScript. Esta secao documenta o que ESTA implementado.

### 2.1 Backend (`ticketeria-api/`)

| Tecnologia | Versao | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| Express.js | 5.0 | Framework HTTP |
| TypeScript | 5.5 | Linguagem |
| Prisma | 7.7 | ORM + migrations |
| PostgreSQL | 16 (Supabase) | Banco de dados |
| Redis 7 | IORedis 5.4 | Cache, filas, anti-replay |
| BullMQ | 5.12 | Job queue (7 workers) |
| Socket.IO | 4.7.5 | Real-time |
| Zod | 4.0 | Validacao |
| JWT | jsonwebtoken (RS256) | Autenticacao |
| bcryptjs | 2.4.3 | Hash de senhas |
| Resend | - | E-mail transacional |
| Sentry | 10.47 | Error tracking |
| Pino | 9.4 | Logging |

### 2.2 Frontend Web (`ticketeria-web/`)

| Tecnologia | Versao | Uso |
|---|---|---|
| React | 19 | UI framework |
| Vite | 7.0 | Build tool |
| TypeScript | 6.0 | Linguagem |
| Zustand | 4.5 | State management |
| TanStack React Query | 5.56 | Data fetching + cache |
| React Router DOM | 6.26 | Routing |
| CSS Modules | - | Estilizacao (scoped) |
| Socket.IO Client | 4.7.5 | Real-time |
| Recharts | 2.12 | Graficos |
| MSW | 2.13.2 | Mock de API em dev/test |
| Playwright | - | E2E testing |

### 2.3 Mobile (`ticketeria-mobile/`)

| Tecnologia | Versao | Uso |
|---|---|---|
| Expo | 54.0 | Framework mobile |
| React Native | 0.81.5 | UI nativo |
| TypeScript | 5.6 | Linguagem |
| Expo Router | 6.0.23 | File-based routing |
| Expo Camera | 17.0.10 | Scanner QR |
| react-native-qrcode-svg | 6.3 | Geracao de QR |
| Expo Notifications | 0.32.16 | Push (pendente FCM) |
| Zustand | 4.5 | State management |
| Expo Secure Store | 15.0.8 | Armazenamento seguro |

### 2.4 Shared Types (`ticketeria-types/`)

| Tecnologia | Versao | Uso |
|---|---|---|
| TypeScript | 6.0 | Tipos compartilhados |
| Zod | 4.0 | Validators + DTOs |

### 2.5 Infraestrutura

| Servico | Plataforma | Config |
|---|---|---|
| Database | PostgreSQL 16 via Supabase | Prisma adapter |
| Cache/Filas | Redis 7 | Docker local / Railway prod |
| Storage | Cloudflare R2 | Bucket: ticketeria |
| E-mail | Resend | noreply@ticketeria.com.br |
| Pagamento | Asaas | PIX + Cartao + Boleto |
| Monitoring | Sentry | Frontend + Backend |
| Deploy Web | Cloudflare Pages | Via Wrangler |
| Deploy API | GHCR (Docker) | Via GitHub Actions |
| Deploy Mobile | EAS Build | Expo |
| CI/CD | GitHub Actions | lint + test + build + deploy |

---

## 3. Gaps de Funcionalidades (PRD v4.0 vs Implementacao)

> PRD v4.0 ja esta alinhado com a stack Express/TypeScript. Abaixo estao os gaps de funcionalidade restantes.

| Funcionalidade PRD | Status Atual | Gap | Prioridade |
|---|---|---|---|
| JWT RS256 (assimetrico) | RS256 implementado | - | CONCLUIDO |
| Anti-replay Redis | SET NX + TTL 300s + rate limiter | - | CONCLUIDO |
| Socket.IO JWT auth | RS256 no handshake | - | CONCLUIDO |
| Push notifications (Expo) | Expo SDK + BullMQ worker + mobile hook | - | CONCLUIDO |
| Relatorio Excel 9 abas | ExcelJS 9 abas com formatacao profissional | - | CONCLUIDO |
| Fila inteligente (virtual queue) | Middleware existe | Testar fluxo completo | MEDIA |
| Modo offline mobile (SQLite) | IndexedDB (web only) | Falta SQLite no mobile | MEDIA |
| TOTP mobile (producao) | Simplificado | Revisar HMAC para producao | MEDIA |
| Super App (mapa, pedido, social) | Nao iniciado | Fase v1.2 do roadmap | BAIXA |
| NFC | Nao iniciado | Fase v1.2 do roadmap | BAIXA |
| Dynamic pricing ML | Nao iniciado | Fase v1.3 do roadmap | BAIXA |
| White-label | Nao iniciado | Fase Enterprise | BAIXA |

---

## 4. Arquitetura do Monorepo

```
ticket-real/
├── ticketeria-api/              # Backend Express + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma        # 1216 linhas, 17+ models, 22+ enums
│   │   ├── migrations/          # 1 migration inicial (2026-04-16)
│   │   └── seed.ts              # Dados de teste
│   ├── src/
│   │   ├── config/              # env.ts, redis.ts, swagger.ts
│   │   ├── generated/prisma/    # Prisma client gerado
│   │   ├── middleware/          # auth, rateLimiter, advancedRateLimiter,
│   │   │                        # idempotency, validate, requestId, flashSaleQueue
│   │   ├── modules/             # 35 modulos de rota (ver secao 5)
│   │   ├── lib/                 # prisma.ts, redis.ts, utils
│   │   ├── workers/             # 7 BullMQ workers
│   │   ├── tests/               # 17 arquivos de teste
│   │   └── server.ts            # Entry point
│   └── .github/workflows/ci.yml
│
├── ticketeria-web/              # Frontend React + Vite
│   ├── src/
│   │   ├── features/            # home, event, checkout, admin, profile,
│   │   │                        # search, tickets, auth
│   │   ├── shared/
│   │   │   ├── components/      # 15+ UI components (Avatar, Badge, Button...)
│   │   │   ├── hooks/           # useAuth, useDocumentHead, queries
│   │   │   ├── stores/          # authStore, cartStore, notificationStore
│   │   │   ├── services/        # api.ts, socket.ts
│   │   │   ├── lib/             # offlineTickets.ts (IndexedDB)
│   │   │   └── layouts/         # PublicLayout, AdminLayout
│   │   ├── router.tsx           # 18 rotas (public, auth, protected, admin)
│   │   └── App.tsx
│   ├── e2e/                     # Playwright E2E tests
│   └── .github/workflows/deploy.yml
│
├── ticketeria-mobile/           # Mobile Expo/React Native
│   ├── src/
│   │   ├── screens/             # 9 telas implementadas
│   │   ├── components/          # 12 componentes
│   │   ├── lib/                 # totp.ts, api.ts, storage.ts
│   │   └── styles/              # theme.ts
│   └── app.json
│
├── ticketeria-types/            # Tipos TypeScript compartilhados
│   └── src/                     # 22 arquivos de tipos + DTOs + validators
│
├── docker-compose.yml           # PostgreSQL 16 + Redis 7 (dev local)
├── turbo.json                   # Monorepo config
├── package.json                 # Workspaces root
├── setup.sh / setup.ps1         # Scripts de setup
├── BACKEND_MAPEAMENTO_COMPLETO.md
└── DESIGN-SYSTEM-TIMELAPSE.md
```

---

## 5. Modulos de API (35 rotas registradas)

### 5.1 Core (implementados e funcionais)

| Modulo | Prefixo | Endpoints | Descricao |
|---|---|---|---|
| auth | `/api/v1/auth` | 10 | Register, login, refresh, logout, 2FA, email verify, password reset |
| users | `/api/v1/users` | 5 | CRUD usuarios |
| events | `/api/v1/events` | 10 | CRUD eventos + live metrics |
| tickets | `/api/v1/tickets` | 7 | Reserva atomica, confirmacao, QR, transferencia |
| orders | `/api/v1/orders` | 3 | Criacao e gestao de pedidos |
| payments | `/api/v1/payments` | 2 | Webhook Asaas + status |
| checkin | `/api/v1/checkin` | 3 | Validacao QR + TOTP |
| producers | `/api/v1/producers` | 6 | Onboarding + perfil financeiro |

### 5.2 Features Extendidas

| Modulo | Prefixo | Descricao |
|---|---|---|
| affiliates | `/api/v1/affiliates` | Links de afiliados + tracking |
| reports | `/api/v1/reports` | KPIs + export CSV |
| admin | `/api/v1/admin` | Painel administrativo |
| favorites | `/api/v1/favorites` | Wishlist de eventos |
| live | `/api/v1/live` | Dados real-time |
| guest-lists | `/api/v1/guest-lists` | CRUD + import CSV + registro publico |
| promoters | `/api/v1/promoters` | CRUD + tiers (bronze-diamond) |
| cashless | `/api/v1/cashless` | Wallet + transacoes + topup |
| staff | `/api/v1/staff` | Equipe do evento |
| areas | `/api/v1/areas` | Zonas do venue |
| store | `/api/v1/store` | Produtos PDV |
| courtesies | `/api/v1/courtesies` | Cortesias/convites |
| box-office | `/api/v1/box-office` | Bilheteria fisica |
| waitlist | `/api/v1/waitlist` | Lista de espera |
| price-rules | `/api/v1/price-rules` | Regras de preco dinamico |
| permissions | `/api/v1/permissions` | RBAC |
| credentials | `/api/v1/credentials` | API keys para produtores |
| certificates | `/api/v1/certificates` | Badges digitais |
| insurance | `/api/v1/insurance` | Seguro de evento |
| form-fields | `/api/v1/form-fields` | Campos customizaveis |

### 5.3 Infraestrutura

| Rota | Descricao |
|---|---|
| `GET /health` | Health check |
| `/api-docs` | Swagger/OpenAPI |
| WebSocket (Socket.IO) | Real-time: checkins, faturamento, alertas |

---

## 6. Schema do Banco de Dados

### 6.1 Models Prisma (schema.prisma - 1216 linhas)

**Core:**
- User, Producer, Event, TicketBatch, Order, Ticket
- TicketTransfer, CheckinLog, AffiliateLink, Coupon
- EventReview, Favorite, Notification, AuditLog, PaymentSplit

**Extended (Fases 1-6):**
- GuestList, GuestListConfig, GuestEntry
- EventArea, EventFormField, EventMedia, EventStaff, StaffRole
- Promoter, PromoterTier
- CashlessWallet, CashlessTransaction, CashlessConfig
- Courtesy, BoxOfficeSession, Insurance, Certificate
- PriceRule, Permission, Credential

### 6.2 Enums (22+)

UserRole, EventStatus, EventCategory, BatchType, OrderStatus, PaymentMethod,
TicketStatus, TransferStatus, CheckinResult, DiscountType, NotificationType,
NotificationChannel, CompanyType, AsaasAccountStatus, DocumentsStatus,
GuestListType, MediaType, TicketPriceType, GuestListStatus, GuestEntryStatus,
PromoterTier, CourtesyStatus, WalletType, WalletStatus,
CashlessTransactionType, CashlessTransactionStatus, ProductCategory, POSType,
StockMovementType, StaffRole, StoreItemType

---

## 7. Workers BullMQ (7 implementados)

| Worker | Funcao |
|---|---|
| reservation-expiry | Expira reservas apos timeout (10min) |
| payment-confirmation | Processa webhooks Asaas |
| notification | Envia emails via Resend |
| push-notification | **TODO**: Integrar FCM/Expo Notifications |
| capacity-alert | **TODO**: Alertas Socket.IO + email |
| report-generation | Gera relatorios CSV |
| ticket-transfer | Processa transferencias de ingresso |

---

## 8. Paginas Frontend (18 rotas)

### 8.1 Publicas
- `/` - HomePage (hero, trending, categorias, recomendacoes)
- `/event/:slug` - EventPage (detalhes, galeria, reviews)
- `/search` - SearchPage (filtros avancados)

### 8.2 Auth (guest only)
- `/login` - LoginPage
- `/register` - RegisterPage

### 8.3 Protegidas (usuario logado)
- `/checkout` - CheckoutFlow (Asaas, PIX, boleto)
- `/tickets` - MyTicketsPage (ingressos com QR)
- `/profile` - ProfilePage (configuracoes, LGPD export)

### 8.4 Standalone
- `/checkin` - CheckinPage (camera, offline scanning)

### 8.5 Admin (role-protected)
- `/admin` - Dashboard (metricas, acoes rapidas)
- `/admin/events` - Gestao de eventos
- `/admin/events/create` - Criacao de evento
- `/admin/tickets` - Gestao de pedidos
- `/admin/users` - Gestao de usuarios
- `/admin/finance` - Financeiro (payouts, splits)
- `/admin/reports` - Analytics + export CSV
- `/admin/affiliates` - Dashboard de afiliados

---

## 9. TODOs Criticos (resolver antes de producao)

### Prioridade ALTA (bloqueiam lancamento)

| # | Item | Local | Descricao |
|---|---|---|---|
| 1 | ~~**JWT RS256**~~ | `ticketeria-api/src/middleware/auth.ts` | ~~CONCLUIDO~~ — RS256 com par de chaves implementado |
| 2 | ~~**Socket.IO JWT auth**~~ | `ticketeria-api/src/server.ts` | ~~CONCLUIDO~~ — JWT RS256 verificado no handshake, user associado ao socket |
| 3 | ~~**Push notifications**~~ | `ticketeria-api/src/modules/notifications/push.service.ts` | ~~CONCLUIDO~~ — Expo SDK + BullMQ worker + mobile hook + endpoint PUT /users/push-token |
| 4 | ~~**Relatorio Excel 9 abas**~~ | `ticketeria-api/src/modules/reports/reports.excel.service.ts` | ~~CONCLUIDO~~ — ExcelJS 9 abas com formatacao, cores PulsePass, endpoint GET /reports/:eventId/excel |
| 5 | ~~**Anti-replay Redis completo**~~ | `ticketeria-api/src/modules/checkin/checkin.service.ts` | ~~CONCLUIDO~~ — Redis SET NX com TTL 300s + rate limiter 20req/s no endpoint |

### Prioridade MEDIA (melhoram qualidade)

| # | Item | Descricao |
|---|---|---|
| 6 | Modo offline mobile (SQLite) | PRD exige snapshot local. Web tem IndexedDB, mobile precisa SQLite |
| 7 | Capacity alerts via Socket.IO | Worker existe mas TODO no broadcast |
| 8 | TOTP mobile (producao) | Implementacao atual admite ser simplificada - revisar HMAC |
| 9 | RLS / multi-tenant | PRD exige isolamento por org_id. Prisma nao tem RLS nativo |
| 10 | Device fingerprinting | Mencionado no PRD para antifraude, verificar implementacao |

### Prioridade BAIXA (futuro)

| # | Item | Fase PRD |
|---|---|---|
| 11 | Super App (mapa, pedido, social) | v1.2 |
| 12 | NFC via Web NFC API | v1.2 |
| 13 | White-label Enterprise | v1.2 |
| 14 | Dynamic pricing ML | v1.3 |
| 15 | API publica para integradores | v2.0 |
| 16 | Webhook Sympla/Ingresso.com | v1.1 |
| 17 | Biometria (expo-local-authentication) | v1.1 |

---

## 10. Padroes de Codigo

### 10.1 Backend (Express + TypeScript)

```
Estrutura de modulo:
  src/modules/{nome}/
    ├── {nome}.routes.ts      # Definicao de rotas Express
    ├── {nome}.service.ts     # Logica de negocio
    ├── {nome}.controller.ts  # Handler HTTP (optional)
    └── {nome}.schema.ts      # Validacao Zod
```

- **Validacao**: Sempre usar Zod schemas via middleware `validate.ts`
- **Erros**: Usar classes de erro padronizadas. Sentry captura automaticamente
- **Logs**: Pino logger. Nunca `console.log` em producao
- **Rate limiting**: Global (100 req/min) + por endpoint conforme necessidade
- **Idempotencia**: Redis-backed para operacoes de pagamento
- **Request ID**: UUID automatico em cada request

### 10.2 Frontend (React + Vite)

```
Estrutura de feature:
  src/features/{nome}/
    ├── components/           # Componentes especificos da feature
    │   ├── Component.tsx
    │   └── Component.module.css
    └── pages/
        └── Page.tsx
```

- **State**: Zustand para estado global (auth, cart, notifications)
- **Data fetching**: TanStack React Query (nunca fetch direto)
- **Estilizacao**: CSS Modules (scoped por componente)
- **Lazy loading**: Todas as paginas com `React.lazy()`
- **Error boundaries**: Implementados no router
- **Tema**: Light/dark via ThemeToggle

### 10.3 Mobile (Expo)

```
Estrutura:
  src/
    ├── screens/              # Telas completas
    ├── components/           # Componentes reutilizaveis
    ├── lib/                  # Utilitarios (api, totp, storage)
    └── styles/               # Tema e tokens
```

- **Navegacao**: Expo Router (file-based)
- **Armazenamento seguro**: expo-secure-store para tokens
- **Camera**: expo-camera para scanner QR
- **Estado**: Zustand + React Query

### 10.4 Convencoes Gerais

- **Linguagem de codigo**: Ingles (nomes de variaveis, funcoes, componentes)
- **Commits**: Conventional commits (feat:, fix:, chore:, etc.)
- **Testes**: Vitest (unit/integration) + Playwright (E2E)
- **Linting**: ESLint + Prettier configurados
- **Types**: Compartilhados via `ticketeria-types` package

---

## 11. Fluxos Criticos (como devem funcionar)

### 11.1 Compra de Ingresso (Anti-overbooking)

```
1. Usuario clica "Comprar"
2. POST /api/v1/tickets/reserve
   → Transaction atomica: verifica disponibilidade + cria reserva + incrementa soldCount
   → BullMQ job agendado para expirar reserva em 10min
3. Frontend exibe timer (10:00 → 00:00)
4. Usuario seleciona pagamento (PIX/cartao)
5. POST /api/v1/payments → Asaas cria cobranca
6. Webhook Asaas confirma pagamento
7. Worker converte reserva → ticket real + gera QR + envia email
8. Se timeout: worker devolve ingresso ao estoque
```

### 11.2 Check-in (QR Rotativo)

```
1. Participante abre app → GET /tickets/my
2. App gera QR: ticketHash + TOTP (muda a cada 30s)
3. Operador escaneia com camera
4. POST /api/v1/checkin/validate
   → Verificar TOTP valido (janela 30s)
   → Verificar anti-replay Redis (token ja usado?)
   → Gravar CheckinLog
   → Broadcast via Socket.IO para dashboard
5. Feedback visual: verde (ok), vermelho (negado), laranja (zona errada)
```

### 11.3 Cashless (Recarga + Compra)

```
Recarga:
1. Participante → POST /cashless/recharge → Asaas gera PIX QR
2. Webhook Asaas confirma → credita wallet (balanceCents)
3. Push notification: "Recarga confirmada"

Compra no PDV:
1. Operador seleciona produtos + escaneia QR do participante
2. POST /cashless/charge
   → Transaction atomica: verifica saldo → debita → registra transacao
   → Impossivel saldo negativo (validacao dupla)
3. Se offline: debita local ate offlineLimit → sync quando online
```

### 11.4 Guest List + Promoter

```
1. Organizador cria guest list com configuracao (cor, cota, horario)
2. Promoter recebe link publico unico (slug + token)
3. Convidado acessa link → preenche dados → POST /guest-lists/register
4. QR JWT gerado para convidado (RS256, exp 5min) [TODO: migrar para RS256]
5. Check-in identico ao fluxo 11.2
6. Pos-evento: relatorio por promoter com conversao e ranking
```

---

## 12. Variaveis de Ambiente

### 12.1 Backend (`ticketeria-api/.env`)

```env
# Core
NODE_ENV=development|staging|production
PORT=3333
API_VERSION=v1
API_BASE_URL=http://localhost:3333

# Frontend URLs (CORS)
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CHECKIN_URL=http://localhost:5175

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth (RS256 - gerar chaves com: npx tsx scripts/generate-keys.ts)
JWT_PRIVATE_KEY_BASE64=<base64 da chave privada>
JWT_PUBLIC_KEY_BASE64=<base64 da chave publica>
JWT_REFRESH_SECRET=<min 32 chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PLATFORM_SECRET=<min 32 chars>

# Asaas (Pagamento)
ASAAS_API_URL=https://sandbox.asaas.com/api
ASAAS_API_KEY=<key>
ASAAS_WEBHOOK_SECRET=<secret>
ASAAS_WALLET_ID=<wallet_id>

# Cloudflare R2 (Storage)
R2_ACCOUNT_ID=<id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=ticketeria
R2_PUBLIC_URL=https://storage.ticketeria.com.br

# Resend (Email)
RESEND_API_KEY=<key>
RESEND_FROM_EMAIL=noreply@ticketeria.com.br

# Sentry
SENTRY_DSN=<dsn>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 12.2 Frontend (`ticketeria-web/.env`)

```env
VITE_API_BASE_URL=http://localhost:3333/api
VITE_SOCKET_URL=http://localhost:3333
VITE_ENVIRONMENT=development
VITE_SENTRY_DSN=<dsn>
```

---

## 13. Comandos de Desenvolvimento

### 13.1 Setup Inicial

```bash
# Instalar dependencias (monorepo)
npm install

# Subir servicos (PostgreSQL + Redis)
docker-compose up -d

# Gerar Prisma client
npm run db:generate

# Rodar migration
npm run db:migrate

# Seed de dados de teste
npm run db:seed
```

### 13.2 Desenvolvimento

```bash
# API (porta 3333)
npm run dev:api

# Web (porta 5173)
npm run dev:web

# Build completo (types → api → web)
npm run build
```

### 13.3 Testes

```bash
# Unit tests (API)
npm run test:api

# Integration tests (API - precisa PostgreSQL + Redis)
cd ticketeria-api && npm run test:integration

# Unit tests (Web)
cd ticketeria-web && npm run test

# E2E (Web - precisa servidor rodando)
cd ticketeria-web && npm run test:e2e
```

### 13.4 Database

```bash
# Nova migration
cd ticketeria-api && npx prisma migrate dev --name <nome>

# Reset banco
cd ticketeria-api && npx prisma migrate reset

# Visualizar banco
cd ticketeria-api && npx prisma studio
```

---

## 14. Roadmap de Implementacao (Alinhado com PRD)

### Fase 0 - Estabilizacao (AGORA)
> Resolver gaps criticos entre PRD e implementacao atual

- [x] Decidir: manter Express/TS (decidido)
- [x] Migrar JWT de HS256 para RS256 (par de chaves)
- [x] Implementar Socket.IO JWT auth no handshake
- [x] Integrar push notifications (Expo Push API + BullMQ)
- [x] Implementar relatorio Excel 9 abas com ExcelJS
- [x] Completar anti-replay Redis no check-in
- [ ] Revisar TOTP mobile para producao
- [x] Inicializar repositorio git

### Fase MVP (Meses 1-3 do PRD)
> Maioria ja implementada. Foco em polimento e teste real.

- [ ] Testar fluxo completo de compra (reserva → pagamento → ticket)
- [ ] Testar check-in com QR rotativo em device fisico
- [ ] Testar cashless completo (recarga PIX → compra PDV)
- [ ] Guest list multi-promoter com link publico
- [ ] Modo offline robusto (portaria + PDV)
- [ ] Relatorio Excel pos-evento
- [ ] Evento piloto com produtora parceira

### Fase v1.1 (Meses 4-5)
- [ ] Fila inteligente completa (Redis queue + WebSocket UI)
- [ ] Antifraude avancado (scalper detection, risk scoring)
- [ ] Webhook Sympla/Ingresso.com
- [ ] Biometria no app (expo-local-authentication)
- [ ] Push notifications contextuais
- [ ] Modo offline robusto com sync queue

### Fase v1.2 (Meses 6-7)
- [ ] Super App: mapa interativo, pedido pelo app, social
- [ ] NFC via Web NFC API
- [ ] Analytics avancado com heatmap de zonas
- [ ] White-label Enterprise

### Fase v1.3 (Meses 8-9)
- [ ] Dynamic pricing (preco sobe conforme demanda)
- [ ] Credito pre-evento com bonus
- [ ] Modelo preditivo de pico (ML)
- [ ] Integracao CRM + marketing

### Fase v2.0 (Mes 10+)
- [ ] API publica para integradores
- [ ] Marketplace de servicos
- [ ] Programa de parceiros

---

## 15. 5 Engines do PulsePass (Referencia PRD)

### Engine 1 - Ticketeria (Sympla Killer)
- Reserva atomica anti-overbooking
- Fila inteligente para alta demanda
- Antifraude (CPF, IP, device, risk score)
- Multiplos lotes com virada automatica
- Checkout com PIX + cartao + timer

### Engine 2 - Guest List (AZList Killer)
- Multiplas listas por evento (cor, cota, horario)
- Promoters com link publico unico
- Pagina de auto-inscricao
- Gamificacao (ranking, tiers bronze-diamond)
- Import CSV + campos customizaveis

### Engine 3 - Check-in Engine (50k sem cair)
- QR TOTP rotativo (30s) + JWT RS256 (5min)
- App offline-first com snapshot local
- Validacao < 200ms
- Anti-replay Redis
- Feedback visual + sonoro

### Engine 4 - Cashless (ZigPay Killer)
- Wallet digital com recarga PIX
- PDV com debito atomico
- Modo offline com limite configuravel
- Antifraude financeiro (saldo negativo impossivel)
- Fechamento automatico + saque pos-evento

### Engine 5 - Super App do Participante
- QR rotativo no app
- Saldo cashless em tempo real
- Mapa interativo do venue
- Pedido pelo app (zero fila no bar)
- Push notifications contextuais

---

## 16. Seguranca (Checklist PRD)

- [x] JWT RS256 com par de chaves publico/privado
- [x] TOTP nos ingressos (muda a cada 30s)
- [x] Anti-replay Redis (token rejeitado na segunda leitura)
- [x] Rate limiting global (100 req/min)
- [x] Rate limiting avancado (por CPF, device, IP, cartao)
- [x] Idempotencia Redis para pagamentos
- [x] Helmet + CORS configurados
- [x] Validacao Zod em todos os inputs
- [x] Sentry para error tracking
- [x] Request ID tracking
- [ ] RLS por org_id (isolamento multi-tenant)
- [x] bcryptjs cost 12 para senhas
- [x] 2FA TOTP com otplib
- [x] Email verification obrigatorio
- [ ] Device fingerprinting completo
- [x] Audit logging

---

## 17. Testes (Estado Atual)

### Backend (17 arquivos)
- Integration: auth, events, orders
- Helpers: setup.ts, helpers.ts
- Config separado: vitest.integration.config.ts
- CI: PostgreSQL 16 + Redis 7 como servicos

### Frontend (14 arquivos)
- Unit: componentes, hooks, stores
- E2E: Playwright configurado
- Mocking: MSW para API

### Cobertura Necessaria
- [ ] Testes para fluxo completo de reserva atomica
- [ ] Testes para anti-replay no check-in
- [ ] Testes para cashless (recarga + debito + offline sync)
- [ ] Testes para guest list (registro + check-in)
- [ ] E2E para checkout completo

---

## 18. Regras de Negocio Importantes

### Precificacao (Planos SaaS)
| Plano | Participantes | Mensalidade | Taxa/part. | Taxa cashless |
|---|---|---|---|---|
| Starter | Ate 500 | R$ 149 | R$ 0,50 | 1,9% |
| Growth | Ate 5.000 | R$ 490 | R$ 0,35 | 1,5% |
| Pro | Ate 20.000 | R$ 990 | R$ 0,25 | 1,2% |
| Enterprise | Ilimitado | R$ 1.990 | R$ 0,15 | 0,9% |

### Tempos Criticos
- Reserva de ingresso: expira em **10 minutos**
- QR TOTP: muda a cada **30 segundos**
- QR JWT (guest list): expira em **5 minutos**
- Refresh JWT (guest list app): a cada **4min50s**
- Anti-replay window: **5 minutos** no Redis
- Validacao QR: < **200ms**
- PIX Asaas: confirmacao < **10s** (media)
- Access token: **15 minutos**
- Refresh token: **7 dias**

### Limites Antifraude
- Max ingressos por CPF por evento: configuravel
- Max tentativas de compra: 3 por usuario em 5min
- Rate limit validacao: 20/s por operador
- Offline limit cashless: R$200 (geral), R$1000 (VIP)
