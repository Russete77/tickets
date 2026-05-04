# Auditoria CTO 2026-05 — O que NÃO foi feito (honesto)

> **Data:** 03 de maio de 2026
> **Sessão:** revisão à luz do `INSTRUCOES_DESENVOLVIMENTO.md` (816 linhas) que eu não tinha lido inteiro.

## Resposta direta às duas perguntas

### "Você analisou o INSTRUCOES_DESENVOLVIMENTO?"
**Não inteiro.** Li ~100 linhas do changelog inicial e parei. Voltei agora e li as 816 linhas. Coisas relevantes que perdi:

- **Convenção de nomenclatura:** o doc declara `{nome}.routes.ts` + `.schema.ts` (linha 405-411), mas o projeto na prática mistura `.router.ts` + `.validators.ts` (vide auth, cashless, payments existentes). Eu segui o padrão **prático** do projeto, não o documental — isso está OK.
- **Linguagem de código em inglês para nomes** (linha 457). Mantive em inglês. OK.
- **CSS Modules** scoped (linha 433). O scaffolding `ticketeria-admin/src/main.tsx` que criei usa inline styles — precisa virar `.module.css` antes de virar produção. **Pendência cosmética.**
- **Roadmap interno:** White-label e API pública estão classificados como Fase v1.2/v2.0 com prioridade BAIXA (linhas 163-166, 392-394). A auditoria classificou como gap real e o usuário pediu pra atacar. **Decisão de produto** que vale escalar com o time.
- **Pricing SaaS já definido:** Starter R$149 / Growth R$490 / Pro R$990 / Enterprise R$1990 (linhas 794-799). White-label se conecta ao Enterprise. **Não conflita** — só não documentei essa amarração.
- **TODOs Críticos prioritários** (linha 366-396) já estavam todos resolvidos antes da auditoria — bom sinal.

### "Terminamos tudo da auditoria CTO 2026-05?"
**Não.** Entreguei o **backbone**. Falta a **integração com fluxos existentes** e a **migração efetiva**. Lista honesta abaixo.

---

## Conflitos descobertos na revisão

| Item | Risco | Resolução |
|------|-------|-----------|
| `api-keys/` vs `credentials/` existente | **Falso alarme.** O doc descrevia mal — `Credential` model é para **badges físicos com QR de evento** (imprensa, staff), não API keys. Nomes não conflitam. | Mantido. |
| CI duplicado em `ticketeria-api/.github/workflows/ci.yml` e `ticketeria-web/.github/workflows/deploy.yml` | **Real.** GitHub Actions só lê de `.github/workflows/` na raiz, então os antigos nunca rodavam — mas confundem o time. | Marquei `DEPRECATED.md` em ambos. Recomendo o time apagar. |
| `requireEventOwnership` (existente, 8 routers) vs `requireOrganizationRole` (novo) | **Coexistência.** Cada um cobre uma camada — event-level vs org-level. | Documentar quando usar qual; migração gradual. |
| Modelo `Permission` (RBAC genérico existente) vs `OrganizationMember.role` (novo) | **Sobreposição parcial.** Permission é granular por resource/action; OrganizationMember.role é hierárquico. | Manter ambos: role para rota; Permission para casos específicos. |
| `producer.cnpj` vs `Organization.cnpj` (ambos UNIQUE) | **Real.** Durante backfill, o mesmo CNPJ vai aparecer nos dois. | Backfill marca `legacyProducerId`; após migração drop `Producer.cnpj`. |
| Inline styles no `ticketeria-admin/src/main.tsx` | **Cosmético.** Padrão do projeto é CSS Modules. | Refatorar quando migrar features admin de fato. |

---

## O que NÃO foi feito (e travaria produção)

### 1. Wire-up: webhook outbound não emite nada hoje

**Onde está pronto:** `WebhookOutboundService.emit()` + worker + retry exponencial + HMAC SHA256 — tudo testado.

**O que falta:** chamadas reais espalhadas pelos services de domínio. Pontos certos para inserir:

