import { Router, Request, Response } from 'express';
import { checkAll, liveness, readiness, checkDatabase, checkRedis, checkQueues } from './health.service';

const router = Router();

/**
 * GET /health
 * Liveness simples: a app está respondendo?
 * Use em Kubernetes liveness probe / Cloud Run startup probe.
 */
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: liveness() });
});

/**
 * GET /health/ready
 * Readiness: a app está pronta para receber tráfego?
 * Verifica DB + Redis (dependências críticas).
 * Use em Kubernetes readiness probe (remove pod do load balancer enquanto degraded).
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const result = await readiness();
  const httpStatus = result.status === 'down' ? 503 : 200;
  res.status(httpStatus).json({ success: result.status !== 'down', data: result });
});

/**
 * GET /health/full
 * Health profundo: DB, Redis, filas BullMQ, circuit breakers.
 * Mais caro que /ready — usar em dashboards e alertas, não em probes frequentes.
 */
router.get('/full', async (_req: Request, res: Response) => {
  const result = await checkAll();
  const httpStatus = result.status === 'down' ? 503 : 200;
  res.status(httpStatus).json({ success: result.status !== 'down', data: result });
});

/**
 * GET /health/db
 */
router.get('/db', async (_req: Request, res: Response) => {
  const result = await checkDatabase();
  const httpStatus = result.status === 'down' ? 503 : 200;
  res.status(httpStatus).json({ success: result.status !== 'down', data: result });
});

/**
 * GET /health/redis
 */
router.get('/redis', async (_req: Request, res: Response) => {
  const result = await checkRedis();
  const httpStatus = result.status === 'down' ? 503 : 200;
  res.status(httpStatus).json({ success: result.status !== 'down', data: result });
});

/**
 * GET /health/queues
 */
router.get('/queues', async (_req: Request, res: Response) => {
  const result = await checkQueues();
  const httpStatus = result.status === 'down' ? 503 : 200;
  res.status(httpStatus).json({ success: result.status !== 'down', data: result });
});

export const healthRouter = router;
