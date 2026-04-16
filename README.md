# Ticketeria Digital

Plataforma de venda de ingressos para eventos (modelo Eventbrite para Brasil). Sistema completo com API REST + WebSocket, frontend moderno e processamento de jobs assincronos.

## Visão Geral da Arquitetura

Ticketeria Digital é uma arquitetura de **monorepo com 3 packages** independentes:

```
ticketeria-real/
├── ticketeria-api/           # Backend: Express + TypeScript + Socket.IO
├── ticketeria-web/           # Frontend: React 18 + Vite + TypeScript
├── ticketeria-types/         # Shared types: Definições TypeScript compartilhadas
└── README.md                 # Este arquivo
```

### Fluxo de Dados

```
Cliente (Browser)
    ↓
React SPA (ticketeria-web)
    ↓
API REST + WebSocket (ticketeria-api)
    ↓
PostgreSQL (Supabase) + Redis
    ↓
BullMQ Workers (processamento assincronos)
    ↓
Serviços: Asaas (pagamentos), Resend (email), Cloudflare R2 (storage), Sentry
```

## Tech Stack

### Backend (ticketeria-api)

| Camada | Tecnologias |
|--------|------------|
| **Runtime** | Node.js >= 20 |
| **Framework** | Express.js 4.21 |
| **Linguagem** | TypeScript 5.6 |
| **WebSocket** | Socket.IO 4.7 |
| **Database ORM** | Prisma 5.20 |
| **Database** | PostgreSQL (Supabase) |
| **Cache/Session** | Redis 7 (IORedis) |
| **Job Queue** | BullMQ 5.12 |
| **Auth** | JWT + bcryptjs |
| **Logging** | Pino 9.4 |
| **Validation** | Zod 3.23 |
| **Security** | Helmet, CORS, Rate Limiting |
| **Testing** | Vitest 2.1 |
| **Linting** | ESLint + Prettier |

### Frontend (ticketeria-web)

| Camada | Tecnologias |
|--------|------------|
| **Runtime** | Node.js >= 20 |
| **Framework** | React 18.3 |
| **Build Tool** | Vite 5.4 |
| **Linguagem** | TypeScript 5.6 |
| **State Management** | Zustand 4.5 |
| **Data Fetching** | TanStack React Query 5.56 |
| **Routing** | React Router DOM 6.26 |
| **Styling** | CSS Modules |
| **Charts** | Recharts 2.12 |
| **Real-time** | Socket.IO Client 4.7 |
| **Validation** | Zod 3.23 |
| **Testing** | MSW (Mock Service Worker) |
| **Linting** | ESLint + Prettier |

### Shared Types (ticketeria-types)

- TypeScript 5.3
- Zod 3.22 (peer dependency)
- Publicado em GitHub Packages

### DevOps & Infrastructure

- **Containerization**: Docker + Docker Compose
- **Database**: PostgreSQL (Supabase)
- **Cache**: Redis 7 Alpine
- **Reverse Proxy**: Caddy 2 (auto-HTTPS)
- **CI/CD**: GitHub Actions
- **Error Tracking**: Sentry
- **Storage**: Cloudflare R2
- **Email**: Resend
- **Pagamentos**: Asaas (PIX, Boleto, Cartão de Crédito)

## Pré-requisitos

### Obrigatório

- **Node.js**: >= 20.0.0
- **npm**: >= 10.x (ou yarn/pnpm)
- **Docker**: >= 24.0 (para executar com docker-compose)
- **PostgreSQL**: 14+ (via Supabase ou local)
- **Redis**: 7+ (via docker-compose ou instalado localmente)
- **Git**: para clonar o repositório

### Contas/Serviços Externos

- **Supabase**: Acesso PostgreSQL
- **Asaas**: Integração de pagamentos (sandbox para dev)
- **Resend**: API key para envio de emails
- **Cloudflare R2**: Bucket para armazenamento de imagens
- **Sentry** (opcional): Error tracking