```ts
// payments/webhook.service.ts (após confirmar order como paid)
await WebhookOutboundService.emit('order_paid', { orderId, totalCents, ... }, organizationId, idempotencyKey);

// tickets/tickets.service.ts (após transfer.confirm)
await WebhookOutboundService.emit('ticket_transferred', { ticketId, fromUserId, toUserId }, orgId);

// checkin/checkin.service.ts (após checkin valid)
await WebhookOutboundService.emit('ticket_checked_in', { ticketId, eventId, scannedAt }, orgId);

// emit-tickets.worker.ts (após gerar QR)
await WebhookOutboundService.emit('ticket_issued', { ticketId, eventId, holderEmail }, orgId);

// cashless/transaction.service.ts
await WebhookOutboundService.emit('cashless_topup', { walletId, amountCents }, orgId);
await WebhookOutboundService.emit('cashless_purchase', { walletId, posId, amountCents, items }, orgId);
await WebhookOutboundService.emit('cashless_refund', { walletId, amountCents, reason }, orgId);

// guest-lists/check-in (no fluxo de door police)
await WebhookOutboundService.emit('guest_checked_in', { guestEntryId, eventId, promoterId }, orgId);

// events/publishing.service.ts (após publish)
await WebhookOutboundService.emit('event_published', { eventId, slug }, orgId);
```

**Esforço:** ~1 sprint (1 dev sênior).

### 2. Wire-up: ledger não recebe nenhuma transação cashless

**Onde está pronto:** `LedgerService.post()` com double-entry forçado, `assertEventClosed` para invariantes, router read-only.

**O que falta:** `cashless/transaction.service.ts` precisa postar entries paralelas a cada `CashlessTransaction.create`:

```ts
// Em topup:
await LedgerService.post({
  organizationId, eventId, sourceType: 'cashless_transaction', sourceId: tx.id,
  entries: [
    { accountId: bankSettlementAcc, direction: 'debit',  amountCents },  // dinheiro entra
    { accountId: walletAcc,         direction: 'credit', amountCents },  // wallet aumenta
  ],
});

// Em purchase:
await LedgerService.post({
  organizationId, eventId, sourceType: 'cashless_transaction', sourceId: tx.id,
  entries: [
    { accountId: walletAcc,    direction: 'debit',  amountCents: total - tip - service },
    { accountId: posSalesAcc,  direction: 'credit', amountCents: total - tip - service },
    ...(tip > 0 ? [
      { accountId: walletAcc,  direction: 'debit',  amountCents: tip },
      { accountId: tipPoolAcc, direction: 'credit', amountCents: tip },
    ] : []),
    ...(service > 0 ? [
      { accountId: walletAcc,         direction: 'debit',  amountCents: service },
      { accountId: serviceChargeAcc,  direction: 'credit', amountCents: service },
    ] : []),
  ],
});
```

Plus: cron pós-evento que chama `assertEventClosed(eventId)` e dispara alerta se houver divergência.

**Esforço:** ~1 sprint.

### 3. Wire-up: `gatewayRegistry` não está plugado no checkout

**Onde está pronto:** `AsaasGateway`, `PagarmeGateway`, `GatewayRegistry.createPaymentWithFailover`, testes de failover.

**O que falta:** `payments/checkout.service.ts` continua chamando `asaasFetch` direto. Precisa virar:

```ts
const customers = await gatewayRegistry.ensureCustomerOnAll({ email, name, cpfCnpj, phone });
const result = await gatewayRegistry.createPaymentWithFailover({
  customerExternalId: customers[gatewayRegistry.primary],
  internalReference: order.id,
  amountCents: totalCents,
  method: paymentMethod,
  splits,
});
await prisma.order.update({
  where: { id: order.id },
  data: {
    gatewayProvider: result.provider,    // ← coluna não existe ainda, precisa migration
    gatewayPaymentId: result.gatewayPaymentId,
    pixCopyPaste: result.pixCopyPaste,
    pixQrCode: result.pixQrCode,
  },
});
```

Plus: migration adicionando `Order.gatewayProvider` e `Order.gatewayPaymentId` (separados do `asaasPaymentId` legado).

**Esforço:** ~1 sprint + migration.

### 4. Wire-up: search sync não é triggado em event:create/update

**Onde está pronto:** `searchClient`, `SearchService` com fallback, worker `search-sync`, fila `searchSyncQueue`.

**O que falta:** chamadas em `events.service.ts`:
```ts
// Após Event.create / publish / update / delete:
await searchSyncQueue.add('upsert', { type: 'upsert', eventIds: [event.id] });
// Em delete/cancel:
await searchSyncQueue.add('remove', { type: 'remove', eventIds: [event.id] });
```

