# PulsePass — Runbook de Produção

> Sequência completa de deploy + smoke tests + rollback após Auditoria CTO 2026-05.

## 1. Pré-requisitos

### 1.1 Serviços externos provisionados
- PostgreSQL 16 via Supabase (com PgBouncer pooler em `:6543`)
- Redis 7 (ElastiCache, Upstash, ou self-host)
- Cloudflare R2 bucket
- Resend account com domain verificado
- Asaas account com webhook secret
- Sentry projetos (api, web, mobile)
- (opcional) Meilisearch self-host VPS ou Typesense Cloud
- (opcional) Pagar.me account + recipient ID
- (opcional) Firebase Service Account JSON (para FCM nativo)

### 1.2 Secrets do GitHub Actions
```
CI_JWT_PRIVATE_KEY_BASE64
CI_JWT_PUBLIC_KEY_BASE64
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
EXPO_TOKEN
PROD_API_BASE_URL
GHCR_TOKEN (auto via GITHUB_TOKEN)
```

### 1.3 Env vars obrigatórias (.env de produção)
```env
NODE_ENV=production
DATABASE_URL=postgresql://...@db.<proj>.supabase.co:6543/postgres?pgbouncer=true
REDIS_HOST=...
JWT_PRIVATE_KEY_BASE64=...    # gerar com scripts/generate-keys.ts
JWT_PUBLIC_KEY_BASE64=...
JWT_REFRESH_SECRET=...         # min 32 chars
PLATFORM_SECRET=...            # min 32 chars
ASAAS_API_URL=https://api.asaas.com/v3
ASAAS_API_KEY=...
ASAAS_WEBHOOK_SECRET=...
ASAAS_WALLET_ID=...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_URL=https://storage.pulsepass.com.br
RESEND_API_KEY=re_...
SENTRY_DSN=...
SECURITY_ALERT_EMAIL=security@pulsepass.com.br
OPS_ALERT_EMAIL=ops@pulsepass.com.br
EXTERNAL_WEBHOOK_SECRET=...    # min 32 chars
```

### 1.4 Env vars opcionais (Auditoria CTO 2026-05)
```env
# Pagar.me — gateway secundário (gap 4.6)
PAGARME_API_URL=https://api.pagar.me/core/v5
PAGARME_SECRET_KEY=ak_live_...
PAGARME_RECIPIENT_ID=re_...
PAGARME_WEBHOOK_SECRET=...

# Meilisearch (gap 4.3)
MEILI_HOST=https://meili.pulsepass.internal:7700
MEILI_MASTER_KEY=...

# FCM nativo (gap 4.7) — service account do Firebase
FCM_PROJECT_ID=pulsepass-prod
FCM_CLIENT_EMAIL=firebase-adminsdk@pulsepass-prod.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## 2. Deploy inicial (primeira vez)

### 2.1 API + Workers
```bash
cd ticketeria-api

# 1. Limpar quaisquer null bytes (precaução — sandbox legacy)
find src -name "*.ts" -exec sed -i 's/\x00//g' {} \;

# 2. Gerar Prisma client com schema atualizado
npm ci
npm run db:generate

# 3. Aplicar migrations
npm run db:migrate:prod
# Vai aplicar:
#   20260416051811_init
#   20260416162653_add_expo_push_token
#   20260503000000_organizations_and_ledger          ← novo
#   20260503010000_event_org_and_order_gateway      ← novo

# 4. Backfill organizations (Auditoria CTO 2026-05)
npx tsx scripts/backfill-organizations.ts          # dry-run primeiro
npx tsx scripts/backfill-organizations.ts --apply

# 5. Build
npm run build

# 6. Deploy via Docker GHCR
docker pull ghcr.io/<repo>/api:latest
docker run -d --name pulsepass-api --restart unless-stopped \
  --env-file .env -p 3333:3333 \
  ghcr.io/<repo>/api:latest

# 7. Worker em container separado
docker run -d --name pulsepass-worker --restart unless-stopped \
  --env-file .env \
  ghcr.io/<repo>/api:latest npm run start:worker
```

### 2.2 Web (Cloudflare Pages)
```bash
cd ticketeria-web
npm ci
VITE_API_BASE_URL=https://api.pulsepass.com.br/api npm run build
npx wrangler pages deploy dist --project-name=pulsepass-web
```

### 2.3 Mobile (EAS)
```bash
cd ticketeria-mobile
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

## 3. Smoke tests pós-deploy

### 3.1 Health checks
```bash
curl https://api.pulsepass.com.br/health/ready
# {"success": true, "data": {"status": "ok"}}

curl https://api.pulsepass.com.br/health/full
# Verifica DB + Redis + queues + circuit breakers
```

### 3.2 Métricas Prometheus
```bash
curl https://api.pulsepass.com.br/metrics | head
# # HELP pulsepass_http_requests_total ...
# # HELP pulsepass_ledger_entries_total ...
```

### 3.3 Fluxo end-to-end (manual)
1. **Cadastro/login** → POST /auth/register, depois /auth/login → recebe JWT
2. **Criar organization** → POST /organizations → guarda orgId
3. **Convidar membro** → POST /organizations/:orgId/members
4. **Criar API key** → POST /organizations/:orgId/api-keys → guardar secret 1x
5. **Webhook subscription** → POST /webhooks/outbound/:orgId/subscriptions com URL teste
6. **Criar evento** → POST /events → publish
   - **Verificar:** delivery do webhook `event_published` chegou na URL