## Getting Started

### 1. Clonar o Repositório

```bash
git clone https://github.com/ticketeria/ticketeria-real.git
cd ticketeria-real
```

### 2. Setup do Backend (ticketeria-api)

```bash
cd ticketeria-api

# Copiar variáveis de ambiente
cp .env.example .env

# Instalar dependências
npm install

# Gerar cliente Prisma
npm run db:generate

# Executar migrations
npm run db:migrate

# Seed do banco (dados iniciais)
npm run db:seed

# Iniciar em desenvolvimento (auto-reload)
npm run dev
```

**Saída esperada:**
```
[API] Server running on http://localhost:3333
[API] Socket.IO listening on port 3333
```

### 3. Setup do Frontend (ticketeria-web)

```bash
cd ticketeria-web

# Instalar dependências
npm install

# Iniciar em desenvolvimento (Vite dev server)
npm run dev
```

**Saída esperada:**
```
VITE v5.4.0  ready in 445 ms

➜  Local:   http://localhost:5173/
```

### 4. Setup de Tipos Compartilhados (ticketeria-types)

```bash
cd ticketeria-types

# Instalar dependências
npm install

# Build (opcional em development)
npm run build

# Watch mode (opcional)
npm run dev
```

### 5. Verificar Ambiente Completo

Acesse em seu navegador:
- **Frontend**: http://localhost:5173
- **API Health**: http://localhost:3333/health
- **Socket.IO**: http://localhost:3333/socket.io/

## Estrutura do Projeto

### Backend: ticketeria-api

```
ticketeria-api/
├── src/
│   ├── server.ts                 # Entry point: Express + Socket.IO
│   ├── app.ts                    # Configuração Express
│   ├── config/                   # Configurações globais
│   │   ├── env.ts               # Variáveis de ambiente (validado com Zod)
│   │   ├── database.ts          # Prisma client
│   │   └── redis.ts             # Redis client
│   ├── modules/                  # Módulos de negócio (13 domínios)
│   │   ├── auth/                # Autenticação e autorização
│   │   ├── users/               # Gerenciamento de usuários
│   │   ├── events/              # Eventos e informações
│   │   ├── tickets/             # Ingressos e emissão
│   │   ├── orders/              # Pedidos e compras
│   │   ├── payments/            # Integrações de pagamento (Asaas)
│   │   ├── producers/           # Gerenciamento de produtores
│   │   ├── checkin/             # Check-in e validação
│   │   ├── favorites/           # Eventos favoritos
│   │   ├── notifications/       # Sistema de notificações
│   │   ├── reports/             # Relatórios e analytics
│   │   ├── admin/               # Painel administrativo
│   │   ├── affiliates/          # Programa de afiliados
│   │   └── live/                # Transmissão ao vivo (WebSocket)
│   ├── jobs/                     # BullMQ workers (processamento assincronos)
│   │   ├── workers/
│   │   │   ├── email.worker.ts                   # Envio de emails
│   │   │   ├── emit-tickets.worker.ts            # Emissão de ingressos
│   │   │   ├── expire-reservations.worker.ts     # Expiração de reservas
│   │   │   ├── batch-auto-switch.worker.ts       # Auto-switching de lotes
│   │   │   ├── batch-schedule.worker.ts          # Agendamento de lotes
│   │   │   ├── capacity-alert.worker.ts          # Alertas de capacidade
│   │   │   ├── post-event-report.worker.ts       # Relatório pós-evento
│   │   │   └── post-event-review.worker.ts       # Avaliações pós-evento
│   │   ├── queue.ts              # Configuração de filas
│   │   └── worker-runner.ts      # Entry point para workers
│   ├── middleware/               # Middlewares Express
│   │   ├── auth.ts              # JWT validation
│   │   ├── error.ts             # Error handling
│   │   ├── rateLimit.ts         # Rate limiting
│   │   └── logging.ts           # Request logging (Morgan + Pino)
│   ├── shared/                   # Utilitários compartilhados
│   │   ├── types.ts             # Tipos locais
│   │   └── utils.ts             # Funções auxiliares
│   └── tests/                    # Testes unitários (Vitest)
├── prisma/
│   ├── schema.prisma             # Definição do banco de dados
│   └── seed.ts                   # Seed data
├── dist/                         # Build output (TypeScript compilado)
├── package.json
├── tsconfig.json
├── Dockerfile                    # Multi-stage build para produção
├── docker-compose.yml            # Orquestração local
├── .env.example
└── .eslintrc.json
```

