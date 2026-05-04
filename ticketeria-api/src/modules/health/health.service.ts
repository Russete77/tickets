import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import {
  emailQueue,
  ticketEmissionQueue,
  paymentWebhookQueue,
  expireReservationsQueue,
  batchSwitchQueue,
  batchScheduleQueue,
  capacityAlertQueue,
  postEventReviewQueue,
  postEventReportQueue,
  cleanupSessionsQueue,
  checkinSyncQueue,
  pushQueue,
} from '../../jobs/queue';
import { Queue } from 'bullmq';
import { asaasBreaker, resendBreaker, expoPushBreaker } from '../../shared/circuitBreaker';
import { queueDepthGauge, circuitBreakerState } from '../../shared/metrics';
import { logger } from '../../shared/logger';

export type HealthStatus = 'ok' | 'degraded' | 'down';

interface CheckResult {
  status: HealthStatus;
  latencyMs?: number;
  detail?: string;
  metadata?: Record<string, unknown>;
}

const HEALTH_TIMEOUT_MS = 2_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} health check timeout (>${timeoutMs}ms)`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Verifica conexão com PostgreSQL via SELECT 1.
 */
export async function checkDatabase(): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, HEALTH_TIMEOUT_MS, 'database');
    return {
      status: 'ok',
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      detail: message,
    };
  }
}

/**
 * Verifica conexão com Redis via PING.
 */
export async function checkRedis(): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    const pong = await withTimeout(redis.ping(), HEALTH_TIMEOUT_MS, 'redis');
    if (pong !== 'PONG') {
      return {
        status: 'degraded',
        latencyMs: Date.now() - startedAt,
        detail: `Resposta inesperada do Redis: ${pong}`,
      };
    }
    return {
      status: 'ok',
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      detail: message,
    };
  }
}

/**
 * Verifica saúde das filas BullMQ.
 *
 * - "down" se alguma fila não respondeu.
 * - "degraded" se houver jobs failed > threshold.
 * - "ok" caso contrário.
 *
 * Atualiza também o gauge `pulsepass_queue_depth` com a contagem de waiting+active.
 */
const queues: Array<[string, Queue]> = [
  ['email', emailQueue],
  ['ticket-emission', ticketEmissionQueue],
  ['payment-webhook', paymentWebhookQueue],
  ['expire-reservations', expireReservationsQueue],
  ['batch-auto-switch', batchSwitchQueue],
  ['batch-schedule', batchScheduleQueue],
  ['capacity-alert', capacityAlertQueue],
  ['post-event-review', postEventReviewQueue],
  ['post-event-report', postEventReportQueue],
  ['cleanup-sessions', cleanupSessionsQueue],
  ['checkin-sync', checkinSyncQueue],
  ['push', pushQueue],
];

const FAILED_THRESHOLD = 50;

export async function checkQueues(): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    const results = await Promise.all(
      queues.map(async ([name, queue]) => {
        const counts = await withTimeout(
          queue.getJobCounts('waiting', 'active', 'failed', 'delayed'),
          HEALTH_TIMEOUT_MS,
          `queue:${name}`,
        );
        queueDepthGauge.set((counts.waiting ?? 0) + (counts.active ?? 0), { queue: name });
        return { name, counts };
      }),
    );

    const totalFailed = results.reduce((sum, r) => sum + (r.counts.failed ?? 0), 0);
    const status: HealthStatus = totalFailed > FAILED_THRESHOLD ? 'degraded' : 'ok';

    return {
      status,
      latencyMs: Date.now() - startedAt,
      metadata: {
        totalFailed,
        queues: Object.fromEntries(results.map((r) => [r.name, r.counts])),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: 'down',
      latencyMs: Date.now() - startedAt,
      detail: message,
    };
  }
}

/**
 * Reporta estado dos circuit breakers de APIs externas.
 * Ele não faz chamadas reais (evita custo); apenas reporta o último estado.
 */
export function checkBreakers(): CheckResult {
  const breakers = [asaasBreaker, resendBreaker, expoPushBreaker];
  const snapshots = breakers.map((b) => b.snapshot());

  for (const snap of snapshots) {
    const numeric = snap.state === 'CLOSED' ? 0 : snap.state === 'HALF_OPEN' ? 1 : 2;
    circuitBreakerState.set(numeric, { breaker: snap.name });
  }

  const open = snapshots.filter((s) => s.state === 'OPEN');
  if (open.length > 0) {
    return {
      status: 'degraded',
      detail: `Circuit breakers abertos: ${open.map((s) => s.name).join(', ')}`,
      metadata: { breakers: snapshots },
    };
  }

  return {
    status: 'ok',
    metadata: { breakers: snapshots },
  };
}

/**
 * Health overall: agrega todos os checks e calcula um status global.
 *  - "ok": tudo ok.
 *  - "degraded": pelo menos um degraded, nenhum down.
 *  - "down": pelo menos um down (ou DB não responde).
 */
export interface OverallHealth {
  status: HealthStatus;
  uptime: number;
  timestamp: string;
  checks: {
    database: CheckResult;
    redis: CheckResult;
    queues: CheckResult;
    breakers: CheckResult;
  };
}

export async function checkAll(): Promise<OverallHealth> {
  const [database, redisCheck, queuesCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkQueues(),
  ]);
  const breakers = checkBreakers();

  const allChecks = [database, redisCheck, queuesCheck, breakers];

  let status: HealthStatus = 'ok';
  if (allChecks.some((c) => c.status === 'down')) {
    status = 'down';
  } else if (allChecks.some((c) => c.status === 'degraded')) {
    status = 'degraded';
  }

  return {
    status,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    checks: {
      database,
      redis: redisCheck,
      queues: queuesCheck,
      breakers,
    },
  };
}

/**
 * Liveness: a aplicação está respondendo? (Não verifica dependências.)
 * Usado por Kubernetes/Cloud Run para reiniciar o pod se travado.
 */
export function liveness(): { status: 'ok'; uptime: number } {
  return {
    status: 'ok',
    uptime: Math.round(process.uptime()),
  };
}

/**
 * Readiness: a aplicação está pronta para receber tráfego?
 * Verifica DB e Redis (dependências críticas).
 */
export async function readiness(): Promise<{ status: HealthStatus; checks: Record<string, CheckResult> }> {
  try {
    const [database, redisCheck] = await Promise.all([checkDatabase(), checkRedis()]);
    const status: HealthStatus = [database, redisCheck].some((c) => c.status === 'down')
      ? 'down'
      : [database, redisCheck].some((c) => c.status === 'degraded')
        ? 'degraded'
        : 'ok';
    return { status, checks: { database, redis: redisCheck } };
  } catch (err) {
    logger.error({ err }, 'Readiness check failure');
    return {
      status: 'down',
      checks: {
        database: { status: 'down', detail: 'unknown' },
        redis: { status: 'down', detail: 'unknown' },
      },
    };
  }
}
