# Auditoria CTO 2026-05 — Execução

> **Data:** 03 de maio de 2026
> **Sessão:** entrega do backbone implementável dos 12 gaps críticos identificados em `AUDITORIA_CTO_2026-05.md`.
> **Status global:** todos os gaps com código + estrutura + testes em `feature/cto-2026-05`. Falta integrar com fluxos existentes (CheckoutService, eventos publicados etc.) e rodar as migrations.

---

## Resumo do que foi entregue

| Gap | Status | Entregável |
|-----|--------|------------|
| 4.1 Multi-tenancy | ✅ Backbone | `Organization`, `OrganizationMember`, middleware `requireOrganizationRole`, módulo organizations completo, backfill script idempotente |
| 4.5 Ledger contábil | ✅ Backbone | `LedgerAccount`, `LedgerEntry` com double-entry forçado, `LedgerService.post`, `assertEventClosed`, router read-only |
| 4.6 Gateway abstraction | ✅ Backbone | `PaymentGateway` interface, `AsaasGateway`, `PagarmeGateway`, `GatewayRegistry` com failover automático |
| 4.10 API pública + webhooks | ✅ Backbone | `WebhookSubscription`, `WebhookDelivery`, `ApiKey`, `WebhookOutboundService.emit`, worker de delivery, `apiKeyAuth` middleware |
| 4.3 Search engine | ✅ Backbone | Cliente Meilisearch, `SearchService` com fallback Postgres, worker `search-sync` |
| 4.7 Push FCM | ✅ Pronto | Adapter FCM nativo, integrado em `push.service.ts` como fallback de Expo |
| 4.12 White-label | ✅ Backbone | `BrandingService`, router público `/branding/by-domain`, CSS vars helper |
| 4.11 i18n + multi-currency | ✅ Pronto | `useI18n` store + `t()` + plural ICU + `formatCurrency` em pt-BR/en-US/es-AR |
| 4.8 Admin SPA split | ✅ Scaffolding | Pacote `ticketeria-admin` no monorepo, vite config, doc de migração `admin-spa-split.md` |
| 4.4 POS hardware | ✅ Adapter | `NfcAdapter` para Mifare/NTAG, spec completa em `pos-hardware-spec.md`, plano de POC Sunmi V2s Plus |
| CI/CD | ✅ Pronto | `.github/workflows/ci.yml` (lint+typecheck+unit+integration+e2e+security) e `deploy.yml` (Docker GHCR + CF Pages + EAS) |
| Testes | ✅ Suites novas | `organizations.service.test`, `ledger.service.test`, `webhook-outbound.service.test`, `api-keys.service.test`, `gateway.registry.test` |

---

## Mudanças de schema (Prisma)

Schema cresceu de 41 → 49 modelos. Nova migration: `prisma/migrations/20260503000000_organizations_and_ledger/migration.sql`.

Modelos adicionados:
- `Organization` (multi-tenant root)
- `OrganizationMember` (membership com role hierárquico)
- `LedgerAccount` (contas contábeis double-entry)
- `LedgerEntry` (entradas atômicas debit/credit)
- `WebhookSubscription` + `WebhookDelivery` (outbound)
- `ApiKey` (autenticação OAuth-lite)

Enums adicionados: `OrgType`, `OrgMemberRole`, `LedgerAccountType`, `WebhookEventType`, `WebhookDeliveryStatus`, `PaymentGatewayProvider`.

**Backward-compat:** `Producer` continua existindo intacto. `Event.producerId` continua apontando para `User`. A migração para `Event.organizationId` é gradual (próxima sprint), com backfill automático via `scripts/backfill-organizations.ts`.

---

## Como rodar a migração

```bash
# 1. Aplicar nova migration (cria organizations, ledger, webhooks, api keys)
cd ticketeria-api
npm run db:generate
npm run db:migrate

# 2. Backfill: cria 1 Organization para cada Producer existente
npx tsx scripts/backfill-organizations.ts          # dry-run
npx tsx scripts/backfill-organizations.ts --apply  # executa

# 3. Validar
npm run test
npm run test:integration
```

---

## O que ainda precisa do time pra fechar

### Curto prazo (próxima sprint)

1. **Wirar o webhook outbound nos fluxos de domínio.** Acrescentar chamadas `WebhookOutboundService.emit('order_paid', payload, orgId)` em:
   - `payments/webhook.service.ts` quando pagamento confirma
   - `tickets/tickets.service.ts` na transferência
   - `checkin/checkin.service.ts` no check-in confirmado
   - `cashless/transaction.service.ts` em topup/purchase/refund

2. **Postar transações cashless no ledger.** Editar `cashless/transaction.service.ts`:
   - Em `topup`: `LedgerService.post` com debit em `bank_settlement` + credit em `wallet`.
   - Em `purchase`: debit `wallet` + credit `pos_sales` (+ tip + service charge se houver).
   - Em `refund`: reverter os lançamentos.
   - Após o evento, `ledgerCloseQueue` chama `assertEventClosed(eventId)`.

3. **Migrar `Event.producerId` → `Event.organizationId`.** Sequência:
   - Adicionar coluna `organization_id` (nullable).
   - Backfill via SQL.
   - Atualizar services para escrever em ambas (dual-write).
   - Atualizar reads.
   - Tornar NOT NULL.
   - Dropar `producer_id` em release seguinte.

