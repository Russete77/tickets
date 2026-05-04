import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { validate } from '../../middleware/validate';
import { webhookRateLimiter } from '../../middleware/rateLimiter';
import {
  symplaWebhookSchema,
  ingressoWebhookSchema,
} from './webhooks-external.validators';
import {
  processSymplaWebhook,
  processIngressoWebhook,
  importSymplaCsv,
} from './webhooks-external.service';

const router = Router();

/**
 * Captura raw body para verificação HMAC. Roda antes de express.json() para
 * preservar o conteúdo exato. Repassa para o body parser depois.
 */
function captureRawBody(req: Request, _res: Response, next: NextFunction): void {
  let data = '';
  req.setEncoding('utf-8');
  req.on('data', (chunk) => {
    data += chunk;
  });
  req.on('end', () => {
    (req as Request & { rawBody?: string }).rawBody = data;
    try {
      req.body = data.length > 0 ? JSON.parse(data) : {};
    } catch {
      req.body = {};
    }
    next();
  });
  req.on('error', next);
}

/**
 * POST /webhooks/external/sympla
 * Recebe eventos do Sympla quando o produtor configura webhook na conta deles.
 */
router.post(
  '/sympla',
  webhookRateLimiter,
  captureRawBody,
  validate({ body: symplaWebhookSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.header('x-sympla-signature') || req.header('x-signature');
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
      const result = await processSymplaWebhook(req.body, rawBody, signature, req.ipAddress);
      const status = result.duplicate ? 200 : result.accepted ? 202 : 422;
      res.status(status).json({ success: result.accepted, data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /webhooks/external/ingresso
 * Recebe eventos do Ingresso.com.
 */
router.post(
  '/ingresso',
  webhookRateLimiter,
  captureRawBody,
  validate({ body: ingressoWebhookSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.header('x-ingresso-signature') || req.header('x-signature');
      const rawBody = (req as Request & { rawBody?: string }).rawBody ?? '';
      const result = await processIngressoWebhook(req.body, rawBody, signature, req.ipAddress);
      const status = result.duplicate ? 200 : result.accepted ? 202 : 422;
      res.status(status).json({ success: result.accepted, data: result });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /webhooks/external/sympla/import-csv
 * Import manual de CSV padrão Sympla (texto direto no body).
 * Endpoint protegido pelo `EXTERNAL_WEBHOOK_SECRET` via header `x-import-secret`.
 */
router.post(
  '/sympla/import-csv',
  webhookRateLimiter,
  express.text({ type: 'text/csv', limit: '10mb' }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSymplaCsv(typeof req.body === 'string' ? req.body : '');
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export const externalWebhooksRouter = router;
