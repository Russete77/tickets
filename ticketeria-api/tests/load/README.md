# Testes de carga (k6)

Scripts de carga em [k6](https://k6.io) para validar os SLAs do PRD v4.0:
50.000 check-ins sem cair, 200ms p99 em validação, e fluxo de compra estável
sob alta demanda.

## Pré-requisitos

```bash
# Instalar k6 (macOS/Linux)
brew install k6
# Windows
choco install k6
# Docker
docker run --rm -i grafana/k6 run - < tests/load/checkin.js
```

## Variáveis de ambiente

```bash
export BASE_URL=http://localhost:3333
export OPERATOR_TOKEN=<jwt válido com role=producer>
export EVENT_ID=<UUID de evento já criado>
export TEST_TICKET_HASH=<hash de ingresso ativo>
export TEST_TOTP_SECRET=<segredo base32 do ticket>
```

Para tráfego realista, popule o evento com pelo menos 50.000 ingressos antes do teste.

## Cenários disponíveis

| Script | O que testa | Threshold |
|---|---|---|
| `checkin.js` | Validação de QR sob carga (1000 RPS sustained) | p99 < 200ms, error_rate < 0.1% |
| `checkout.js` | Reserva atômica + criação de pedido | p99 < 500ms, error_rate < 1% |
| `queue.js` | Fila inteligente com 10k usuários simultâneos | p99 entry < 1s, fairness ok |
| `cashless.js` | Charge concorrente em PDV | p99 < 300ms, zero saldo negativo |

## Como rodar

```bash
# Cenário check-in
k6 run tests/load/checkin.js

# Com output JSON para Grafana
k6 run --out json=results.json tests/load/checkin.js

# Para um endpoint específico
k6 run --vus 100 --duration 60s tests/load/checkin.js
```

## Interpretação dos resultados

- **`http_req_duration`**: latência da requisição.
  - p95 e p99 devem estar abaixo dos thresholds definidos.
- **`http_req_failed`**: taxa de falhas. Targets: < 0.1% para check-in, < 1% para checkout.
- **`iterations`**: total de iterações executadas; deve ser próximo de `RPS * duração`.
- **Custom metrics** (definidas no script): `checkin_validation_seconds`, `replay_rejections`,
  etc — específicas por cenário.

## Aviso importante

Esses scripts **não substituem** load test em produção real. Eles validam
performance em ambiente controlado, com hardware e rede do laboratório.
Para SLA de produção, rodar contra ambiente staging com infra equivalente.
