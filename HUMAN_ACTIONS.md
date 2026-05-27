# HUMAN_ACTIONS — Checklist de ações que dependem de pessoas/parceiros

> Atualizado 2026-05-27. Tudo o que **NÃO é código** e precisa de você ou de terceiros para o PulsePass ir a produção em excelência. O código está pronto (typecheck verde em web/mobile, suíte backend 344+ passed, Engine 5 Sprints 1-6 integrados, SLOs documentados, load test smoke pronto).

---

## P0 — Bloqueia go-live em produção

### 1. Aplicar migrations em Postgres real
Rodar dentro de `ticketeria-api` com `DATABASE_URL` apontando pro Supabase produção:

```bash
cd ticketeria-api
npm run db:generate
npm run db:migrate
npx tsx scripts/backfill-organizations.ts --apply
npx tsx scripts/backfill-cashless-admin.ts
```

Migrations pendentes (ordem):
- Fase 1 antifraude: `add_antifraude_and_offline_limits` (deviceFp + offlineLimit + version)
- POS kiosk: tabela `pos_devices` (ver `prisma/migrations/`)
- Engine 5 Sprint 1: `20260604000000_add_customer_orders`
- Engine 5 Sprint 3: `20260605000000_add_venue_maps`
- Engine 5 Sprint 5+6: `20260606000000_add_social_and_achievements`

**Atenção:** verificar drop `Event.producerId` legado após 30 dias de dual-state validados (já comentado no schema como NOT NULL desde `event_drop_legacy_producer`).

### 2. Política de privacidade + DPA jurídico (LGPD)
- Contratar advogado especializado em LGPD (R$ 2-8k, 1-3 semanas)
- Revisar `LGPD_POLICY.md` (se existir; senão, criar do zero a partir dos endpoints `/lgpd/me/export` e `DELETE /lgpd/me/anonymize`)
- Publicar política em `/legal/privacidade` no site público antes do primeiro user pagante
- Assinar DPA (Data Processing Agreement) com cada parceiro que processa dados pessoais (Supabase, Resend, Asaas, Pagar.me, R2/Cloudflare, Meilisearch, Sentry, FCM)

### 3. Pen test externo
- Contratar empresa de pen test (Tempest, Aker, Tenable, ConvisoAppSec etc.) — R$ 15-40k uma semana
- Escopo: API, web admin, mobile (token storage, biometria, deeplinks), webhook outbound HMAC
- Repassar laudo + corrigir findings P0/P1 antes de IPO de marca / qualquer evento com >5k participantes

### 4. Secrets do GitHub Actions
Configurar em Settings → Secrets and variables → Actions (repo settings) ou via `gh secret set`:

```
CI_JWT_PRIVATE_KEY_BASE64          (gerar com scripts/generate-keys.ts)
CI_JWT_PUBLIC_KEY_BASE64
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
PROD_API_BASE_URL                  https://api.pulsepass.com.br/api/v1
EXPO_TOKEN                         (expo whoami --token)
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
RESEND_API_KEY
SENTRY_DSN
SENTRY_AUTH_TOKEN                  (para source maps no release)
```

GHCR_TOKEN é auto via GITHUB_TOKEN — não precisa setar manualmente.

### 5. Variáveis de ambiente .env de produção
Ver `PRODUCTION.md` §1.3 — lista completa. Foco nos críticos:
- `DATABASE_URL` (com `?pgbouncer=true` no Supabase)
- `JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64` / `JWT_REFRESH_SECRET` / `PLATFORM_SECRET` (todos ≥32 chars)
- `ASAAS_API_KEY` + `ASAAS_WEBHOOK_SECRET` + `ASAAS_WALLET_ID`
- `R2_*` (5 vars)
- `RESEND_API_KEY`
- `SENTRY_DSN`

---

## P1 — Bloqueia features específicas

### 6. Firebase Service Account para FCM
- Console Firebase → Project Settings → Service Accounts → Generate new private key
- Salvar JSON em `ticketeria-api/secrets/firebase-sa.json` (gitignored)
- Setar env `FCM_SERVICE_ACCOUNT_JSON_BASE64=$(base64 -i firebase-sa.json)`
- Sem isso: push notifications dos triggers Engine 5 Sprint 2 caem só para tokens Expo (não para tokens FCM nativos do EAS build de produção)

### 7. Apple Developer Program + Google Play Console
- **Apple**: $99/ano + Apple ID, Team ID. Configurar em `eas.json`:
  ```json
  "submit": { "production": { "ios": { "appleId": "...", "ascAppId": "...", "appleTeamId": "..." } } }
  ```
