# Design — App POS dedicado (kiosk) via build variant

**Data:** 2026-05-15
**Origem:** decisão do fundador (Opção C do `docs/architecture/pos-hardware-spec.md`) + brainstorming
**Régua:** decisões avaliadas como CTO de Sympla/ZigPay/AzList — operação real de evento de grande porte (4G instável, device roubado em show, operador temporário não-confiável).

---

## 1. Problema

`CashlessPOSScreen.tsx` e `CashlessTopupScreen.tsx` existem em `ticketeria-mobile/src/screens/` mas **não são roteadas** (`app/_layout.tsx` não as referencia) — o operador de bar não tem como chegar nelas. Não há app POS dedicado, build variant, nem mecanismo de pareamento device↔ponto-de-venda. A biometria >R$50 entregue na Fase 2.4 fica inacessível.

## 2. Escopo desta iteração

**Entrega:** app POS dedicado **rodável** reusando as telas existentes, **só software** (testável em qualquer Android com NFC; sem hardware Sunmi físico, sem Stone SDK, sem impressora).

**Inclui:** build variant + EAS profile `pos`; gate de entrada offline-first; pareamento por QR (API + web admin + tela de setup); device token revogável de escopo mínimo; kiosk real (Android lock-task); heartbeat de telemetria; reuso das telas POS; login PIN de operador (turno).

**Fora (follow-up documentado):** Stone SDK / Pagar.me Tap, impressora Bluetooth, Sunmi DeviceManager (status bar/auto-boot/watchdog), reconciliação offline last-write-wins avançada (o `posOfflineQueue.ts` atual + idempotência no charge bastam pro rodável), POC de hardware / leasing.

## 3. Arquitetura

### 3.1 Build variant

- `app.json` → `app.config.ts` dinâmico lendo `process.env.APP_VARIANT`.
  - ausente/`consumer`: estado atual (`com.ticketeria.app`, "Ticketeria Digital", abas de consumidor) — **zero regressão**.
  - `pos`: `com.pulsepass.pos`, "PulsePass POS".
- Novo EAS profile `pos` em `eas.json` (development/preview/production) com `env: { APP_VARIANT: "pos" }`, `buildType: apk`.
- `src/lib/appVariant.ts` expõe `IS_POS` (via `expo-constants`/env).

### 3.2 Gate de entrada offline-first

`app/_layout.tsx` ramifica no topo por `IS_POS`. Stack POS isolada: `setup` → `pin` → `pos` / `topup`. Sem `(tabs)`, `(auth)` consumidor, checkout/checkin/event.

Estados do device (persistidos em `expo-secure-store`): `unpaired → paired(posId) → revoked/reset`.

- **Pareamento é o único passo que exige rede.** Se já `paired` (deviceToken em secure-store): app abre **direto no login PIN sem rede**, operando com catálogo cacheado (last-known-good). Validação/renovação do token é oportunista quando online.
- 4G caindo no meio do evento não pode derrubar o POS.

### 3.3 Kiosk real (agora, em software)

Android lock-task / screen pinning (`startLockTask`, COSU) via **config plugin custom** (`withAndroidLockTask`) — não exige Sunmi. Operador temporário não pode sair do app num device que move dinheiro. Exige EAS build (não Expo Go) — coerente, é APK dedicado. Camada Sunmi DeviceManager (extras) fica como gancho documentado para a fase hardware.

## 4. Backend — módulo `pos-devices`

### 4.1 Modelo `PosDevice` (Prisma)

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `posId` | uuid FK PointOfSale | escopo |
| `organizationId` | uuid | tenant |
| `label` | varchar | ex: "Bar Principal — Tablet 3" |
| `deviceTokenHash` | varchar | **token cru nunca persistido** (hash, igual API key) |
| `tokenPrefix` | varchar(12) | identificação em logs |
| `pairingCode` | varchar(8) | efêmero |
| `pairingCodeExpiresAt` | timestamptz | TTL 10 min |
| `status` | enum `pending\|active\|revoked` | |
| `pairedAt` / `lastSeenAt` | timestamptz | heartbeat |
| `appVersion` / `lastIp` | varchar | telemetria |
| `createdBy` / `revokedBy` | uuid | auditoria |
| `revokedAt` | timestamptz | |
| timestamps padrão | | camelCase + `@map` snake_case + `@db.Uuid`/`@db.Timestamptz` (CONVENCOES) |

Migration única, defaults seguros, índices em `posId`, `organizationId`, `deviceTokenHash`.

### 4.2 Endpoints

| Método/Rota | Auth | Função |
|---|---|---|
| `POST /cashless/pos/:posId/devices/pair-code` | admin + orgScope | gera `pairingCode` efêmero p/ a UI montar o QR (rate-limited) |
| `POST /pos-devices/redeem` | nenhuma (body: pairingCode) | valida código não-expirado; cria/ativa `PosDevice`; retorna **deviceToken (uma única vez)** + posId + bootstrap do POS |
| `GET /pos-devices/me` | device token | boot online: valida (não-revogado), retorna posId/POS/catálogo |
| `POST /pos-devices/heartbeat` | device token | atualiza `lastSeenAt`; recebe `{appVersion, online, pendingQueue, battery?}` |
| `DELETE /cashless/pos/:posId/devices/:id` | admin + orgScope | **kill-switch** → `status=revoked` |
| `GET /cashless/pos/:posId/devices` | admin + orgScope | lista + saúde (lastSeenAt, fila pendente) |