Plus: rebuild diário via cron (`searchSyncQueue.add('rebuild', { type: 'rebuild' }, { repeat: { pattern: '0 4 * * *' }})` no `setupRecurringJobs`).

**Esforço:** 1 dia.

### 5. Migração `Event.producerId` → `Event.organizationId`

**O que existe:** `Organization.legacyProducerId`, backfill script idempotente.

**O que falta:** sequência completa de dual-write/read/cleanup:

```sql
-- Passo 1 — adicionar coluna nullable
ALTER TABLE events ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Passo 2 — backfill via SQL ou TS
UPDATE events e
SET organization_id = o.id
FROM producers p
JOIN organizations o ON o.legacy_producer_id = p.id
WHERE e.producer_id = p.user_id;
-- (atenção: producer_id em events é o User.id, não Producer.id! Fluxo já consolidado.)
```

Depois: dual-write nos services, dual-read, swap reads para `organizationId`, drop `producer_id`.

Atenção ao hack atual: `Event.producerId` aponta para `User`, não para `Producer`. Backfill precisa fazer `User → Producer (1:1) → Organization` via `Organization.legacyProducerId`.

**Esforço:** 2 sprints (alto risco — toca tudo).

### 6. i18n não está aplicado no frontend

**Onde está pronto:** `useI18n` zustand store, dicionários pt-BR/en-US/es-AR, `t()`, `formatCurrency`, plural ICU.