### Frontend: ticketeria-web

```
ticketeria-web/
├── src/
│   ├── main.tsx                  # Entry point React
│   ├── app/
│   │   ├── App.tsx              # Componente raiz
│   │   └── routes.tsx           # Definição de rotas (React Router)
│   ├── features/                 # Recursos/páginas
│   │   ├── auth/                # Login, registro, 2FA
│   │   ├── events/              # Listagem e detalhes de eventos
│   │   ├── tickets/             # Compra de ingressos
│   │   ├── orders/              # Histórico de pedidos
│   │   ├── checkin/             # Check-in de ingressos
│   │   ├── favorites/           # Eventos favoritos
│   │   ├── dashboard/           # Painel do produtor
│   │   ├── reports/             # Relatórios
│   │   └── admin/               # Painel administrativo
│   ├── shared/
│   │   ├── api/                 # Cliente HTTP (fetch + React Query)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── stores/              # Zustand stores (state management)
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   ├── Layout/
│   │   │   ├── Forms/
│   │   │   ├── Modals/
│   │   │   └── ...
│   │   ├── types.ts             # Tipos compartilhados (importado de @ticketeria/types)
│   │   ├── constants.ts         # Constantes
│   │   ├── styles/              # CSS Modules globais
│   │   └── utils.ts             # Utilitários
│   ├── mocks/                    # MSW mocks para testes
│   └── vite-env.d.ts            # Tipos Vite
├── public/                       # Assets estáticos
├── dist/                         # Build output
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── .env.example
└── .eslintrc.json
```

### Shared Types: ticketeria-types

```
ticketeria-types/
├── src/
│   ├── index.ts                  # Export principal
│   ├── auth.types.ts             # Tipos de autenticação
│   ├── events.types.ts           # Tipos de eventos
│   ├── tickets.types.ts          # Tipos de ingressos
│   ├── orders.types.ts           # Tipos de pedidos
│   ├── payments.types.ts         # Tipos de pagamentos
│   ├── users.types.ts            # Tipos de usuários
│   ├── notifications.types.ts    # Tipos de notificações
│   ├── live.types.ts             # Tipos de transmissão ao vivo
│   └── common.types.ts           # Tipos comuns
├── dist/                         # Build output
├── package.json
└── tsconfig.json
```

## Scripts Disponíveis

### Backend (ticketeria-api)

```bash
# Desenvolvimento
npm run dev                  # Start dev server com auto-reload (tsx watch)
npm run build              # Compilar TypeScript para dist/

# Banco de Dados
npm run db:generate        # Gerar Prisma Client
npm run db:migrate         # Executar migrations
npm run db:migrate:prod    # Executar migrations em produção
npm run db:seed            # Popular banco com dados iniciais
npm run db:studio          # Abrir Prisma Studio (GUI para banco)

# Testing
npm run test               # Executar testes (Vitest)
npm run test:watch        # Watch mode para testes
npm run test:coverage     # Relatório de cobertura

# Linting & Formatting
npm run lint              # Verificar código (ESLint)
npm run lint:fix          # Corrigir problemas automaticamente
npm run format            # Formatar código (Prettier)
npm run format:check      # Verificar formatação

# Utilitários
npm run typecheck         # Type checking sem emitir código
npm start                 # Executar build compilado
npm run start:worker      # Iniciar BullMQ worker isolado
```

### Frontend (ticketeria-web)