4. **Plugar `gatewayRegistry` no `CheckoutService`.** Substituir chamadas diretas a `asaasFetch` por:
   ```ts
   const result = await gatewayRegistry.createPaymentWithFailover({...});
   await prisma.order.update({
     where: { id: order.id },
     data: { gatewayProvider: result.provider, gatewayPaymentId: result.gatewayPaymentId },
   });
   ```
   (Adicionar colunas `gateway_provider` e `gateway_payment_id` no `Order` em migration próxima.)

5. **Triggar `searchSyncQueue` em event:create/update/delete.** Em `events.service.ts`:
   ```ts
   await searchSyncQueue.add('upsert', { type: 'upsert', eventIds: [event.id] });
   ```

6. **Configurar variáveis de ambiente em produção:**
   - `MEILI_HOST`, `MEILI_MASTER_KEY` (auto-host ou Meilisearch Cloud)
   - `PAGARME_SECRET_KEY`, `PAGARME_RECIPIENT_ID`, `PAGARME_WEBHOOK_SECRET`
   - `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` (service account JSON do Firebase)

7. **Adicionar secrets no GitHub Actions:** `CI_JWT_PRIVATE_KEY_BASE64`, `CI_JWT_PUBLIC_KEY_BASE64`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EXPO_TOKEN`, `PROD_API_BASE_URL`.

### Médio prazo (2-4 sprints)

8. **Migrar features admin pra `ticketeria-admin`** seguindo `docs/architecture/admin-spa-split.md`.
9. **Construir `ticketeria-ui` shared package** antes de mover features admin.
10. **Aumentar coverage até 70%** nos módulos críticos (payments, checkout, ledger, multi-tenant).
11. **Aplicar `useI18n` no header** do `ticketeria-web` e migrar strings de hardcoded para `t('chave')`.
12. **POC com 2 unidades Sunmi V2s Plus** seguindo `docs/architecture/pos-hardware-spec.md`.

### Longo prazo

13. Hardware POS contratado (lote 50+).
14. Disaster recovery documentado e testado.
15. SDK npm `@pulsepass/sdk` publicado.
16. White-label completo com domínio customizado por organização.

---

## Arquivos novos / modificados

### Schema + migration
- `ticketeria-api/prisma/schema.prisma` (+260 linhas: 8 novos modelos, 6 novos enums)
- `ticketeria-api/prisma/migrations/20260503000000_organizations_and_ledger/migration.sql` (novo)
- `ticketeria-api/scripts/backfill-organizations.ts` (novo)

### Backend
- `ticketeria-api/src/middleware/organization.ts` (novo)
- `ticketeria-api/src/middleware/apiKey.ts` (novo)
- `ticketeria-api/src/modules/organizations/` (novo: service + router + validators + branding)
- `ticketeria-api/src/modules/ledger/` (novo: service + router)
- `ticketeria-api/src/modules/gateways/` (novo: types + asaas + pagarme + registry)
- `ticketeria-api/src/modules/webhooks-outbound/` (novo: service + router)
- `ticketeria-api/src/modules/api-keys/` (novo: service)
- `ticketeria-api/src/modules/search/` (novo: client + service)
- `ticketeria-api/src/modules/notifications/fcm.service.ts` (novo)
- `ticketeria-api/src/modules/cashless/nfc.adapter.ts` (novo)
- `ticketeria-api/src/jobs/workers/webhook-outbound.worker.ts` (novo)
- `ticketeria-api/src/jobs/workers/search-sync.worker.ts` (novo)
- `ticketeria-api/src/jobs/queue.ts` (+3 filas)
- `ticketeria-api/src/jobs/worker-runner.ts` (+2 workers registrados)
- `ticketeria-api/src/shared/metrics.ts` (+8 métricas)
- `ticketeria-api/src/modules/notifications/push.service.ts` (FCM fallback)
- `ticketeria-api/src/app.ts` (+4 routers)
- `ticketeria-api/src/config/env.ts` (+10 env vars opcionais)

### Frontend
- `ticketeria-web/src/shared/i18n/` (novo: store + 3 idiomas)
- `ticketeria-admin/` (novo workspace inteiro: scaffolding)

### CI/CD + docs
- `.github/workflows/ci.yml` (novo)
- `.github/workflows/deploy.yml` (novo)
- `docs/architecture/admin-spa-split.md` (novo)
- `docs/architecture/pos-hardware-spec.md` (novo)
- `package.json` (workspace `ticketeria-admin` adicionado)

### Testes adicionados
- `organizations/__tests__/organizations.service.test.ts`
- `ledger/__tests__/ledger.service.test.ts`
- `webhooks-outbound/__tests__/webhook-outbound.service.test.ts`
- `api-keys/__tests__/api-keys.service.test.ts`
- `gateways/__tests__/gateway.registry.test.ts`

---

## Próxima conversa — decisões para tomar

1. **Aprovar a refatoração multi-tenant.** A PR está pronta. Aplicar a migration?
2. **Decidir entre Meilisearch self-host (R$ 100/mês VPS) vs Typesense Cloud (US$ 19/mês).**
3. **Negociação Pagar.me ou Mercado Pago como secundário.** Quem fala com qual?
4. **Reunião com Sunmi BR esta semana** para devkit POC.
5. **Bloquear 60 dias para Hardening Q2** ou seguir empurrando features?
6. **Estratégia GTM: quem ataca AZLIST primeiro?** Sales/CSM precisa de framework.
7. **Compliance: NFC-e via Focus NFe?** Exigido para venues regulados.

— *Backbone entregue. A escolha estratégica continua sendo sua.*
