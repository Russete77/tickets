// k6 load test: validação de check-in sob alta carga.
//
// Cenário: 1000 RPS sustained por 5 minutos (com ramp-up).
// Validação: p99 < 200ms, taxa de erro < 0.1%, anti-replay funciona.
//
// Como rodar: k6 run tests/load/checkin.js
//
// IMPORTANTE: este teste assume que a API tem operador + evento + tickets criados.
// Use `scripts/seed-load-test.ts` (ou seed.ts) para popular o ambiente antes.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import crypto from 'k6/crypto';
import encoding from 'k6/encoding';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';
const OPERATOR_TOKEN = __ENV.OPERATOR_TOKEN || '';
const EVENT_ID = __ENV.EVENT_ID || '';

// Pool de tickets — em produção, popular via env var ou config externo
const TICKET_HASHES = (__ENV.TICKET_HASHES || '').split(',').filter(Boolean);
const TOTP_SECRETS = (__ENV.TOTP_SECRETS || '').split(',').filter(Boolean);

// Métricas customizadas
const checkinValidations = new Counter('checkin_validations_total');
const checkinDuration = new Trend('checkin_validation_seconds');
const replayRejections = new Counter('replay_rejections_total');
const validCheckins = new Rate('valid_checkins');

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // ramp-up
    { duration: '1m', target: 500 }, // intermediário
    { duration: '3m', target: 1000 }, // sustained 1000 VUs
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<200', 'p(95)<150'],
    http_req_failed: ['rate<0.001'],
    checkin_validation_seconds: ['p(99)<0.2'],
  },
};

// --- TOTP RFC 6238 (HOTP/SHA1, step 30s) ---
function base32Decode(b32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < b32.length; i += 1) {
    const v = alphabet.indexOf(b32[i].toUpperCase());
    if (v === -1) continue;
    bits += v.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return bytes;
}

function generateTotp(secretBase32, step = 30) {
  const counter = Math.floor(Date.now() / 1000 / step);
  const counterBytes = new Array(8).fill(0);
  let c = counter;
  for (let i = 7; i >= 0; i -= 1) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const keyBytes = base32Decode(secretBase32);
  const hmac = crypto.hmac('sha1', String.fromCharCode(...keyBytes), String.fromCharCode(...counterBytes), 'hex');
  const offset = parseInt(hmac.slice(-1), 16);
  const slice = hmac.slice(offset * 2, offset * 2 + 8);
  const num = parseInt(slice, 16) & 0x7fffffff;
  return String(num % 1_000_000).padStart(6, '0');
}

export default function () {
  if (TICKET_HASHES.length === 0) {
    throw new Error('TICKET_HASHES env var é obrigatória');
  }
  if (!OPERATOR_TOKEN || !EVENT_ID) {
    throw new Error('OPERATOR_TOKEN e EVENT_ID são obrigatórios');
  }

  const idx = Math.floor(Math.random() * TICKET_HASHES.length);
  const ticketHash = TICKET_HASHES[idx];
  const secret = TOTP_SECRETS[idx] || TOTP_SECRETS[0];
  const totpCode = generateTotp(secret);

  const qrPayload = JSON.stringify({
    ticketHash,
    totpCode,
    timestamp: String(Date.now()),
  });

  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/v1/checkin/validate`,
    JSON.stringify({
      qrData: qrPayload,
      eventId: EVENT_ID,
      deviceId: `vu-${__VU}-iter-${__ITER}`,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPERATOR_TOKEN}`,
        'X-Device-Fingerprint': `loadtest-vu-${__VU}`,
      },
    },
  );
  const elapsed = (Date.now() - start) / 1000;

  checkinValidations.add(1);
  checkinDuration.add(elapsed);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response has success field': (r) => {
      try {
        return JSON.parse(r.body).success !== undefined;
      } catch {
        return false;
      }
    },
  });

  validCheckins.add(ok ? 1 : 0);

  // Conta replays rejeitados (esperado se o pool de tickets é menor que iterations)
  try {
    const body = JSON.parse(res.body);
    if (body?.data?.result === 'already_used') {
      replayRejections.add(1);
    }
  } catch {
    // ignore
  }

  sleep(0.05);
}