```bash
# Desenvolvimento
npm run dev               # Start Vite dev server (hot reload)
npm run build             # Build para produção (otimizado)
npm run preview           # Preview do build em localhost

# Linting & Formatting
npm run lint              # Verificar código (ESLint)
npm run typecheck         # Type checking

# Desenvolvimento não incluído mas possível adicionar:
# npm run test            # Vitest (recomendado)
# npm run test:watch      # Watch mode
```

### Shared Types (ticketeria-types)

```bash
npm run build             # Compilar TypeScript
npm run dev               # Watch mode
npm run prepublishOnly    # Build antes de publicar
```

## Endpoints da API

### Estrutura de URLs

```
GET    /api/v1/...        # Requisições de leitura
POST   /api/v1/...        # Criar recursos
PATCH  /api/v1/...        # Atualizar recursos
DELETE /api/v1/...        # Deletar recursos
WS     /socket.io/        # WebSocket real-time
```

### Módulos & Endpoints

#### **Auth** (Autenticação)
```
POST   /api/v1/auth/register          # Registrar novo usuário
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/logout            # Logout
POST   /api/v1/auth/refresh           # Renovar token JWT
POST   /api/v1/auth/2fa/enable        # Habilitar 2FA (TOTP)
POST   /api/v1/auth/2fa/verify        # Verificar código 2FA
POST   /api/v1/auth/password/reset    # Reset de senha
```

#### **Users** (Usuários)
```
GET    /api/v1/users/me               # Perfil do usuário logado
PATCH  /api/v1/users/me               # Atualizar perfil
PATCH  /api/v1/users/me/password      # Mudar senha
GET    /api/v1/users/:id              # Detalhes de usuário
```

#### **Events** (Eventos)
```
GET    /api/v1/events                 # Listar eventos (com filtros)
GET    /api/v1/events/:id             # Detalhes do evento
POST   /api/v1/events                 # Criar evento (produtor)
PATCH  /api/v1/events/:id             # Atualizar evento
DELETE /api/v1/events/:id             # Deletar evento
GET    /api/v1/events/:id/analytics   # Analytics do evento
```

#### **Tickets** (Ingressos)
```
GET    /api/v1/tickets                # Listar ingressos do usuário
GET    /api/v1/tickets/:id            # Detalhes do ingresso
GET    /api/v1/tickets/:id/qrcode     # QR code para check-in
POST   /api/v1/tickets/:id/resend     # Reenviar ingresso (email)
PATCH  /api/v1/tickets/:id/transfer   # Transferir ingresso
```

#### **Orders** (Pedidos)
```
POST   /api/v1/orders                 # Criar pedido (checkout)
GET    /api/v1/orders/:id             # Detalhes do pedido
GET    /api/v1/orders                 # Histórico de pedidos (usuário)
PATCH  /api/v1/orders/:id/cancel      # Cancelar pedido
```

#### **Payments** (Pagamentos - Asaas)
```
POST   /api/v1/payments/charge        # Processar pagamento
GET    /api/v1/payments/:id           # Status do pagamento
POST   /api/v1/payments/webhook       # Webhook Asaas (eventos de pagamento)
GET    /api/v1/payments/methods       # Métodos disponíveis (PIX, boleto, cartão)
```

#### **Producers** (Produtores)
```
GET    /api/v1/producers/:id          # Perfil do produtor
GET    /api/v1/producers/:id/events   # Eventos do produtor
PATCH  /api/v1/producers/:id          # Atualizar perfil
GET    /api/v1/producers/:id/stats    # Estatísticas
```

#### **Checkin** (Validação de Ingressos)
```
POST   /api/v1/checkin/validate       # Validar ingresso (código)
GET    /api/v1/checkin/event/:id      # Status checkin do evento
```

#### **Favorites** (Favoritos)
```
POST   /api/v1/favorites/events/:id   # Adicionar evento aos favoritos
DELETE /api/v1/favorites/events/:id   # Remover dos favoritos
GET    /api/v1/favorites/events       # Listar eventos favoritos
```