### 4.3 Middleware `authenticateDevice`

Header `X-Device-Token` → resolve `PosDevice` por hash → rejeita se `revoked`/inexistente → injeta `req.posDevice {posId, organizationId}`. **Escopo mínimo:** só rotas cashless do próprio `posId`; zero acesso a `/users`, tickets de consumidor, etc. É distinto do `authenticate` de usuário.

### 4.4 Login de operador (turno)

`POSOperator.pinHash` (já existe) permanece. O endpoint de operator-login passa a aceitar **device token** (em vez de JWT de usuário) + PIN → retorna sessão de turno `{operatorId, name}`. Device autentica o aparelho; PIN autentica a pessoa.

### 4.5 Revogação / kill-switch

Tablet sumido em show é rotina. `DELETE` marca `revoked`; `authenticateDevice` e `/me` passam a rejeitar. Offline: device opera com last-known-good; ao voltar online o sync/heartbeat recebe `revoked` → app limpa secure-store, volta a `unpaired`, alerta.

## 5. Web admin (`ticketeria-web` AdminPosPage / cashless)

- Botão "Parear dispositivo" → `pair-code` → modal: **QR** (lib `qrcode`) + código numérico fallback + countdown do TTL.
- Lista de devices do POS: `label`, `status`, `lastSeenAt`, fila pendente, botão **Revogar**.

## 6. App POS (mobile, variant `pos`)

- `app/(pos)/setup.tsx`: `expo-camera` (já usado) escaneia QR **ou** input manual do código → `POST /pos-devices/redeem` → `deviceToken` em `SecureStorage` (helper já existe) → estado `paired` → navega ao PIN.
- `app/(pos)/pin.tsx`: PIN do operador → sessão de turno.
- `app/(pos)/index.tsx` (POS) e `app/(pos)/topup.tsx`: renderizam `CashlessPOSScreen` / `CashlessTopupScreen` **sem alteração de UI**.
- `PosSessionProvider`: contexto que fornece `posId` + device token + operador de turno às telas (substitui as props `posId`/`operatorJwt` que hoje são passadas externamente).
- `usePosHeartbeat`: hook no layout POS, intervalo 60s, best-effort, não bloqueia.
- Offline: `posOfflineQueue.ts` reusado como está; `charge` já envia `X-Idempotency-Key` (visto em `CashlessPOSScreen`). Reconciliação avançada = follow-up.

## 7. Componentes e isolamento

| Unidade | Faz | Depende de |
|---|---|---|
| `app.config.ts` | resolve identidade por variant | `APP_VARIANT` |
| `appVariant.ts` | expõe `IS_POS` | expo-constants |
| `PosDeviceService` (API) | pair-code / redeem / revoke / heartbeat | Prisma, hash util |
| `authenticateDevice` | auth de device escopo-mínimo | PosDevice |
| `PosSessionProvider` | injeta sessão (posId/operador) | secure-store, /me |
| `usePosHeartbeat` | telemetria periódica | device token |
| config plugin lock-task | kiosk Android | EAS build |

Telas `CashlessPOSScreen`/`CashlessTopupScreen` permanecem caixas-pretas estáveis (só muda a fonte de `posId`/auth: props → contexto).

## 8. Erros e degradação

- Sem rede no boot + `paired` → opera offline (last-known-good); banner discreto de offline.
- Código de pareamento expirado/ inválido → erro claro, pede novo no painel.
- Device revogado detectado no sync/heartbeat → limpa credencial, volta a `unpaired`, mensagem ao operador.
- Heartbeat falho → silencioso (best-effort), não impacta venda.

## 9. Testes

- **Backend (Vitest, padrão do projeto):** pair-code gera com TTL; redeem cria token + grava só hash; redeem com código expirado falha; redeem duplicado não revaza token; heartbeat atualiza lastSeenAt; revoke → token rejeitado por `authenticateDevice` e `/me`; middleware nega acesso fora do `posId`/a rotas de consumidor; operator-login via device token + PIN.
- **Mobile:** `tsc --noEmit` limpo nos arquivos novos/variant; sem runtime (sem device no ambiente) — declarado explicitamente.

## 10. Definition of Done

- [ ] `app.config.ts` + EAS profile `pos`; `APP_VARIANT=consumer` não regride o app atual
- [ ] Migration `PosDevice` + `npm run db:generate` ok
- [ ] Módulo `pos-devices` (service/router/validators/tests) seguindo CONVENCOES
- [ ] `authenticateDevice` com escopo mínimo + testes de escopo
- [ ] Web admin: parear (QR) + listar + revogar
- [ ] App POS: setup→pin→pos/topup; boot offline-first; heartbeat
- [ ] config plugin lock-task aplicado no variant `pos`
- [ ] Telas POS reusadas sem alteração de UI
- [ ] Backend tests verdes; mobile typecheck limpo nos arquivos tocados
- [ ] Follow-ups da seção 2 anotados no doc de arquitetura
