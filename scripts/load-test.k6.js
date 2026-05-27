/**
 * Load test smoke para PulsePass API.
 *
 * Rodar:
 *   k6 run scripts/load-test.k6.js --env BASE_URL=https://staging.pulsepass.com.br/api/v1 --env JWT=<token>
 *
 * Targets:
 *   - p95 GET /events < 500ms
 *   - error_rate < 1%
 *   - sustenta 50 VUs por 2 minutos sem degradação
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    browse_events: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      exec: 'browse',
    },
    checkin_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
      exec: 'checkin',
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3333/api/v1';
const JWT = __ENV.JWT || '';
const headers = JWT ? { Authorization: `Bearer ${JWT}` } : {};

export function browse() {
  const r1 = http.get(`${BASE}/events?limit=20`);
  check(r1, { 'events list 200': (r) => r.status === 200 }) || errorRate.add(1);
  sleep(1);

  const r2 = http.get(`${BASE}/events?category=festival`);
  check(r2, { 'events filter 200': (r) => r.status === 200 }) || errorRate.add(1);
  sleep(1);
}

export function checkin() {
  if (!JWT) return;
  const r = http.get(`${BASE}/customer-orders/me?limit=10`, { headers });
  check(r, { 'orders me 200': (r) => r.status === 200 }) || errorRate.add(1);
  sleep(2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'load-test-report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(d) {
  const lines = [];
  lines.push('=== Load Test Summary ===');
  lines.push(`Total requests: ${d.metrics.http_reqs?.values?.count ?? 0}`);
  lines.push(`p95 duration: ${(d.metrics.http_req_duration?.values?.['p(95)'] ?? 0).toFixed(0)}ms`);
  lines.push(`error rate: ${((d.metrics.errors?.values?.rate ?? 0) * 100).toFixed(2)}%`);
  return lines.join('\n') + '\n';
}