#### **Notifications** (Notificações)
```
GET    /api/v1/notifications          # Listar notificações do usuário
PATCH  /api/v1/notifications/:id/read # Marcar como lido
DELETE /api/v1/notifications/:id      # Deletar notificação
WS     /socket.io/                    # Receber notificações em tempo real
```

#### **Reports** (Relatórios)
```
GET    /api/v1/reports/events/:id     # Relatório de vendas
GET    /api/v1/reports/producers/:id  # Relatório do produtor
GET    /api/v1/reports/revenue        # Relatório de receita (admin)
POST   /api/v1/reports/export         # Exportar relatório (CSV/PDF)
```

#### **Admin** (Administração)
```
GET    /api/v1/admin/users            # Listar todos os usuários
GET    /api/v1/admin/events           # Listar todos os eventos
GET    /api/v1/admin/reports          # Relatórios globais
PATCH  /api/v1/admin/users/:id        # Gerenciar usuário
PATCH  /api/v1/admin/events/:id       # Gerenciar evento
```

#### **Affiliates** (Afiliados)
```
POST   /api/v1/affiliates/link        # Gerar link afiliado
GET    /api/v1/affiliates/stats       # Estatísticas de afiliado
PATCH  /api/v1/affiliates/profile     # Atualizar dados bancários
```

#### **Live** (Transmissão - WebSocket)
```
WS     /socket.io/                    # Eventos: 'live:join', 'live:message', etc
POST   /api/v1/live/events/:id        # Iniciar transmissão ao vivo
DELETE /api/v1/live/events/:id        # Encerrar transmissão
```

### Status HTTP Padrão

```
200 OK              # Sucesso
201 Created         # Recurso criado
204 No Content      # Sucesso sem corpo
400 Bad Request     # Erro de validação
401 Unauthorized    # Não autenticado
403 Forbidden       # Sem permissão
404 Not Found       # Recurso não encontrado
409 Conflict        # Conflito (ex: email duplicado)
429 Too Many Req.   # Rate limit excedido
500 Server Error    # Erro interno
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz de cada package baseado no `.env.example`.

### Backend (ticketeria-api/.env)

```bash
# ============ App ============
NODE_ENV=development               # production | development | test
PORT=3333                          # Porta da API
API_VERSION=v1                     # Versão da API
API_BASE_URL=http://localhost:3333 # URL base da API

# ============ CORS ============
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
CHECKIN_URL=http://localhost:5175

# ============ Database (PostgreSQL) ============
DATABASE_URL=postgresql://user:password@host:5432/ticketeria?schema=public

# ============ Redis ============
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                    # Deixar vazio se sem autenticação

# ============ JWT ============
JWT_ACCESS_SECRET=sua-secret-min-32-caracteres-aqui
JWT_REFRESH_SECRET=sua-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m          # Expiração do access token
JWT_REFRESH_EXPIRES_IN=7d          # Expiração do refresh token

# ============ Security ============
PLATFORM_SECRET=sua-platform-secret-min-32-chars

# ============ Asaas (Pagamentos) ============
ASAAS_API_URL=https://sandbox.asaas.com/api  # sandbox ou prod
ASAAS_API_KEY=sua-asaas-api-key
ASAAS_WEBHOOK_SECRET=seu-webhook-secret
ASAAS_WALLET_ID=seu-wallet-id

# ============ Cloudflare R2 (Storage) ============
R2_ACCOUNT_ID=seu-account-id
R2_ACCESS_KEY_ID=seu-access-key
R2_SECRET_ACCESS_KEY=seu-secret-key
R2_BUCKET_NAME=ticketeria
R2_PUBLIC_URL=https://storage.ticketeria.com.br

# ============ Resend (Email) ============
RESEND_API_KEY=sua-resend-api-key
RESEND_FROM_EMAIL=noreply@ticketeria.com.br
RESEND_FROM_NAME=Ticketeria

