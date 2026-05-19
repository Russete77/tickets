# POS Hardware — Spec de Integração

> Auditoria CTO 2026-05 — gap 4.4
> **Objetivo:** documentar a estratégia de hardware POS para destravar o segmento cashless presencial e superar ZIGPAY no campo onde eles têm vantagem real (kit fechado pulseira+leitor+POS).

## Estratégia de hardware

### Opção A — Sunmi (recomendada para 2026)
- **Modelos alvo:** Sunmi V2s Plus (4G + NFC + impressora), Sunmi T2 Lite (PDV mesa).
- **OS:** Android 11 customizado.
- **Preço:** R$ 1.800–2.400 por unidade (compra direta do produtor) ou aluguel R$ 80/mês via PulsePass.
- **Vantagem:** SDK Android maduro, NFC Mifare nativo, suporta nosso APK Expo.

### Opção B — Gertec MP35
- **Modelos:** MP35P (Android 9 com NFC).
- **Preço:** R$ 2.500–3.000.
- **Vantagem:** marca conhecida no varejo brasileiro; convênios fiscais já existentes.

### Opção C — BYOD (smartphone Android com NFC + suporte impressora Bluetooth)
- Para venues pequenos.
- App PulsePass-POS dedicado (fork do mobile com modo POS) + impressora Bluetooth (Elgin / Bematech) opcional.

## Spec do app PulsePass-POS (Android dedicado)

### Identidade
- Pacote: `com.pulsepass.pos`
- Build: Expo EAS — perfil `pos`.
- Tela única, modo kiosk (Sunmi DeviceManager API).

### Fluxos críticos
1. **Login operador (PIN):** valida `POSOperator.pin` localmente e online; cria sessão de turno.
2. **Topup:** Pix (QR dinâmico Asaas/Pagar.me) + cartão (Stone SDK ou Pagar.me Tap).
3. **Sale:** seleciona produtos do `POSProduct`, scaneia pulseira (NFC UID), debita wallet via API.
4. **Refund** (parcial): admin only, requer PIN supervisor.
5. **Modo offline:** todas operações vão para fila SQLite; sync quando conexão volta.

### Schema offline (SQLite local)
```sql
CREATE TABLE pending_tx (
  client_tx_id TEXT PRIMARY KEY,        -- UUID gerado no POS
  type TEXT NOT NULL,                   -- 'topup' | 'purchase' | 'refund'
  wallet_uid TEXT,                      -- UID NFC ou wallet_code
  amount_cents INTEGER NOT NULL,
  items_json TEXT,
  operator_id TEXT,
  created_at_ts INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL                  -- 'pending' | 'synced' | 'failed_conflict'
);
```

### Reconciliação online ⇄ offline
Quando sync acontece:
- Servidor recebe `client_tx_id` e idempotency-key (mesmo valor).
- Se UID já tinha saldo insuficiente *naquele momento* (validado pelo timestamp), o servidor marca `failed_conflict` e devolve novo saldo.
- POS exibe alerta para o operador resolver com o cliente.

### Conflict resolution
Estratégia: **last-write-wins por wallet, exceto saldo negativo** (que dispara alerta humano).
- Cada transação carrega timestamp do POS.
- Servidor aplica no ledger em ordem cronológica recebida.
- Negativos são bloqueados — POS recebe erro e marca tx como `failed_conflict`.

### Métricas a expor (POS → /metrics)
- `pos_sync_pending`: gauge de transações pendentes.
- `pos_sync_lag_seconds`: tempo da pending mais antiga.
- `pos_offline_duration_seconds`: tempo total offline na sessão.

## Plano de validação

### Sprint 1 — POC com 2 dispositivos Sunmi V2s Plus
- App POS em modo developer.
- Festa interna SMU Produções (200 pessoas).
- Validar: 100% das transações sync após evento; latência scan→ack < 1.5s.

### Sprint 2 — piloto com 10 unidades
- Festival SMU médio (3-5k pessoas).
- 1 PDV bar + 1 mobile + 1 totem topup.
- Métricas SLO: 99,5% sucesso scan; downtime POS < 5min/evento.

### Sprint 3 — produção
- Negociar contrato de leasing com Sunmi BR (lote de 50).
- Treinamento operadores (vídeo curto + manual PDF gerado pelo skill `pdf`).
- Suporte 24/7 durante eventos.

## Custos estimados

| Item | Valor |
|------|-------|
| Sunmi V2s Plus (lote 50) | R$ 1.800/un = R$ 90.000 |
| Pulseiras Mifare Ultralight (10k) | R$ 2,30/un = R$ 23.000 |
| Encoder USB para pulseiras | R$ 800 |
| Rede 4G dedicada (chip M2M Vivo) por dispositivo | R$ 25/mês |
| Total CAPEX inicial | ~R$ 114.000 |

ROI esperado: 4-6 eventos médios cobrem o investimento via taxa cashless 2,5%.

## Próximos passos imediatos

1. Reunião com Sunmi BR (contato comercial: pedir devkit).
2. POC `cashless/nfc.adapter.ts` integrado com Mifare Classic — já criado.
3. Spec do app POS — este documento.
4. Decisão executiva: **leasing vs venda** para produtores.

## Status de implementação (2026-05-15)

Entregue (software, build variant — ver spec/plan superpowers):
- App POS variant `com.pulsepass.pos` (EAS profile `pos`)
- Pareamento device↔POS por QR + device token revogável (kill-switch)
- Boot offline-first; heartbeat de telemetria; kiosk lock-task Android

Follow-up (não nesta entrega):
- Stone SDK / Pagar.me Tap (cartão presencial)
- Impressora Bluetooth (Elgin/Bematech)
- Sunmi DeviceManager (status bar, auto-boot, watchdog) + MDM/allowlist
- Reconciliação offline last-write-wins avançada (schema pending_tx §schema)
- POC hardware Sunmi V2s Plus + leasing
