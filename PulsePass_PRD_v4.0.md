# PULSEPASS

## Sistema Operacional de Eventos

Ticketeria + Guest List + Check-in Engine + Cashless + Super App

| Campo | Valor |
|---|---|
| **Versao** | PRD v4.0 — Documento Mestre Unificado (Stack Node.js) |
| **Data** | Abril 2026 |
| **Autor** | Erick Berberian · SMU Producoes |
| **Status** | Stack implementada — em producao ativa |
| **Competidores** | Sympla · Ingresse · AZList · ZigPay · Shotgun |
| **Posicionamento** | Sistema Operacional de Eventos — 3 produtos em 1 |

### Stack Tecnica

| Camada | Tecnologia |
|---|---|
| **Frontend Web** | React 19 + Vite 7 + CSS Modules |
| **App Mobile** | React Native 0.81 + Expo SDK 54 (iOS & Android) |
| **Router Mobile** | Expo Router v6 (file-based) |
| **Backend** | Express.js 5 + TypeScript 5.5 (Node.js 20+) |
| **ORM** | Prisma 7.7 + @prisma/adapter-pg (Supabase) |
| **Validacao** | Zod 4.0 (request/response schemas) |
| **Banco de Dados** | PostgreSQL 16 via Supabase |
| **Cache / Filas** | Redis 7 (IORedis 5.4) + BullMQ 5.12 |
| **Real-time** | Socket.IO 4.7.5 |
| **Pagamento** | Asaas — Pix + Cartao + Cashless |
| **Deploy App** | EAS Build — Expo Application Services |
| **Deploy Backend** | Docker (Node 20-slim) via GHCR + GitHub Actions |
| **Deploy Web** | Cloudflare Pages via Wrangler |
| **Storage** | Cloudflare R2 |
| **Relatorios Excel** | ExcelJS — 9 abas profissionais por evento |
| **E-mail** | Resend |
| **Monitoring** | Sentry 10.47 |

---

# Sumario