# ============ Sentry (Error Tracking) ============
SENTRY_DSN=seu-sentry-dsn

# ============ Rate Limiting ============
RATE_LIMIT_WINDOW_MS=60000         # Janela em millisegundos
RATE_LIMIT_MAX_REQUESTS=100        # Máximo de requisições
```

### Frontend (ticketeria-web/.env)

```bash
VITE_API_URL=http://localhost:3333
VITE_API_WS_URL=ws://localhost:3333
VITE_APP_NAME=Ticketeria Digital
VITE_APP_DESCRIPTION=Plataforma de venda de ingressos
```

## Docker & Deployment

### Executar Localmente com Docker Compose

```bash
cd ticketeria-api

# Build das imagens
docker-compose build

# Executar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f api        # Logs da API
docker-compose logs -f worker     # Logs do worker
docker-compose logs -f redis      # Logs do Redis

# Parar serviços
docker-compose down

# Limpar volumes (CUIDADO: deleta dados)
docker-compose down -v
```

### Estrutura do docker-compose.yml

O `docker-compose.yml` inclui:

1. **api** - Express server com Socket.IO (porta 3333)
2. **worker** - BullMQ worker para processamento assincronos
3. **redis** - Cache, sessions e filas (porta 6379)
4. **caddy** - Reverse proxy com HTTPS automático (portas 80/443)

**Rede isolada**: `ticketeria-net` para comunicação entre containers

**Healthchecks**: Cada serviço tem verificação de saúde

### Dockerfile Multistage

O `Dockerfile` utiliza 3 estágios para otimizar a imagem:

1. **deps**: Instala dependências de produção
2. **build**: Compila TypeScript
3. **production**: Imagem final mínima (Node 20 Alpine)

Recursos:
- User não-root (`ticketeria:1001`)
- Healthcheck integrado
- Cache layer otimizado

### Variáveis de Produção

Para produção, configure as variáveis como secrets no seu CI/CD:

```bash
# GitHub Secrets exemplo
PROD_DATABASE_URL
PROD_REDIS_PASSWORD
PROD_JWT_ACCESS_SECRET
PROD_JWT_REFRESH_SECRET
PROD_ASAAS_API_KEY
PROD_R2_ACCESS_KEY_ID
PROD_R2_SECRET_ACCESS_KEY
PROD_RESEND_API_KEY
PROD_SENTRY_DSN
```

### Deploy com Caddy

O Caddy atua como reverse proxy com HTTPS automático (Let's Encrypt):

```
Usuário → Caddy (80/443) → API (3333 interno)
```

Configure o domínio no `Caddyfile`:

```
api.ticketeria.com.br {
  reverse_proxy localhost:3333
  encode gzip
}
```

## CI/CD (GitHub Actions)

Pipelines automatizados (exemplos):

### .github/workflows/test.yml
```yaml
- Test backend (Vitest)
- Lint TypeScript
- Type checking
- Build check
```

### .github/workflows/deploy.yml
```yaml
- Build Docker image
- Push para registry
- Deploy em staging/prod
```

## Desenvolvimento

### Padrões & Convenções

#### Estrutura de Módulo (Backend)

```
modules/auth/
├── auth.routes.ts          # Rotas (Router Express)
├── auth.controller.ts       # Controllers (lógica de requisição)
├── auth.service.ts          # Services (lógica de negócio)
├── auth.repository.ts       # Repository (acesso a dados)
├── auth.types.ts            # Tipos locais
└── auth.middleware.ts       # Middlewares específicos
```

#### Naming Conventions

- **Pastas**: `kebab-case` (ex: `user-management`)
- **Arquivos**: `kebab-case.ext` (ex: `auth.service.ts`)
- **Classes**: `PascalCase` (ex: `AuthService`)
- **Funções**: `camelCase` (ex: `validateToken()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `JWT_EXPIRY`)
- **Tipos/Interfaces**: `PascalCase` (ex: `IUser`, `User`)