- **Google Play**: $25 one-time + service account JSON. Configurar em `eas.json`:
  ```json
  "submit": { "production": { "android": { "serviceAccountKeyPath": "./google-play-sa.json" } } }
  ```
- Sem isso: não dá pra publicar nas lojas. Build interno via EAS continua funcionando.

### 8. Credenciais Pagar.me (gateway secundário)
- Setar `PAGARME_API_KEY` + `PAGARME_WEBHOOK_SECRET` + `PAGARME_RECIPIENT_ID` no .env
- Sem isso: failover do GatewayRegistry só consegue cair entre instâncias do Asaas (mesma falha de provider derruba ambos)

### 9. Meilisearch provisionado
- Self-host VPS (Hetzner / DigitalOcean) ou Meilisearch Cloud (~$30-100/mês)
- Setar `MEILISEARCH_HOST` + `MEILISEARCH_API_KEY`
- Rebuild noturno (cron 4h `search-rebuild-cron`) só funciona com instância disponível
- Sem isso: busca cai pro fallback Postgres (mais lento, sem typo-tolerance)

### 10. POC Sunmi BR — POS hardware
- Reunião comercial Sunmi BR para lote 50 Sunmi V2s (~R$ 110k CAPEX)
- Impressora Bluetooth Bematech (~R$ 4k)
- Mobile já preparado: `CashlessPOSScreen` + `posOfflineQueue` SQLite + NFC reader

### 11. R2 credenciais — upload de imagens
- Cloudflare Dashboard → R2 → bucket `pulsepass-prod` (ou similar)
- Gerar API token escopado pro bucket
- Setar `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET_NAME/PUBLIC_URL` no .env
- Sem isso: upload de imagem de produto cashless + SVG do venue map quebram com 500

### 12. Sentry mobile (opcional, recomendado)
- `npx expo install @sentry/react-native`
- Adicionar plugin no `app.config.ts`
- Setar `EXPO_PUBLIC_SENTRY_DSN` no `.env` mobile
- Source maps automáticos no EAS build via plugin
- O stub em `src/lib/sentry.ts` já está pronto pra ativar quando o package estiver instalado (no-op em DEV)

---

## P2 — Operação física e expansão

### 13. Smoke test em staging com produtor real
- Rodar fluxo end-to-end com produtor parceiro num evento de teste:
  1. Criar evento + lotes + cupons
  2. Vendas via checkout web
  3. Check-in via mobile (operador)
  4. Cashless: recarga + charge + refund
  5. Pedido pelo bar (cliente abre `/bar/[posId]?eventId=` deep-link)
  6. Fila admin acompanhando + push de ready
  7. Fechamento ledger pós-evento

### 14. Domínio + DNS
- Comprar `pulsepass.com.br` (Registro.br)
- Apontar DNS pra Cloudflare:
  - `app.` → web (Cloudflare Pages)
  - `api.` → backend (Docker GHCR + Cloudflare Workers/Tunnel ou load balancer)
  - `cdn.` ou `storage.` → R2 bucket público
- Certificado TLS automático via Cloudflare

### 15. Email marketing (opcional)
- Resend já é transactional. Para upsell remarketing programático (Sprint 2 worker) usar mesma conta.
- Se quiser email mass marketing (broadcast newsletter), considerar segundo provedor (SendGrid / Mailchimp).

---

## Verificação rápida — Checklist mínimo pra abrir produção

- [ ] Migrations aplicadas em Postgres real (item 1)
- [ ] `npm test -w ticketeria-api` passa com baseline conhecido (~344 passed / 13 baseline fails)
- [ ] `npx tsc --noEmit` verde nos 3 workspaces
- [ ] Secrets CI configurados (item 4)
- [ ] `.env` produção com todas as vars obrigatórias (item 5)
- [ ] Política privacidade publicada (item 2)
- [ ] Sentry capturando erros (DSN nos 3 workspaces)
- [ ] DPAs assinados (item 2)
- [ ] Smoke test em staging com produtor real (item 13)
- [ ] Pen test laudo + findings P0/P1 corrigidos (item 3)
- [ ] `k6 run scripts/load-test.k6.js` com p95 < 500ms / error < 1% em staging

Tudo o resto (Sunmi, Pagar.me, Meilisearch, social/gamificação) pode entrar incremental depois do go-live inicial.

---

## Referências cruzadas
- `PRODUCTION.md` — runbook completo
- `PulsePass_PRD_v4.0.md` — PRD vigente
- `RESOLVIDO.md` — histórico de tudo que já foi entregue
- `AUDITORIA_PRD_v4_vs_REALIDADE_2026-05.md` — comparação
- `PLANO_EXECUCAO_3_BURACOS.md` — Fase 1/2/3 (referência arquivada — Engine 5 entregue 2026-05-27)