1. [Visao Geral do Produto](#1-visao-geral-do-produto)
2. [Analise Competitiva — Gaps do AZList](#2-analise-competitiva--gaps-do-azlist)
3. [Personas](#3-personas)
4. [Funcionalidades — Os 5 Engines do Sistema](#4-funcionalidades--os-5-engines-do-sistema)
5. [Relatorios Excel Profissionais](#5-relatorios-excel-profissionais)
6. [Stack Tecnica e Arquitetura](#6-stack-tecnica-e-arquitetura)
7. [Schema do Banco de Dados (PostgreSQL)](#7-schema-do-banco-de-dados-postgresql)
8. [API Express — Rotas Completas](#8-api-express--rotas-completas)
9. [Seguranca e Anti-fraude](#9-seguranca-e-anti-fraude)
10. [Deploy e Infraestrutura](#10-deploy-e-infraestrutura)
11. [Modelo de Negocio e Precificacao](#11-modelo-de-negocio-e-precificacao)
12. [Roadmap](#12-roadmap)
13. [Riscos e Mitigacoes](#13-riscos-e-mitigacoes)
14. [Proximos Passos Imediatos](#14-proximos-passos-imediatos)

---

# 1. Visao Geral do Produto

## 1.1 O que e o PulsePass

PulsePass e o primeiro Sistema Operacional de Eventos do Brasil — uma plataforma unificada que combina, em um unico ecossistema, tres produtos que hoje existem separados no mercado: ticketeria (concorre com Sympla e Ingresse), guest list com promoters (concorre com AZList) e cashless digital (concorre com ZigPay). Nenhum concorrente oferece os tres integrados.

| Produto 1: Ticketeria | Produto 2: Guest List | Produto 3: Cashless |
|---|---|---|
| Venda de ingressos com reserva atomica, anti-overbooking, fila inteligente e antifraude | Guest list multi-promoter, check-in nativo iOS/Android com QR JWT rotativo, door police | Carteira digital Pix, PDV por ponto de venda, modo offline, super app do participante |
| **Sympla killer** | **AZList killer** | **ZigPay killer** |

## 1.2 Problema Central

O mercado de eventos no Brasil e fragmentado: a produtora usa Sympla para vender, AZList para a lista, dinheiro fisico no bar e planilhas no Excel para fechar o caixa. Cada ferramenta gera dados isolados, nenhuma conversa com a outra, e o participante carrega dinheiro, pode perder pulseira e enfrenta fila em cada ponto do evento.

## 1.3 Proposta de Valor — Por que somos 10x melhores

| Vantagem | Descricao |
|---|---|
| **Cashless integrado** | Zero dinheiro fisico. Participante recarrega via Pix, gasta no PDV. AZList nao tem. ZigPay nao tem guest list. |
| **QR JWT RS256 rotativo** | Token expira em 5 min, assinado com par de chaves publico/privado. AZCode do AZList e estatico — captura de tela funciona. |
| **Anti-overbooking atomico** | Reserva temporaria com Prisma transaction + optimistic locking no PostgreSQL + Redis. Sympla resolve isso com filas proprias, competidores menores nao. |
| **App nativo iOS e Android** | Expo SDK 54 — scanner QR via expo-camera nativo, biometria, push notifications. AZList e so web com login Facebook. |
| **Modo offline total** | Portaria e PDV funcionam sem internet. Sync automatico quando conexao retorna. Critico para venues sem sinal. |
| **CRM nativo cross-evento** | Perfil completo do participante com historico em todos os eventos, segmentacao para remarketing. Concorrentes nao tem. |
| **Relatorio Excel profissional** | 9 abas formatadas com graficos embutidos, color scales, data bars e KPIs. Gerado automaticamente pos-evento via ExcelJS. |
| **Super App do participante** | Mapa ao vivo, pedido pelo app (zero fila no bar), notificacoes push, gamificacao social. Nenhum concorrente tem. |
| **Stack moderna e escalavel** | Express.js 5 + TypeScript + React 19 + Expo SDK 54 vs AngularJS (EOL 2021) do AZList. Validacao QR em menos de 200ms. |

---

# 2. Analise Competitiva — Gaps do AZList

## 2.1 O que o AZList tem (referencia de mercado)

O AZList (versao R-219, AngularJS, login via Facebook OAuth) e o concorrente mais direto no segmento de guest list. Pontos positivos que devemos espelhar no MVP: virada de lista por horario, door police com listas personalizadas por operador, link publico individual por promoter com pagina de auto-inscricao e campo GenericField para dados customizaveis por evento.

## 2.2 Gaps criticos — onde o PulsePass supera

### $ — Financeiro

| AZList (limitacao) | PulsePass (solucao) |
|---|---|
| Sem cashless — dinheiro fisico circula no evento | Cashless completo: carteira digital + Pix + PDV nativo por ponto de venda |
| Sem controle de consumacao por produto | PDV com estoque, relatorio por produto e ponto de venda em tempo real |
| Sem gestao de estorno ou credito residual | Estorno automatizado + relatorio de sobra pos-evento com saque via Pix |

### M — Mobile

| AZList (limitacao) | PulsePass (solucao) |
|---|---|
| Sem app — so web, login obrigatorio via Facebook OAuth | App nativo iOS & Android (Expo SDK 54) com auth proprio JWT RS256 |
| AZCode estatico — captura de tela funciona para fraude | QR JWT RS256 rotativo a cada 5min — captura de tela inutil apos expiracao |
| Sem suporte offline para portaria | Modo offline com snapshot local + fila de sync — funciona sem internet |
| Sem notificacoes push para o participante | Push via expo-notifications: abertura de lista, recarga confirmada, show comecando |

### S — Seguranca

| AZList (limitacao) | PulsePass (solucao) |
|---|---|
| Sem anti-replay — QR pode ser reaproveitado | Anti-replay Redis: mesmo token rejeitado na segunda leitura dentro da janela |
| Sem controle de capacidade por zona em tempo real | Ocupacao por zona ao vivo via Socket.IO — alerta automatico de lotacao |
| Sem biometria ou 2FA | Biometria via expo-local-authentication (Face ID / impressao digital) |

### D — Dados

| AZList (limitacao) | PulsePass (solucao) |
|---|---|
| Relatorio so exporta Excel basico — sem dashboard analitico | Dashboard ao vivo + Excel profissional com 9 abas + graficos embutidos |
| Sem historico cross-evento do participante | CRM nativo: perfil do participante com historico em todos os eventos |
| Sem segmentacao ou tags de participante | Tags customizaveis + segmentacao para remarketing pos-evento |

### I — Integracao

| AZList (limitacao) | PulsePass (solucao) |
|---|---|
| Sem integracao nativa com Sympla / Ingresso.com | Webhook Sympla + Ingresso.com + API publica para integradores |
| Sem white-label para produtoras | White-label Enterprise: dominio proprio, cores e logo da produtora |
| Sem NFC — so QR Code | v1.2: NFC via Web NFC API + tags fisicas baratas como fallback |

---

# 3. Personas

| | Organizador | Operador / Hostess | Promoter | Participante |
|---|---|---|---|---|
| **Perfil** | Produtora / promoter / empresa | Staff, seguranca, door police | Influencer, agencia, vendedor | Comprador do ingresso |
| **Objetivo** | Controle total, dados, reducao de custo | Validar acesso rapido e sem erro | Adicionar convidados, ganhar comissao | Entrar rapido, pagar facil |
| **Dor principal** | Custo de pulseira, sem dados, fraudes | Filas, sistemas lentos, pulseiras rasgadas | Dificuldade de rastrear seus convidados | Fila, dinheiro fisico, pulseira perdida |
| **Device** | Desktop (Dashboard Web) | Tablet ou celular (App Expo) | Celular (App Expo) | Celular proprio (App Expo) |

---

# 4. Funcionalidades — Os 5 Engines do Sistema

O PulsePass e composto por 5 engines independentes e integrados. Cada engine pode ser ativado ou desativado por evento. A integracao entre eles e o diferencial principal da plataforma.

## Engine 1 — Venda de Ingressos (Ticketeria)

Nivel Sympla + Ticketmaster. Anti-overbooking, fila inteligente, reserva temporaria e antifraude integrado.

### 4.1.1 Reserva Atomica (core anti-overbooking)

Quando o usuario clica em comprar, o sistema executa uma transaction atomica via Prisma no PostgreSQL: verifica disponibilidade, cria TicketReservation com expiracao de 10 minutos e incrementa soldCount. O ingresso fica "segurado" mesmo sem pagamento. Se o pagamento nao ocorrer, um worker BullMQ devolve o ingresso automaticamente.

- Transacao atomica via `prisma.$transaction()`: findUnique → verificar disponivel → criar reserva → incrementar soldCount
- Expiracao automatica via BullMQ job + Redis TTL — sem cron job manual
- Conversao de reserva para ingresso real apenas apos confirmacao do pagamento (webhook Asaas)
- Controle de versao com campo `version` no TicketBatch para optimistic locking

### 4.1.2 Fila Inteligente (eventos grandes)

- Fila virtual via Redis + BullMQ — usuario recebe posicao e tempo estimado de espera
- Liberacao em batches configuravel (ex: 100 usuarios por vez a cada 30 segundos)
- Timeout de posicao: usuario que nao age em 5 minutos perde lugar na fila
- UI com contador visivel e barra de progresso em tempo real via Socket.IO

### 4.1.3 Antifraude e Antibot

- Limite por CPF: maximo de ingressos por documento por evento
- Limite por IP e por deviceFingerprint: maximo de tentativas em janela de 5 minutos
- riskScore calculado em cada compra — compras acima do threshold vao para revisao manual
- Rate limit no endpoint de compra: maximo de 3 tentativas por usuario em 5 minutos (express-rate-limit + advancedRateLimiter middleware)
- Deteccao de scalper: padroes de compra identicos em curto intervalo de tempo

### 4.1.4 Tipos de Ingresso e Lotes

- Multiplos lotes por evento com preco, quantidade e data de abertura/fechamento
- Virada de lote automatica: quando lote esgota, proximo abre automaticamente
- Ingresso nominado com nome do titular — transferencia controlada pelo organizador
- Upgrade de ingresso direto no app antes do evento
- QR Code do ingresso gerado com ticketHash + TOTP (muda a cada 30s) assinado com HMAC

### 4.1.5 Checkout e Pagamento

- Pix instantaneo via Asaas com QR Code na tela e webhook de confirmacao em menos de 10s
- Cartao de credito/debito via Asaas
- Timer visivel no checkout (10:00 → 00:00) — reserva expira e ingresso volta ao estoque
- Fallback automatico se pagamento falhar: nova tentativa ou liberacao da reserva
- Comprovante digital enviado por e-mail (Resend) e disponivel no app apos confirmacao

## Engine 2 — Guest List & Promoters (AZList Killer)

Todas as funcionalidades do AZList mais cashless integrado, QR rotativo, modo offline, push notifications e relatorio Excel profissional.

### 4.2.1 Gestao de Listas

- Multiplas listas por evento com cor, valor, tipo de cota e visibilidade configuravel
- Cota livre ou cota por promoter — organizador define regra por lista
- Virada de lista por horario: lista "Pista" vira "Backstage" automaticamente as 00h
- Listas personalizadas: acesso restrito por operador (door police ve so suas listas)
- Lista publica: pagina de auto-inscricao com slug e token unicos por promoter
- Campo `extraFields` (Json) por lista para dados customizaveis por evento

### 4.2.2 Gestao de Promoters

- Cada promoter tem link publico unico (slug + token) para compartilhar com convidados
- Pagina de auto-inscricao: convidado preenche nome, e-mail e se inscreve sem login
- Dashboard do promoter: ver seus convidados, taxa de conversao e ranking
- Gamificacao: ranking de promoters com medalhas, score e tier (bronze/silver/gold/diamond)
- Relatorio automatico pos-evento enviado por e-mail para cada promoter

### 4.2.3 Gestao de Convidados

- Adicionar convidados individualmente ou em grupo (ate 10+ de uma vez)
- Importar lista via CSV ou via webhook de plataformas de ingresso (Sympla, Ingresso.com)
- Campos completos: nome, CPF (hashed), e-mail, telefone, foto, RG, data nascimento, contato emergencia
- Campos opcionais: empresa, cargo, nacionalidade, passaporte, RNE, visto, CEP, genero
- Historico cross-evento: perfil completo do participante com todos os eventos que participou
- Tags customizaveis por participante para segmentacao e remarketing

## Engine 3 — Check-in Engine (50.000 pessoas sem cair)

Check-in hibrido online + offline com validacao local instantanea, sincronizacao assincrona, anti-fraude em tempo real e suporte a multiplas portas simultaneas.

### 4.3.1 QR Code Inteligente (Anti-fraude)

- Estrutura do QR: ticketHash + eventId + timestamp + assinatura HMAC com TOTP (muda a cada 30s)
- Print nao funciona: QR expira em 30 segundos — captura de tela e inutil
- Replay attack impossivel: backend rejeita token ja usado via cache Redis com TTL de 5 minutos
- JWT RS256 rotativo para guest list: expira em 5 minutos, assina allowed_zones e participant_id

### 4.3.2 App de Portaria — Offline First

- Download de snapshot antes do evento: todos os ingressos/convidados salvos localmente (IndexedDB na web, SQLite no mobile)
- Validacao local em menos de 100ms — sem dependencia de internet na porta
- Marca ingresso como usado localmente imediatamente — participante entra sem espera
- Sincronizacao assincrona com o backend quando conexao estiver disponivel
- Deteccao de conflito: mesmo ingresso usado em duas portas offline gera alerta de fraude
- Scanner nativo via expo-camera CameraView + onBarcodeScanned (iOS: DataScannerViewController, Android: MLKit)

### 4.3.3 Feedback Visual e UX

- Feedback imediato: verde (autorizado), vermelho (negado/expirado), laranja (zona incorreta)
- Exibe nome, foto e tipo de ingresso do participante apos leitura
- Vibracao e som — operador nao precisa olhar a tela para cada scan
- Modo de baixa luminosidade: flash automatico para venues escuros

### 4.3.4 Escalabilidade Real

- 10 a 20 check-ins por segundo por dispositivo — 100 dispositivos = 2.000 check-ins/s
- Express.js com Node.js event loop non-blocking: validacao de QR em menos de 200ms mesmo sob carga
- Worker BullMQ de deteccao de fraude: mesmo ingresso usado duas vezes em menos de 1 minuto = flag automatico
- Analytics por porta: heatmap de entrada, gargalos por checkpoint, pico por minuto
- Controle de capacidade por zona ao vivo via Socket.IO com alerta de lotacao

## Engine 4 — Cashless Engine (ZigPay Killer)

Cashless completo com carteira digital Pix, PDV offline, antifraude financeiro, controle de estoque e fechamento automatico pos-evento.

### 4.4.1 Carteira Digital (Wallet)

- Saldo armazenado em `balanceCents` (nunca calculado dinamicamente) com controle de versao
- Recarga via Pix instantaneo: usuario gera QR no app, webhook Asaas credita em menos de 30s
- Limite offline configuravel por plano: participante geral R$200, VIP ate R$1.000
- Bonus de recarga configuravel: carregue R$100, ganhe R$110 — incentiva consumo
- Historico completo de transacoes em tempo real no app do participante

### 4.4.2 PDV (Ponto de Venda)

- Interface simplificada no tablet: selecionar produto → quantidade → escanear QR → confirmar
- Debito atomico: `prisma.$transaction()` garante impossibilidade de duplo debito
- Controle de estoque por PDV: baixa automatica na venda, alerta de estoque baixo
- Modo offline: debita localmente com limite configuravel, sincroniza quando internet retorna
- Relatorio por PDV em tempo real: faturamento, produtos mais vendidos, ticket medio

### 4.4.3 Antifraude Financeiro

- Saldo negativo impossivel: validacao dupla (frontend + backend + atomicidade no banco)
- Double spend offline controlado: offlineLimit por carteira — acima exige conexao
- Deteccao de padroes suspeitos: multiplas compras em segundos, divergencia de saldo offline
- Log imutavel de todas as transacoes com `balanceAfter` e timestamp

### 4.4.4 Fechamento e Saque

- Fechamento automatico ao encerrar o evento: saldo residual calculado por participante
- Saque via Pix automatizado pos-evento com prazo configuravel pelo organizador
- Taxa de saque opcional — saldo nao resgatado em X dias reverte para o organizador
- Relatorio financeiro completo: receita total, ticket medio, consumo por lista e por PDV

## Engine 5 — Super App do Participante

O app que transforma a experiencia do evento. Mapa ao vivo, pedido pelo app, zero fila no bar, notificacoes push e gamificacao social.

### 4.5.1 Home do Participante

- Ingresso digital com QR rotativo — botao "Entrar no Evento" abre QR imediatamente
- Saldo cashless em tempo real com botao de recarga com 1 clique
- Destaques do evento: lineup, proximos shows, alertas do organizador
- Mapa interativo do venue com localizacao em tempo real

### 4.5.2 Pedido pelo App (Zero Fila no Bar)

- Usuario escolhe bar, seleciona produtos, confirma com saldo cashless
- Fila de pedidos em tempo real: status preparando → pronto → entregue
- Notificacao push quando pedido estiver pronto
- Retirada no balcao prioritario ou entrega na area VIP (configuravel por evento)
- Impacto: aumento de 30 a 50% no consumo medio por eliminacao da barreira da fila

### 4.5.3 Mapa Interativo do Venue

- Zonas: palcos, bares, banheiros, saidas, primeiros socorros
- Heatmap de multidao: onde esta cheio e onde esta vazio em tempo real
- Localizacao de amigos dentro do evento (com permissao)
- Alertas de proximidade: "Bar 3 esta vazio agora" quando filas estao grandes

### 4.5.4 Social e Gamificacao

- Adicionar amigos e ver quem esta no evento
- Ranking de consumo gamificado entre amigos (opcional, opt-in)
- Promoter digital no app: usuario compartilha link e acumula pontos por cada check-in
- Historico de eventos com badge por evento participado — colecao digital

### 4.5.5 Notificacoes e Engajamento

- Push via expo-notifications: show comecando, recarga confirmada, pedido pronto, abertura de lista
- Notificacoes de remarketing pos-evento: proximo evento da produtora com desconto early bird
- Dynamic pricing alert: ingresso de outro lote disponivel por tempo limitado

---

# 5. Relatorios Excel Profissionais

O PulsePass gera relatorios Excel (ExcelJS) com 9 abas formatadas, graficos embutidos, color scales automaticos, data bars e KPIs. Gerado automaticamente pos-evento e enviado por e-mail para o organizador. 10x superior ao Excel basico do AZList.

| # | Aba | Conteudo |
|---|---|---|
| 1 | Resumo Executivo | Banner PulsePass, 4 KPI cards com formulas dinamicas, rankings com medalhas, info do evento |
| 2 | Lista de Convidados | Lista completa com cabecalho congelado, badge colorido por lista, status verde/vermelho, totais |
| 3 | Por Promoter | Tabela com data bars, breakdown por lista cruzado, conversao %, rankings, grafico de barras embutido |
| 4 | Por Lista | Conversao %, nao-entraram, ticket medio, pie chart embutido, color scale na conversao |
| 5 | Por Hostess | Check-ins, participacao %, horario do primeiro e ultimo check-in, data bars roxos |
| 6 | Analise Temporal | Check-ins por hora com acumulado, pico destacado em dourado automaticamente, line chart embutido |
| 7 | Por Genero | Breakdown masc/fem/nao-identificado por lista cruzado |
| 8 | Cashless e Financeiro | Receita total, ticket medio, receita potencial perdida, receita por lista, color scale verde |
| 9 | KPIs Avancados | 20+ indicadores por secao: performance geral, promoters, listas, hostess, financeiro |

Diferenciais sobre o AZList: o AZList exporta 5 abas com dados basicos e sem graficos. O PulsePass exporta 9 abas com graficos embutidos, color scales automaticos, KPIs calculados por formula Excel (nao hardcoded), design profissional com paleta PulsePass e rodape institucional.

---

# 6. Stack Tecnica e Arquitetura

## 6.1 Visao Geral

Monorepo npm workspaces com quatro pacotes: Backend API (Express.js + TypeScript), Frontend Web (React + Vite), App Mobile (React Native + Expo) e Shared Types (TypeScript + Zod). Comunicacao exclusivamente via REST API JWT RS256. Canal Socket.IO adicional para dados em tempo real. Redis para cache, filas e anti-replay.

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Frontend Web | React 19 + Vite 7 | Dashboard organizador + promoter — gestao, relatorios, analytics ao vivo |
| Estilos Web | CSS Modules (scoped) | Estilizacao por componente, tema light/dark, responsivo |
| App Mobile | React Native 0.81 + Expo SDK 54 | Participante, Portaria, PDV, Super App — iOS e Android nativos |
| Router Mobile | Expo Router v6 | File-based routing, deep links, tab navigation, protected routes |
| Backend API | Express.js 5 + TypeScript 5.5 | REST API — auth, ticketeria, guest list, acesso, cashless |
| Validacao | Zod 4.0 | Schemas de request/response, validacao em middleware, type inference |
| ORM | Prisma 7.7 | Queries type-safe, transactions atomicas, optimistic locking, migrations |
| Banco | PostgreSQL 16 (Supabase) | Dados relacionais, connection pooling, indices otimizados |
| Cache / Filas | Redis 7 (IORedis) + BullMQ 5.12 | Anti-replay QR, reserva temporaria, fila inteligente, jobs de expiracao |
| Auth | jsonwebtoken (JWT RS256) | Multi-perfil: organizador, operador, promoter, participante |
| Pagamento | Asaas | Pix (ingresso + cashless), cartao, webhook de confirmacao, split de receita |
| QR Geracao | qrcode + jsonwebtoken | QR com JWT RS256 embutido rotativo — retorno base64 para o app |
| QR Leitura | expo-camera CameraView | Scanner nativo iOS (DataScannerViewController) e Android (MLKit) |
| Realtime | Socket.IO 4.7.5 | Dashboard ao vivo: entradas, ocupacao, alertas, fila de venda |
| Push | expo-notifications | Notificacoes nativas iOS e Android para participantes |
| E-mail | Resend | QR Code, ingresso, relatorios pos-evento, confirmacoes |
| Relatorios | ExcelJS | 9 abas Excel com graficos, color scales e data bars por evento |
| Storage | Cloudflare R2 | Fotos de participantes, logos de eventos, relatorios PDF/Excel |
| Logging | Pino 9.4 + Pino Pretty | Structured logging, request tracing, error context |
| Monitoring | Sentry 10.47 | Error tracking + performance monitoring (frontend + backend) |
| Deploy Web | Cloudflare Pages | CI/CD automatico via GitHub Actions + Wrangler |
| Deploy Backend | Docker (Node 20-slim) | Container via GHCR, health check, variaveis por stage |
| Deploy App | EAS Build (Expo) | Build nativo iOS (.ipa) e Android (.aab), OTA updates via EAS Update |

## 6.2 Versoes Fixadas (Producao)

### Backend (package.json)

```json
{
  "dependencies": {
    "express": "^5.0.0",
    "typescript": "^5.5.0",
    "@prisma/client": "^7.7.0",
    "@prisma/adapter-pg": "^7.7.0",
    "ioredis": "^5.4.0",
    "bullmq": "^5.12.0",
    "socket.io": "^4.7.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^4.0.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.4.0",
    "resend": "^4.0.0",
    "pino": "^9.4.0",
    "pino-pretty": "^11.2.0",
    "@sentry/node": "^10.47.0",
    "exceljs": "^4.4.0",
    "@aws-sdk/client-s3": "^3.0.0"
  }
}
```

### Frontend Web (package.json)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.56.0",
    "socket.io-client": "^4.7.5",
    "recharts": "^2.12.0",
    "zod": "^4.0.0",
    "@sentry/react": "^10.47.0"
  },
  "devDependencies": {
    "vite": "^7.0.0",
    "typescript": "^6.0.0",
    "vitest": "^4.1.0",
    "@playwright/test": "latest",
    "msw": "^2.13.0"
  }
}
```

### Mobile (package.json)

```json
{
  "dependencies": {
    "expo": "~54.0.0",
    "react-native": "~0.81.5",
    "expo-camera": "~17.0.0",
    "expo-router": "~6.0.0",
    "expo-notifications": "~0.32.0",
    "expo-local-authentication": "~15.0.0",
    "expo-secure-store": "~15.0.0",
    "react-native-qrcode-svg": "^6.3.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.56.0"
  }
}
```

### Shared Types (package.json)

```json
{
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^6.0.0"
  }
}
```

## 6.3 Estrutura do Monorepo

```
ticket-real/
├── ticketeria-api/                  # Express.js 5 + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma            # Schema completo (1216 linhas, 17+ models, 22+ enums)
│   │   ├── migrations/              # Prisma migrations versionadas
│   │   └── seed.ts                  # Dados de teste
│   ├── src/
│   │   ├── config/                  # env.ts, redis.ts, swagger.ts
│   │   ├── generated/prisma/        # Prisma client gerado automaticamente
│   │   ├── middleware/              # auth, rateLimiter, advancedRateLimiter,
│   │   │                            # idempotency, validate, requestId, flashSaleQueue
│   │   ├── modules/                 # 35 modulos de rota (ver secao 8)
│   │   │   ├── auth/               # routes + service + schema
│   │   │   ├── events/             # routes + service + schema
│   │   │   ├── tickets/            # routes + service + schema
│   │   │   ├── checkin/            # routes + service + schema
│   │   │   ├── cashless/           # routes + service + schema
│   │   │   ├── guest-lists/        # routes + service + schema
│   │   │   ├── promoters/          # routes + service + schema
│   │   │   └── ...                 # (28 modulos adicionais)
│   │   ├── lib/                    # prisma.ts, redis.ts, utils
│   │   ├── workers/                # 7 BullMQ workers
│   │   ├── tests/                  # 17 arquivos de teste (unit + integration)
│   │   └── server.ts               # Entry point: Express app + Socket.IO + middleware stack
│   ├── Dockerfile                  # Node 20-slim, multi-stage build
│   ├── Caddyfile                   # Reverse proxy (producao)
│   └── .github/workflows/ci.yml   # CI: lint + typecheck + test + build + docker
│
├── ticketeria-web/                  # React 19 + Vite 7
│   ├── src/
│   │   ├── features/               # Modulos por feature
│   │   │   ├── home/               # HeroSection, CategorySection, TrendingSection...
│   │   │   ├── event/              # EventHero, EventInfo, EventGallery, BatchSelector...
│   │   │   ├── checkout/           # CheckoutFlow, OrderSummary, PaymentForm, PixQR
│   │   │   ├── admin/              # Dashboard, Events, Users, Finance, Reports...
│   │   │   ├── auth/               # LoginPage, RegisterPage
│   │   │   ├── profile/            # ProfilePage
│   │   │   ├── search/             # SearchPage
│   │   │   └── tickets/            # MyTicketsPage
│   │   ├── shared/
│   │   │   ├── components/         # 15+ UI: Avatar, Badge, Button, Card, Modal, Toast...
│   │   │   ├── hooks/              # useAuth, useDocumentHead, query hooks
│   │   │   ├── stores/             # authStore, cartStore, notificationStore (Zustand)
│   │   │   ├── services/           # api.ts, socket.ts
│   │   │   ├── lib/                # offlineTickets.ts (IndexedDB)
│   │   │   └── layouts/            # PublicLayout, AdminLayout, Footer
│   │   ├── router.tsx              # 18 rotas (public, auth, protected, admin)
│   │   └── App.tsx
│   ├── e2e/                        # Playwright E2E tests
│   └── .github/workflows/deploy.yml
│
├── ticketeria-mobile/               # React Native + Expo SDK 54
│   ├── src/
│   │   ├── screens/                # 9 telas: Home, Event, Checkout, Tickets, Checkin...
│   │   ├── components/             # 12 componentes reutilizaveis
│   │   ├── lib/                    # totp.ts, api.ts, storage.ts
│   │   └── styles/                 # theme.ts
│   └── app.json                    # Expo config, permissoes, plugins
│
├── ticketeria-types/                # TypeScript tipos compartilhados
│   └── src/                        # 22 arquivos: DTOs, validators, enums, constants
│
├── docker-compose.yml              # PostgreSQL 16 + Redis 7 (dev local)
├── turbo.json                      # Monorepo task runner
├── package.json                    # npm workspaces root
├── setup.sh / setup.ps1            # Scripts de setup
└── .github/workflows/              # CI/CD pipelines
```

---

# 7. Schema do Banco de Dados (PostgreSQL)

## 7.1 Diagrama de Entidades

```
Organizacao                    Evento                         Participacao
─────────────                  ──────────                     ──────────────
User → Producer                Event → TicketBatch → Ticket   CheckinLog
  └→ roles (consumer,         Event → GuestList → GuestEntry  AffiliateLink
      producer, admin)         Event → EventArea → EventStaff  Favorite
                               Event → CashlessConfig          EventReview

Financeiro                     Operacional
─────────────                  ──────────────
Order → PaymentSplit           Notification
CashlessWallet                 AuditLog
  └→ CashlessTransaction      Permission
Coupon                         Credential
                               Certificate
```

## 7.2 Schema Prisma Principal

> Schema completo em `ticketeria-api/prisma/schema.prisma` (1216 linhas)

### Models Core

```prisma
model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  cpf           String?   @unique
  phone         String?
  password      String
  role          UserRole  @default(consumer)
  emailVerified Boolean   @default(false)
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Event {
  id              String      @id @default(uuid())
  producerId      String
  name            String
  slug            String      @unique
  description     String?
  category        EventCategory
  status          EventStatus @default(draft)
  startDate       DateTime
  endDate         DateTime
  location        String
  capacity        Int
  cashlessEnabled Boolean     @default(true)
  ticketingEnabled Boolean    @default(false)
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model TicketBatch {
  id          String    @id @default(uuid())
  eventId     String
  name        String
  type        BatchType
  priceCents  Int
  quantity    Int
  soldCount   Int       @default(0)
  version     Int       @default(0)  // optimistic locking
  opensAt     DateTime?
  closesAt    DateTime?
}

model Ticket {
  id          String       @id @default(uuid())
  eventId     String
  batchId     String
  orderId     String
  userId      String
  holderName  String
  ticketHash  String       @unique
  totpSecret  String
  status      TicketStatus @default(active)
  checkedInAt DateTime?
  riskScore   Float?
  deviceFp    String?
  ipAddress   String?
}

model CashlessWallet {
  id              String  @id @default(uuid())
  userId          String
  eventId         String
  balanceCents    Int     @default(0)
  totalSpentCents Int     @default(0)
  offlineLimit    Int     @default(20000)
  version         Int     @default(0)  // optimistic locking
}

model CashlessTransaction {
  id              String                    @id @default(uuid())
  walletId        String
  eventId         String
  type            CashlessTransactionType
  amountCents     Int
  balanceAfter    Int
  asaasPaymentId  String?
  products        Json?
  createdAt       DateTime                  @default(now())
}
```

### Models Extended

```prisma
// Guest List Engine
model GuestList    { ... }  // Listas por evento com cor, cota, horario
model GuestEntry   { ... }  // Convidados com QR secret + extra fields
model Promoter     { ... }  // Tiers: bronze, silver, gold, diamond

// Check-in Engine
model CheckinLog   { ... }  // direction (in/out), result, device, operator

// Operacional
model EventArea    { ... }  // Zonas do venue
model EventStaff   { ... }  // Equipe + roles
model BoxOfficeSession { ... }  // Bilheteria fisica
model Courtesy     { ... }  // Cortesias/convites

// Financeiro
model Order        { ... }  // pending/paid/cancelled/refunded
model PaymentSplit { ... }  // Revenue share
model PriceRule    { ... }  // Dynamic pricing

// Extras
model AffiliateLink { ... } // Referral tracking
model Coupon       { ... }  // Codigos de desconto
model Notification { ... }  // email/push/in-app
model AuditLog     { ... }  // Compliance tracking
model Permission   { ... }  // RBAC
model Credential   { ... }  // API keys para produtores
model Certificate  { ... }  // Badges digitais
model Insurance    { ... }  // Seguro de evento
```

### Enums (22+)

```prisma
enum UserRole          { consumer, producer, admin }
enum EventStatus       { draft, published, active, completed, cancelled }
enum EventCategory     { party, show, festival, conference, sports, theater, other }
enum BatchType         { regular, vip, backstage, camarote }
enum OrderStatus       { pending, paid, cancelled, refunded }
enum PaymentMethod     { pix, credit_card, debit_card, boleto }
enum TicketStatus      { active, used, cancelled, transferred, expired }
enum TransferStatus    { pending, confirmed, cancelled, expired }
enum CheckinResult     { authorized, denied, already_used, expired, wrong_zone }
enum DiscountType      { percentage, fixed }
enum NotificationType  { order_confirmed, ticket_ready, checkin_reminder, ... }
enum PromoterTier      { bronze, silver, gold, diamond }
enum CashlessTransactionType { recharge, purchase, refund, bonus, withdrawal }
// ... (10+ enums adicionais)
```

---

# 8. API Express — Rotas Completas

**Prefixo base:** `/api/v1/`

### AUTH — Autenticacao

| Rota | Auth | Descricao |
|---|---|---|
| POST /auth/register | publico | Registro com email + senha — envia verificacao |
| POST /auth/login | publico | Login multi-perfil — retorna JWT access + refresh token |
| POST /auth/refresh | refresh token | Renovacao de JWT sem nova senha |
| POST /auth/logout | JWT | Revoga refresh token |
| POST /auth/2fa/setup | JWT | Habilita TOTP (otplib) |
| POST /auth/2fa/verify | JWT | Verifica codigo TOTP |
| POST /auth/2fa/disable | JWT | Desabilita 2FA |
| POST /auth/email/verify | publico | Verifica e-mail via token |
| POST /auth/password/reset | publico | Inicia reset de senha |
| POST /auth/password/confirm | publico | Confirma reset com token |

### TICK — Ticketeria

| Rota | Auth | Descricao |
|---|---|---|
| GET /events/:id/batches | publico | Lotes disponiveis com preco e quantidade restante |
| POST /tickets/reserve | usuario | Reserva atomica: prisma.$transaction() + BullMQ expiracao |
| POST /tickets/confirm | usuario | Confirma reserva apos webhook Asaas — gera ticket + QR |
| GET /tickets/my | usuario | Ingressos do usuario com QR base64 |
| POST /tickets/transfer | usuario | Transferir ingresso para outro usuario |
| POST /tickets/queue/join | usuario | Entrar na fila inteligente para evento com alta demanda |
| GET /tickets/:id | usuario | Detalhes do ingresso |

### EVNT — Eventos

| Rota | Auth | Descricao |
|---|---|---|
| GET /events | publico | Lista de eventos com filtros e paginacao |
| POST /events | producer | Criar evento com zonas, lotes, listas e config cashless |
| GET /events/:id | publico | Detalhes do evento |
| PUT /events/:id | producer | Atualizar evento |
| DELETE /events/:id | producer | Cancelar evento |
| GET /events/:id/live | producer | Snapshot tempo real: checkins, ocupacao, faturamento |
| GET /events/:id/metrics | producer | KPIs do evento: receita, tickets vendidos, checkins, avg spend |

### GUST — Guest List

| Rota | Auth | Descricao |
|---|---|---|
| GET /guest-lists | producer | Listas do evento com filtros |
| POST /guest-lists | producer | Criar lista com cor, cota, horario |
| POST /guest-lists/:id/entries | producer/promoter | Adicionar convidado — dispara QR por e-mail |
| POST /guest-lists/import | producer | Importar lista via CSV (multipart/form-data) |
| POST /guest-lists/register | publico | Auto-inscricao via link do promoter |
| GET /guest-lists/:id/entries | producer | Lista de convidados com filtros |

### CHKN — Check-in

| Rota | Auth | Descricao |
|---|---|---|
| POST /checkin/validate | operator | Valida QR em < 200ms — grava CheckinLog + broadcast Socket.IO |
| POST /checkin/sync | operator | Sincronizar batch de checkins realizados offline |
| GET /checkin/logs | producer | Historico de acessos com filtros por zona, periodo, status |

### CASH — Cashless

| Rota | Auth | Descricao |
|---|---|---|
| GET /cashless/balance | participante/PDV | Saldo atual da carteira |
| POST /cashless/charge | operador PDV | Debito atomico no PDV — impossivel duplicar |
| POST /cashless/recharge | participante | Gerar cobranca Pix Asaas para recarga |
| POST /cashless/topup | webhook Asaas | Confirma Pix e credita saldo automaticamente |
| POST /cashless/sync | operador PDV | Sincronizar transacoes realizadas offline |

### ORDR — Pedidos (Super App)

| Rota | Auth | Descricao |
|---|---|---|
| POST /orders | participante | Criar pedido no bar via super app — debita wallet |
| GET /orders/my | participante | Status dos pedidos em tempo real |
| PATCH /orders/:id/status | operador PDV | Atualizar status: preparando → pronto → entregue |

### RPTS — Relatorios

| Rota | Auth | Descricao |
|---|---|---|
| GET /reports/:eventId | producer | KPIs completos do evento em JSON |
| GET /reports/:eventId/excel | producer | Download Excel 9 abas gerado com ExcelJS |
| GET /reports/:eventId/sales | producer | Relatorio de vendas |
| GET /reports/:eventId/checkins | producer | Relatorio de check-ins |

### Rotas Adicionais (28 modulos)

| Modulo | Prefixo | Descricao |
|---|---|---|
| users | /users | CRUD usuarios |
| producers | /producers | Onboarding + perfil financeiro |
| payments | /payments | Webhook Asaas + status |
| affiliates | /affiliates | Links de afiliados + tracking |
| admin | /admin | Painel administrativo |
| favorites | /favorites | Wishlist de eventos |
| live | /live | Dados real-time |
| promoters | /promoters | CRUD + tiers |
| staff | /staff | Equipe do evento |
| areas | /areas | Zonas do venue |
| store | /store | Produtos PDV |
| courtesies | /courtesies | Cortesias/convites |
| box-office | /box-office | Bilheteria fisica |
| waitlist | /waitlist | Lista de espera |
| price-rules | /price-rules | Regras de preco dinamico |
| permissions | /permissions | RBAC |
| credentials | /credentials | API keys para produtores |
| certificates | /certificates | Badges digitais |
| insurance | /insurance | Seguro de evento |
| form-fields | /form-fields | Campos customizaveis |

### WebSocket (Socket.IO)

| Evento | Auth | Descricao |
|---|---|---|
| connection | JWT no handshake | Autentica e associa ao evento |
| checkin:new | broadcast | Novo check-in em tempo real |
| capacity:update | broadcast | Atualizacao de ocupacao por zona |
| sale:new | broadcast | Nova venda confirmada |
| alert:capacity | broadcast | Alerta de lotacao por zona |

### Infraestrutura

| Rota | Descricao |
|---|---|
| GET /health | Health check |
| /api-docs | Swagger/OpenAPI documentation |

---

# 9. Seguranca e Anti-fraude

## 9.1 QR Code — Fluxo de Validacao Completo

| # | Etapa | Detalhe tecnico |
|---|---|---|
| 1 | Participante abre o app | GET /tickets/my com Bearer JWT — backend retorna ticket com QR data |
| 2 | TOTP gerado no mobile | Mobile gera TOTP a cada 30s usando `totpSecret` do ticket (HMAC-SHA1 RFC 6238) |
| 3 | QR renderizado no app | Format: `ticketHash:totpCode` — react-native-qrcode-svg renderiza localmente |
| 4 | Refresh automatico | TOTP muda a cada 30s automaticamente — participante nunca ve QR expirado |
| 5 | Operador escaneia | expo-camera CameraView captura QR — latencia de hardware menor que 100ms |
| 6 | POST /checkin/validate | ticketHash + totpCode + eventId enviados ao backend |
| 7 | Validacao em < 200ms | Buscar ticket → verificar TOTP valido (janela 30s) → anti-replay Redis → gravar log |
| 8 | Feedback visual | Verde = autorizado \| Vermelho = negado/expirado \| Laranja = zona incorreta |
| 9 | Log gravado + broadcast | INSERT em CheckinLog + Socket.IO emit para dashboard do organizador em tempo real |

**Para Guest List (JWT RS256):**

| # | Etapa | Detalhe tecnico |
|---|---|---|
| 1 | Convidado abre link | GET /guest-lists/me/qr com Bearer JWT — backend gera novo token RS256 |
| 2 | Token JWT RS256 gerado | Payload: participantId, eventId, allowedZones, iat, exp (+5min). jsonwebtoken RS256. |
| 3 | QR renderizado | QR contendo JWT RS256 assinado — renderizado no app ou pagina web |
| 4 | Refresh automatico | React Query refetchInterval de 4min50s — convidado nunca ve QR expirado |
| 5 | Validacao | Verificar assinatura RS256 (chave publica) → exp → zone permitida → anti-replay Redis |

## 9.2 Todas as Protecoes Implementadas

- **JWT RS256** com par de chaves publico/privado — impossivel forjar sem chave privada
- **Expiracao de 5 minutos** nos tokens de guest list — captura de tela inutilizada rapidamente
- **TOTP nos ingressos**: QR muda a cada 30 segundos — print nunca funciona
- **Anti-replay Redis**: token rejeitado na segunda leitura dentro da janela de validade
- **allowed_zones no payload** — operador na zona errada recebe feedback laranja
- **Rate limit**: express-rate-limit global (100 req/min) + advancedRateLimiter por CPF/device/IP/cartao
- **Antifraude de ingresso**: riskScore, deviceFingerprint, ipAddress, limite por CPF e IP
- **Deteccao de scalper**: padroes de compra repetidos em janela de 5 minutos
- **Atomicidade financeira**: saldo negativo impossivel com prisma.$transaction() + validacao dupla
- **Double spend offline**: offlineLimit por carteira — acima exige conexao com backend
- **Deteccao de fraude em tempo real**: mesmo ingresso usado 2x em < 1 minuto = alerta via BullMQ worker
- **Idempotencia Redis**: operacoes de pagamento com chave de idempotencia (middleware)
- **Helmet**: headers de seguranca HTTP
- **CORS**: origins restritas (frontend, admin, checkin)
- **Request ID**: UUID por request para tracing
- **Audit logging**: todas as acoes criticas registradas
- **2FA TOTP**: opcional para contas de organizadores (otplib)
- **bcryptjs cost 12**: hash de senhas
- **Zod validation**: todos os inputs validados em middleware

---

# 10. Deploy e Infraestrutura

| Servico | Plataforma | Configuracao |
|---|---|---|
| Frontend Web | Cloudflare Pages | Auto-deploy via GitHub Actions + Wrangler; vars: VITE_API_BASE_URL, VITE_SOCKET_URL |
| Backend API | Docker (GHCR) | Dockerfile Node 20-slim, multi-stage build, health check, variaveis por stage |
| Redis | Railway (Redis 7) ou Upstash | Cache anti-replay, filas BullMQ, sessoes de fila inteligente |
| Banco | Supabase | PostgreSQL 16 + connection pooling via pgbouncer |
| Storage | Cloudflare R2 | Bucket: ticketeria (fotos, logos, relatorios) |
| App iOS | EAS Build + App Store | eas build --platform ios; OTA updates via EAS Update |
| App Android | EAS Build + Play Store | eas build --platform android; .aab para Play Store |
| CI/CD | GitHub Actions | lint + typecheck + test + build + docker push + deploy |
| Monitoring | Sentry | Error tracking + performance (frontend + backend) |
| Reverse Proxy | Caddy 2 | HTTPS automatico, compression, rate limiting (producao) |

### Docker Compose (Desenvolvimento Local)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ticketeria
      POSTGRES_USER: ticketeria
      POSTGRES_PASSWORD: ticketeria
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

---

# 11. Modelo de Negocio e Precificacao

## 11.1 Planos SaaS

| | Starter | Growth | Pro | Enterprise |
|---|---|---|---|---|
| **Publico** | Festas pequenas | Shows e festivais | Produtoras ativas | Grandes produtoras |
| **Participantes** | Ate 500/evento | Ate 5.000/evento | Ate 20.000/evento | Ilimitado |
| **Mensalidade** | R$ 149/mes | R$ 490/mes | R$ 990/mes | R$ 1.990/mes |
| **Taxa/participante** | R$ 0,50 | R$ 0,35 | R$ 0,25 | R$ 0,15 |
| **Ticketeria** | Adicional | Incluido | Incluido | Incluido |
| **Cashless** | Incluido | Incluido | Incluido | Incluido |
| **Taxa cashless** | 1,9% / transacao | 1,5% / transacao | 1,2% / transacao | 0,9% / transacao |
| **Super App** | - | Basico | Completo | White-label |
| **Excel 9 abas** | Incluido | Incluido | Incluido | Incluido |
| **Suporte** | E-mail | Chat + E-mail | WhatsApp | WhatsApp + SLA 4h |

## 11.2 Fontes de Receita

| Fonte | Modelo | Potencial Mensal |
|---|---|---|
| Mensalidade SaaS | Recorrente por produtora | Principal fonte de MRR |
| Taxa por participante | R$ 0,15 a R$ 0,50 por cadastro | Escala com volume de eventos |
| % cashless | 0,9% a 1,9% sobre volume processado | Alto potencial em eventos grandes |
| Taxa de saque cashless | % opcional sobre saldo residual | Dinheiro parado = lucro |
| Taxa de conveniencia ingresso | Repassada ao comprador | Receita adicional na ticketeria |
| Setup Enterprise | Fee unico para onboarding | Eventos acima de 10.000 participantes |
| White-label | Fee mensal adicional | Dominio proprio + customizacao |
| API publica | Por requisicao ou por integracao | Ecossistema de parceiros |

---

# 12. Roadmap

| Fase | Periodo | Entregas |
|---|---|---|
| **MVP** | Mes 1 a 3 | Dashboard web, apps Expo (participante + portaria + PDV), Express.js API completa, QR rotativo TOTP + JWT RS256, Guest list multi-promoter, Cashless Pix Asaas, Excel 9 abas (ExcelJS), modo offline basico, anti-overbooking |
| **v1.1** | Mes 4 a 5 | Ticketeria completa com fila inteligente, antifraude avancado, webhook Sympla/Ingresso.com, biometria no app, modo offline robusto com sync queue, push notifications (FCM + Expo) |
| **v1.2** | Mes 6 a 7 | Super App completo (mapa, pedido pelo app, social, gamificacao), NFC via Web NFC API, analytics avancado com heatmap de zonas, white-label Enterprise |
| **v1.3** | Mes 8 a 9 | Dynamic pricing (preco sobe conforme demanda), credito pre-evento com bonus, modelo preditivo de pico de entrada por ML, integracao com CRM e ferramentas de marketing |
| **v2.0** | Mes 10+ | API publica para integradores, marketplace de servicos de evento, programa de parceiros (produtoras revendem PulsePass) |

---

# 13. Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Participante sem bateria no celular na porta | Alto | Imprimir QR backup no check-in; totens de recarga no venue |
| Internet instavel no local do evento | Alto | Modo offline total: app + PDV funcionam sem internet + sync automatico |
| Race condition na venda (overbooking) | Alto | prisma.$transaction() atomica + optimistic locking (campo version) + Redis |
| Fraude: captura de tela do QR | Medio | TOTP nos ingressos (30s) + JWT RS256 5min na guest list + anti-replay Redis |
| Double spend cashless offline | Medio | offlineLimit por carteira + reconciliacao na sincronizacao |
| Atraso no Pix Asaas (maior que 30s) | Baixo | Credito apos webhook confirmado — SLA Asaas menor que 10s na media |
| Rejeicao ao app por participantes mais velhos | Medio | Tag NFC barata opcional + QR impresso como fallback fisico |
| Node.js event loop blocking | Baixo | Workers BullMQ para tarefas pesadas; Pino async logging; cluster mode |

---

# 14. Proximos Passos Imediatos

| # | Tarefa | Responsavel | Prazo |
|---|---|---|---|
| 1 | Inicializar repositorio git + configurar .gitignore | Erick | Semana 1 |
| 2 | Migrar JWT de HS256 para RS256 (gerar par de chaves) | Erick | Semana 1 |
| 3 | Implementar Socket.IO JWT auth no handshake | Erick | Semana 1 |
| 4 | Integrar push notifications (FCM + Expo Notifications) | Erick | Semana 2 |
| 5 | Implementar relatorio Excel 9 abas com ExcelJS | Erick | Semana 2 |
| 6 | Completar anti-replay Redis no modulo de check-in | Erick | Semana 2 |
| 7 | Revisar TOTP mobile para producao (HMAC-SHA1 completo) | Erick | Semana 3 |
| 8 | Testar fluxo completo: compra → pagamento → ticket → QR → check-in | Erick | Semana 3 |
| 9 | Testar cashless completo: recarga PIX → compra PDV → fechamento | Erick | Semana 4 |
| 10 | Testar guest list: criar lista → promoter link → auto-inscricao → check-in | Erick | Semana 4 |
| 11 | EAS Build preview — instalar no device fisico para teste real | Erick | Semana 5 |
| 12 | Modo offline mobile: SQLite snapshot + sync queue | Erick | Semana 5 |
| 13 | Socket.IO: dashboard ao vivo + alertas de capacidade | Erick | Semana 6 |
| 14 | Evento piloto com produtora parceira — validacao real com publico | Erick + parceiro | Mes 3 |

---

**PulsePass — PRD v4.0 · Sistema Operacional de Eventos**

Erick Berberian · SMU Producoes · CNPJ 29.693.164/0001-23

Express.js 5 · TypeScript · React 19 · Expo SDK 54 · Prisma 7.7 · PostgreSQL 16 · Redis 7 · Socket.IO · Asaas · ExcelJS

*Documento confidencial. Nao distribuir sem autorizacao.*