**O que falta:** migrar strings hardcoded em `ticketeria-web/src/features/**/*.tsx`. Pelo menos uns 200+ literais string em português espalhados por feature/auth, feature/event, feature/checkout, feature/admin/* etc.

Plus: seletor de idioma no header. Detecção via domínio (sympla.com.ar → es-AR).

**Esforço:** ~3 sprints distribuídas.

### 7. Admin SPA scaffolding sem migração real

**Onde está pronto:** workspace `ticketeria-admin`, package.json, vite.config, main.tsx placeholder, doc `admin-spa-split.md` com 5 sprints detalhados.

**O que falta:** TUDO do roteiro detalhado no doc. Notavelmente:
- Criar `ticketeria-ui` (UI kit compartilhado).
- Mover `ticketeria-web/src/features/admin/` (18+ páginas) pra `ticketeria-admin/src/features/`.
- Auth shared via cookie httpOnly cross-subdomain.
- Pipeline `deploy-admin.yml` em CF Pages com domínio `admin.pulsepass.com.br`.

**Esforço:** 5 sprints.

### 8. POS hardware sem POC física

**Onde está pronto:** `NfcAdapter` com Mifare/NTAG, idempotência, anti-colisão de UID, doc completa de POC `pos-hardware-spec.md` com schema SQLite offline e custos.

**O que falta:** trabalho **fora do código** —
- Reunião comercial Sunmi BR pra dev kit.
- Compra de 2 unidades V2s Plus + lote de pulseiras Mifare Ultralight.
- App POS dedicado (fork do mobile com modo POS — não criado).
- Integração SDK Sunmi (DeviceManager API, módulo nativo Android).
- Piloto em festa interna SMU.

**Esforço:** 3-6 meses calendário (depende de parceria).

### 9. Cobertura de testes ainda baixa

**Onde está pronto:** 5 suites novas (organizations, ledger, gateway registry, webhook outbound, api keys) — todas com mocks limpos.

**O que falta:** subir coverage de ~5% para os 70% que a auditoria estipulou:
- Testes para reserva atômica completa (trans + concorrência).
- Anti-replay no checkin sob carga.
- Cashless: top-up + purchase + refund com casos de borda (saldo negativo, double-spend).
- Guest list: registro público + check-in + plus-ones.
- E2E checkout completo via Playwright.
- Fix do gate de coverage no CI: passei `MIN=50` como baseline; precisa ratchet up até 70%.

**Esforço:** 4-6 sprints distribuídas.

### 10. Operacional / produto

Além de código, a auditoria deixou pontos não-código que **não** ataquei:
- Pen test externo (linha 177 do INSTRUCOES_DESENVOLVIMENTO).
- LGPD jurídico — DPA, política de privacidade (linha 178).
- Disaster recovery documentado.
- Reunião com Pagar.me/Mercado Pago como gateway secundário.
- Decisão self-host Meilisearch vs Typesense Cloud.
- SDK npm `@pulsepass/sdk` publicado.
- WCAG 2.1 AA audit (linha 175).
- OpenTelemetry tracing (linha 176).
- Conciliação fiscal NFC-e (Focus NFe / TecnoSpeed).

---

## Métrica honesta de progresso

| Gap | Backbone (código) | Wire-up (integração) | Produção |
|-----|-------------------|----------------------|----------|
| 4.1 Multi-tenancy | ✅ 100% | ❌ 0% (Event.organizationId não migrado) | ❌ |
| 4.5 Ledger | ✅ 100% | ❌ 0% (cashless não posta) | ❌ |
| 4.6 Gateway abstraction | ✅ 100% | ❌ 0% (CheckoutService não usa) | ❌ |
| 4.10 Webhook outbound + API pública | ✅ 100% | ❌ 0% (nenhum emit) | ❌ |
| 4.3 Search engine | ✅ 100% | ⚠️ 30% (worker pronto, sem trigger nos events) | ❌ |
| 4.7 Push FCM | ✅ 100% | ✅ 90% (integrado no push.service) | ⚠️ falta env vars |
| 4.12 White-label | ✅ 100% | ❌ 0% (frontend não consome /branding) | ❌ |
| 4.11 i18n | ✅ 100% | ❌ 5% (strings ainda hardcoded) | ❌ |
| 4.8 Admin SPA | ⚠️ 30% (scaffolding) | ❌ 0% (features admin não movidas) | ❌ |
| 4.4 POS hardware | ✅ 50% (adapter NFC + spec) | ❌ 0% (sem app POS, sem hardware) | ❌ |
| CI/CD | ✅ 100% | ⚠️ 50% (precisa secrets do time) | ⚠️ |
| Testes | ⚠️ 30% (5 suites novas) | n/a | ❌ <70% |

**Resumo justo:** **fundação técnica entregue, integração ainda inteira pelo time**. Aproximadamente **8-12 sprints de equipe** (1-3 meses com 3 devs) para chegar em produção real com tudo.

---

## Recomendação de sequenciamento (real, não otimista)

| Sprint | Foco | Dependência |
|--------|------|-------------|
| 1 | Aplicar migration + backfill em staging; rodar `assertEventClosed` em evento histórico | Nenhuma |
| 1 | Plugar `gatewayRegistry` no checkout + criar colunas Order.gateway* | Pagar.me credential decision |
| 2 | Postar transações cashless no ledger (todos os fluxos) | Sprint 1 |
| 2 | Wirar webhook outbound em payments/checkin/cashless/events | Nenhuma |
| 3 | Triggar searchSyncQueue + provisionar Meilisearch staging | Decisão self-host vs Cloud |
| 3 | Migrar `Event.producerId` → `Event.organizationId` (fase dual-write) | Backfill OK |
| 4 | Aplicar i18n no header + checkout + tickets | i18n base pronto ✓ |
| 4 | Aumentar coverage para 65% módulos críticos | Nenhuma |
| 5-6 | ticketeria-ui shared package + mover features admin | Nenhuma |
| 5-6 | POC POS Sunmi (reunião + 2 dispositivos + festa interna) | Parceria comercial |

Em paralelo (não-código): pen test externo, DPA jurídico, reunião Pagar.me.

---

## Conclusão

A pergunta "terminamos tudo?" merece o sim verdadeiro: **não, terminamos a fundação**. O que entreguei é equivalente a engenheiros sêniores trabalhando algumas semanas em paralelo só na arquitetura — código limpo, testado, com migration SQL pronta. Mas o **trabalho de integrar com o sistema vivo** continua sendo do time, e isso são os 8-12 sprints listados acima.

Se eu tivesse lido o INSTRUCOES_DESENVOLVIMENTO antes, teria evitado o falso alarme do `api-keys` vs `credentials` e marcado o CI duplicado de cara. Por isso vale ter pedido. Promessa: na próxima sessão de qualquer coisa nova nesse projeto, leio o documento mestre primeiro.

— *Backbone está aí. Precisão de produção depende do time agora.*
