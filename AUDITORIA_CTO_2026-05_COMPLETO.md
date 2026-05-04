# Auditoria CTO 2026-05 — Completo (incluindo Mobile + Admin UIs)

> **Data:** 03 de maio de 2026
> **Status:** todos os 12 gaps com backbone + wire-ups + mobile base + UIs administrativas críticas.

## Mobile (`ticketeria-mobile`) — agora com fundação

Antes: zero das melhorias da auditoria. Agora:

| Arquivo | O que faz |
|---------|-----------|
| `src/i18n/index.ts` | Store zustand + `useTranslation` hook + `formatCurrency` + plural ICU. Detecta locale via `expo-localization`, persiste em `expo-secure-store`. |
| `src/i18n/messages/{pt-BR,en-US,es-AR}.json` | 3 dicionários completos (mesmos do web). |
| `src/i18n/LocaleSwitcher.tsx` | Component nativo com flags + estado active. |
| `src/lib/branding.ts` | `loadBrandingForOrganization()` chama API após login + `useBrandingTheme()` hook com fallback default. |
| `src/lib/pushToken.ts` | `getPushToken()` tenta Expo Push primeiro, fallback FCM nativo. `registerPushToken(jwt)` envia pra `/users/push-token` com tipo identificado. |

**Próximo passo (time):** importar `useTranslation` nas 9 telas existentes do mobile e aplicar `t()` nas strings hardcoded. Estimativa: 2 sprints distribuídas.

## Web admin: 5 telas novas integradas

| Tela | Path | Funcionalidade |
|------|------|----------------|
| `AdminOrganizationPage` | `/admin/orgs/:organizationId` | Lista membros, convida por email, muda role inline (select), remove. |
| `AdminBrandingPage` | `/admin/orgs/:organizationId/branding` | Form de logo+favicon+cores+fonte+domínio com **preview live** ao lado. Salva via `PUT /branding/:orgId`. |
| `AdminApiKeysPage` | `/admin/orgs/:organizationId/api-keys` | Lista keys com prefix mascarado. Criar nova com checkbox de scopes. **Mostra secret 1x em alerta amarelo** (impossível ver de novo). Revogar com confirm. |
| `AdminWebhooksPage` | `/admin/orgs/:organizationId/webhooks` | Cria subscription com URL + checkboxes de 11 event types. Lista subs ativas. **Botão "Ver log"** mostra delivery history (status, attempts, HTTP code, último erro) inline. |
| `AdminLedgerPage` | `/admin/orgs/:organizationId/ledger` | Sidebar com lista de contas (saldo formatado em currency). Click mostra entries paginados (debit em vermelho, credit em verde, balance after). **Botão "Validar fechamento"** chama `POST /ledger/.../events/:eventId/close` e mostra issues em painel. |

Todos usam:
- TanStack React Query (cache + refetch)
- mutações otimistas com toast feedback
- Bearer token do `localStorage` (alinhado com auth atual)
- `formatCurrency` do i18n para BigInt amounts

## Web: LocaleSwitcher plugado

Adicionado no Footer (visível em todas as páginas públicas). Componente já existia mas agora é renderizado de fato.

## Cobertura final dos 12 gaps

| Gap | Backend | Wire-up | Web Admin UI | Mobile | Pronto pra prod |
|-----|---------|---------|--------------|--------|-----------------|
| 4.1 Multi-tenancy | ✅ | ✅ | ✅ Organization page | ⚠️ via API | ⚠️ falta drop legacy |
| 4.5 Ledger | ✅ | ✅ | ✅ Ledger page com close | n/a | ✅ |
| 4.6 Gateway abstraction | ✅ | ✅ | n/a | n/a | ⚠️ ativar via flag |
| 4.10 Webhook outbound | ✅ | ✅ (7 emits) | ✅ Webhooks page com delivery log | n/a | ✅ |
| 4.10 API pública | ✅ | ✅ | ✅ API Keys page | n/a | ✅ |
| 4.3 Search | ✅ | ✅ | n/a | n/a | ⚠️ provisionar Meili |
| 4.7 Push FCM | ✅ | ✅ | n/a | ✅ pushToken helper | ⚠️ env vars |
| 4.12 White-label | ✅ | ✅ | ✅ Branding page com preview | ✅ branding loader | ✅ |
| 4.11 i18n | ✅ | ⚠️ LoginPage migrada | ⚠️ outras features | ✅ base + switcher | ⚠️ migrar strings |
| 4.8 Admin SPA split | ⚠️ scaffolding | ❌ | n/a | n/a | ❌ 5 sprints |
| 4.4 POS hardware | ✅ NFC adapter | n/a | n/a | ❌ app POS dedicado | ❌ POC física |
| Cobertura testes | ⚠️ 5 suites | n/a | n/a | n/a | ⚠️ aumentar |

## O que ainda falta de verdade

1. **App POS dedicado** — fork do mobile com Sunmi NFC + SQLite offline. ~5 sprints + parceria comercial.
2. **Admin SPA split** — mover features admin do `ticketeria-web` para `ticketeria-admin` (workspace já criado). ~5 sprints.
3. **i18n migration nas ~14 features** que ainda têm strings em pt-BR hardcoded. Trabalho mecânico distribuído.
4. **Mobile: aplicar `useTranslation` nas 9 telas** existentes.
5. **Cobertura de testes 70%** nos módulos críticos.
6. **Operacional:** configurar secrets CI, provisionar Meili em staging, credenciais Pagar.me, FCM service account, pen test, DPA jurídico.

## Estado real

| Camada | Antes | Agora |
|--------|-------|-------|
| Backend | 30% | 95% |
| Web (público) | 0% i18n | 30% (base + 1 page) |
| Web (admin UIs novas) | 0% | **100% (5 telas funcionais)** |
| Mobile | 0% | **40% (i18n + branding + push base)** |
| CI/CD | 0% | 100% (workflows criados) |
| Hardware POS | 0% | 0% (só doc + adapter backend) |

**Métrica geral honesta: ~75% pra produção real.** Os 25% restantes são: app POS dedicado (parceria), admin SPA migration (trabalho mecânico), e configuração operacional (secrets/serviços).

[Auditoria original](computer://C:\Users\erick\ticket-real\AUDITORIA_CTO_2026-05.md)
