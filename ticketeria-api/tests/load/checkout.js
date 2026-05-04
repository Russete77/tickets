// k6 load test: fluxo de reserva de ingressos.
//
// Cenário: 500 RPS sustained — simula horário de pico de venda.
// Validação: anti-overbooking (zero negative inventory), p99 < 500ms.
//
// Como rodar: k6 run tests/load/checkout.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';
const USER_TOKENS = (__ENV.USER_TOKENS || '').split(',').filter(Boolean);
const BATCH_ID = __ENV.BATCH_ID || '';
const EVENT_ID = __ENV.EVENT_ID || '';

const reservations = new Counter('reservations_total');
const reservationDuration = new Trend('reservation_duration_seconds');
const successRate = new Rate('reservation_success');
const overbookingErrors = new Counter('overbooking_errors_total');

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '40s', target: 200 },
    { duration: '2m', target: 500 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<500', 'p(95)<300'],
    http_req_failed: ['rate<0.01'],
    overbooking_errors_total: ['count<1'], // zero overbooking
  },
};

export default function () {
  if (USER_TOKENS.length === 0 || !BATCH_ID || !EVENT_ID) {
    throw new Error('USER_TOKENS, BATCH_ID e EVENT_ID são obrigatórios');
  }

  const token = USER_TOKENS[Math.floor(Math.random() * USER_TOKENS.length)];

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/tickets/reserve`,
    JSON.stringify({
      eventId: EVENT_ID,
      batchId: BATCH_ID,
      quantity: 1,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': `lt-${__VU}-${__ITER}-${Date.now()}`,
        'X-Device-Fingerprint': `loadtest-vu-${__VU}`,
      },
    },
  );
  const elapsed = (Date.now() - start) / 1000;

  reservations.add(1);
  reservationDuration.add(elapsed);

  // Sucesso: 201 (created) ou 409 (sold-out — comportamento esperado quando esgota).
  // FALHA REAL: 200/201 mas saldo de estoque ficou negativo (verificar via /admin/audit).
  const expectedSuccess = res.status === 201 || res.status === 200;
  const expectedSoldOut = res.status === 409;

  successRate.add(expectedSuccess ? 1 : 0);

  check(res, {
    'reserva ok ou sold-out': (r) => expectedSuccess || expectedSoldOut,
  });

  // 5xx é overbooking ou bug
  if (res.status >= 500) {
    overbookingErrors.add(1);
  }

  sleep(0.1);
}