#### Git Workflow

```bash
# Criar branch feature
git checkout -b feature/nome-descritivo

# Commit com mensagens claras
git commit -m "feat: descrição da mudança"
git commit -m "fix: descrever bug corrigido"
git commit -m "docs: atualizar documentação"

# Push e criar PR
git push origin feature/nome-descritivo
```

Prefixos de commit recomendados:
- `feat:` - Nova funcionalidade
- `fix:` - Bug fix
- `docs:` - Documentação
- `style:` - Formatting
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Dependências, build, etc

### Code Quality

#### Linting

```bash
# Verificar estilo
npm run lint

# Corrigir automaticamente
npm run lint:fix

# Formatar código
npm run format
```

#### Type Safety

```bash
# Verificar tipos
npm run typecheck

# Será checado no build também
npm run build
```

#### Testing

```bash
# Executar testes
npm run test

# Watch mode
npm run test:watch

# Com cobertura
npm run test:coverage
```

### Debugging

#### Backend

```bash
# Com Node debugger
node --inspect dist/server.js

# Com VS Code: criar .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch API",
      "program": "${workspaceFolder}/ticketeria-api/dist/server.js"
    }
  ]
}
```

#### Frontend

- DevTools do navegador (F12)
- React DevTools extension
- Zustand DevTools (se configurado)

#### Logs

```bash
# Backend (Pino logger)
// src/server.ts
logger.info('Mensagem', { context: 'value' })

# Frontend (Console)
console.log('Debug:', variable)
```

### Troubleshooting

#### Erro: "Cannot find module '@ticketeria/types'"

```bash
# Certifique-se que ticketeria-types foi buildado
cd ticketeria-types
npm run build

# E que está instalado nos packages
cd ../ticketeria-api
npm install
```

#### Erro: "Database connection refused"

```bash
# Verificar se PostgreSQL está rodando
psql -h localhost -U postgres

# Ou via Docker
docker ps | grep postgres
docker-compose up -d  # Se usando docker-compose
```

#### Erro: "Redis connection refused"

```bash
# Verificar se Redis está rodando
redis-cli ping

# Ou via Docker
docker-compose up -d redis
```

#### Porta em uso

```bash
# Liberar porta (ex: 3333)
lsof -i :3333        # macOS/Linux
netstat -ano | grep 3333  # Windows

# Matar processo
kill -9 <PID>
```

## Contribuindo

### Setup de Desenvolvimento

1. **Fork** o repositório
2. **Clone** sua cópia
3. **Crie uma branch**: `git checkout -b feature/sua-feature`
4. **Desenvolva** mantendo padrões de código
5. **Teste** sua mudança
6. **Commit** com mensagens claras
7. **Push** para seu fork
8. **Abra um Pull Request** para `main`

### Checklist antes de enviar PR

- [ ] Código segue padrões do projeto
- [ ] Testes passam: `npm run test`
- [ ] Sem erros de lint: `npm run lint`
- [ ] Type checking passa: `npm run typecheck`
- [ ] Documentação atualizada (se necessário)
- [ ] Mensagens de commit são descritivas
- [ ] Sem commits não-relacionados

### Política de Branches

- `main` - Código pronto para produção
- `develop` - Integração de features (staging)
- `feature/*` - Novas funcionalidades
- `fix/*` - Correções de bugs
- `docs/*` - Documentação

### Relatar Bugs

Abra uma **Issue** com:

1. Descrição clara do problema
2. Passos para reproduzir
3. Comportamento esperado vs atual
4. Ambiente (SO, Node version, etc)
5. Logs/screenshots (se relevante)

## Licença

MIT - Veja LICENSE.md

## Suporte & Comunidade

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: dev@ticketeria.com.br
- **Slack**: #ticketeria-dev (para time interno)

---

**Desenvolvido com ❤️ pela Ticketeria Digital**

Última atualização: 2026-04-09
