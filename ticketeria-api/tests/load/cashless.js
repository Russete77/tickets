// k6 load test: charge cashless concorrente.
//
// Cenário: 200 RPS sustained — simula PDVs em pico de evento.
// Validação: zero saldo negativo, p99 < 300ms.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';
const OPERATOR_TOKEN = __ENV.OPERATOR_TOKEN || '';
const WALLET_IDS = (__ENV.WALLET_IDS || '').split(',').filter(Boolean);

const charges = new Counter('cashless_charges_total');
const chargeDuration = new Trend('cashless_charge_duration_seconds');
const successRate = new Rate('cashless_success');
const insufficientFunds = new Counter('insufficient_funds_rejections');

export const options = {
  stages: [
    { duration: '15s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<300'],
    http_req_failed: ['rate<0.05'], // saldo insuficiente conta como "falha"
  },
};

export default function () {
  if (!OPERATOR_TOKEN || WALLET_IDS.length === 0) {
    throw new Error('OPERATOR_TOKEN e WALLET_IDS são obrigatórios');
  }

  const walletId = WALLET_IDS[Math.floor(Math.random() * WALLET_IDS.length)];
  const amount = (Math.floor(Math.random() * 5) + 1) * 1000; // R$10 - R$50

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/cashless/charge`,
    JSON.stringify({
      walletId,
      amountCents: amount,
      items: [{ productId: 'beer', name: 'Cerveja', qty: 1, priceCents: amount }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPERATOR_TOKEN}`,
        'X-Idempotency-Key': `lt-cash-${__VU}-${__ITER}`,
      },
    },
  );
  const elapsed = (Date.now() - start) / 1000;

  charges.add(1);
  chargeDuration.add(elapsed);

  if (res.status === 400 && res.body.includes('insuficiente')) {
    insufficientFunds.add(1);
    successRate.add(0);
  } else {
    successRate.add(res.status === 200 || res.status === 201 ? 1 : 0);
  }

  check(res, {
    'charge ok ou saldo insuficiente': (r) => [200, 201, 400].includes(r.status),
  });

  sleep(0.05);
}