7. **Comprar ingresso** → POST /payments/checkout
   - PIX QR aparece, pagar via Asaas sandbox
   - **Verificar:** webhook `order_paid` + `ticket_issued` entregues
8. **Check-in** → app mobile escanear QR → POST /checkin/validate
   - **Verificar:** webhook `ticket_checked_in` entregue
9. **Cashless topup + purchase** → operador POS scaneia wallet
   - **Verificar:** ledger entries postadas (debit bank → credit wallet) e webhooks `cashless_topup` + `cashless_purchase`
10. **Fechar evento** → POST /ledger/:orgId/events/:eventId/close
    - Esperado: `issues: []`. Se houver divergência, alerta OPS.

### 3.4 Validar branding white-label
```bash
curl "https://api.pulsepass.com.br/api/v1/branding/by-domain?host=festas.cliente.com.br"
# {"matched": true, "branding": {...}}
```

## 4. Rollback de migration (caso necessário)

### 4.1 Auditoria CTO 2026-05 migrations são backward-compatible
- `events.organization_id` é nullable — código antigo continua funcionando
- `orders.gateway_provider` é nullable — código antigo continua funcionando
- Tabelas novas (organizations, ledger, webhooks, api_keys) — adicionar não quebra nada

### 4.2 Rollback de aplicação
- API e workers: rollback ao tag anterior do GHCR
- Schema: as migrations não removem nada, então não há rollback necessário no DB

### 4.3 Rollback do backfill
- O backfill não destrói dados originais (`Producer` continua existindo)
- Para reverter: `DELETE FROM organization_members; DELETE FROM organizations;`
  - Eventos voltam a ler de `producerId` (já que `organizationId` era opcional)

## 5. Monitoramento contínuo

### 5.1 Alertas a configurar (Sentry / Grafana)
- `pulsepass_payment_failover_total` > 0 → gateway primário pode estar instável
- `pulsepass_ledger_invariant_violations_total` > 0 → divergência financeira (P1)
- `pulsepass_webhook_outbound_failed_total` > N → endpoint do cliente está down
- Health `/health/full` retornando `degraded` por > 5min
- `pulsepass_circuit_breaker_state` = 2 (open) por > 30s
- Queue depth (BullMQ) > 1000 pendentes em qualquer fila

### 5.2 SLOs estabelecidos
- API uptime: 99.9%
- Checkout latência p95: < 3s
- Check-in validate p95: < 200ms
- Webhook delivery success rate: > 95%
- Ledger close invariants: 100% (zero divergência tolerada)

## 6. Tarefas operacionais recorrentes

### 6.1 Diário
- Verificar dashboard Grafana de webhooks failed
- Conferir alertas Sentry (errors críticos)

### 6.2 Semanal
- Conferir queue depths
- Verificar health do gateway secundário (Pagar.me) com health-check
- Conferir que Meilisearch rebuild noturno rodou (fila `search-sync` cron 4h)

### 6.3 Pós-cada-evento
- Rodar `POST /ledger/:orgId/events/:eventId/close` ou via UI admin
- Conferir relatório Excel (9 abas) gerado automaticamente às 6h
- Audit log review se houve incident

### 6.4 Mensal
- Rodar `npm audit` e atualizar deps
- Rotacionar JWT keys (com fase de overlap)
- Backup snapshot do Postgres (Supabase faz auto, mas exportar mensal pra cold storage)

## 7. Referências por gap da Auditoria CTO 2026-05

| Tópico | Path |
|--------|------|
| Multi-tenancy schema | `prisma/schema.prisma` (Organization, OrganizationMember) |
| Multi-tenancy middleware | `src/middleware/organization.ts` |
| Multi-tenancy admin UI | `/admin/orgs/:orgId` |
| Ledger schema | `prisma/schema.prisma` (LedgerAccount, LedgerEntry) |
| Ledger service | `src/modules/ledger/ledger.service.ts` |
| Ledger admin UI | `/admin/orgs/:orgId/ledger` |
| Gateway abstraction | `src/modules/gateways/gateway.types.ts` + registry |
| Webhook outbound | `src/modules/webhooks-outbound/` |
| Webhook admin UI | `/admin/orgs/:orgId/webhooks` |
| API keys | `src/modules/api-keys/api-keys.service.ts` |
| API keys admin UI | `/admin/orgs/:orgId/api-keys` |
| Branding white-label | `src/modules/organizations/branding.service.ts` |
| Branding admin UI | `/admin/orgs/:orgId/branding` |
| Frontend boot | `ticketeria-web/src/shared/lib/branding.ts` |
| Search engine | `src/modules/search/search.client.ts` (Meilisearch) |
| FCM push | `src/modules/notifications/fcm.service.ts` |
| i18n web | `ticketeria-web/src/shared/i18n/` |
| i18n mobile | `ticketeria-mobile/src/i18n/` |
| Mobile POS | `ticketeria-mobile/src/screens/CashlessPOSScreen.tsx` |
| Mobile NFC | `ticketeria-mobile/src/lib/nfcReader.ts` |
| Mobile offline queue | `ticketeria-mobile/src/lib/posOfflineQueue.ts` |

## 8. Suporte

- Erros críticos: Sentry → PagerDuty oncall
- LGPD requests: usar endpoints `/users/me/data` (export) e `DELETE /users/me` (anonimização)
- Customer success: dashboard admin tem todas as ferramentas (organization, branding, webhooks, ledger, API keys)

— Auditoria CTO 2026-05 completa. Bora pra produção.
