import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../shared/metrics';

/**
 * Middleware que coleta métricas Prometheus de cada requisição.
 *
 * Estratégia para `route`:
 *   - Usa `req.route?.path` quando disponível (após o roteamento).
 *   - Caso ainda não tenha sido resolvido (404, erro precoce), usa `req.path`.
 *   - Substitui IDs por `:id` para evitar explosão de cardinalidade.
 */

const idPattern = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const numericPattern = /\/\d+/g;

function normalizeRoute(req: Request): string {
  const base = req.baseUrl || '';
  const routePath = req.route?.path;

  if (routePath) {
    return base + (Array.isArray(routePath) ? routePath[0] : routePath);
  }

  return req.path.replace(idPattern, '/:id').replace(numericPattern, '/:id');
}

export function httpMetrics(req: Request, res: Response, next: NextFunction): void {
  // Skip /metrics e /health* — não medimos a si mesmos
  if (req.path === '/metrics' || req.path.startsWith('/health')) {
    next();
    return;
  }

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const route = normalizeRoute(req);
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };

    const elapsedNs = Number(process.hrtime.bigint() - startedAt);
    const elapsedSec = elapsedNs / 1_000_000_000;

    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(elapsedSec, { method: req.method, route });
  });

  next();
}
