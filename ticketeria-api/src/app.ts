import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env';
import { AppError } from './shared/errors';
import { logger } from './shared/logger';
import { requestId } from './middleware/requestId';
import { globalRateLimiter } from './middleware/rateLimiter';
import { deviceFingerprint } from './middleware/deviceFingerprint';
import { httpMetrics } from './middleware/httpMetrics';
import { Sentry } from './config/sentry';
import { setupSwagger } from './config/swagger';

// Routers dos módulos
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import eventsRouter from './modules/events/events.router';
import ticketsRouter from './modules/tickets/tickets.router';
import { ordersRouter } from './modules/orders/orders.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { checkinRouter } from './modules/checkin/checkin.router';
import { producersRouter } from './modules/producers/producers.router';
import { affiliatesRouter } from './modules/affiliates/affiliates.router';
import { reportsRouter } from './modules/reports/reports.router';
import { adminRouter } from './modules/admin/admin.router';
import { favoritesRouter } from './modules/favorites/favorites.router';
import { liveRouter } from './modules/live/live.router';

// Novos módulos — Fase 0 (Crítico/Legal)
import { priceRulesRouter } from './modules/price-rules/price-rules.router';
import { permissionsRouter } from './modules/permissions/permissions.router';

// Novos módulos — Fase 1 (Core Revenue)
import { courtesiesRouter } from './modules/courtesies/courtesies.router';
import { boxOfficeRouter } from './modules/box-office/box-office.router';
import { waitlistRouter } from './modules/waitlist/waitlist.router';

// Novos módulos — Fase 2 (AZLIST Killer)
import { guestListsRouter } from './modules/guest-lists/guest-lists.router';
import { promotersRouter } from './modules/promoters/promoters.router';

// Novos módulos — Fase 3-4 (Cashless / POS)
import { cashlessRouter } from './modules/cashless/cashless.router';

// Novos módulos — Fase 5 (Produção)
import { staffRouter } from './modules/staff/staff.router';
import { areasRouter } from './modules/areas/areas.router';
import { storeRouter } from './modules/store/store.router';
import { formFieldsRouter } from './modules/form-fields/form-fields.router';

// Novos módulos — Fase 6 (Enterprise)
import { credentialsRouter } from './modules/credentials/credentials.router';
import { certificatesRouter } from './modules/certificates/certificates.router';
import { insuranceRouter } from './modules/insurance/insurance.router';

// Operacional — health checks profundos + métricas Prometheus
import { healthRouter } from './modules/health/health.router';
import { renderMetrics } from './shared/metrics';

// Webhooks externos (Sympla, Ingresso.com)
import { externalWebhooksRouter } from './modules/webhooks-external/webhooks-external.router';

// ============================================
// Auditoria CTO 2026-05 — novos módulos
// ============================================
import { organizationsRouter } from './modules/organizations/organizations.router';
import { brandingRouter } from './modules/organizations/branding.router';
import { ledgerRouter } from './modules/ledger/ledger.router';
import { webhooksOutboundRouter } from './modules/webhooks-outbound/webhooks-outbound.router';
import lgpdRouter from './modules/lgpd/lgpd.router';
import posDevicesRouter from './modules/pos-devices/pos-devices.router';

export function createApp() {
  const app = express();

  // ============================
  // Middleware chain global
  // ============================

  // Request ID único
  app.use(requestId);

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: [env.FRONTEND_URL, env.ADMIN_URL, env.CHECKIN_URL],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-Id',
        'X-Idempotency-Key',
        'X-Device-Fingerprint',
      ],
    }),
  );

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) },
      }),
    );
  }

  // Device fingerprint + IP capture (após body parser, antes de rotas)
  app.use(deviceFingerprint);

  // HTTP metrics collection (Prometheus)
  app.use(httpMetrics);

  // Rate limiting global
  app.use(globalRateLimiter);

  // ============================
  // Health checks profundos
  // ============================
  app.use('/health', healthRouter);

  // ============================
  // Prometheus metrics endpoint (text/plain)
  // ============================
  app.get('/metrics', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(renderMetrics());
  });

  // ============================
  // Swagger/OpenAPI Documentation
  // ============================
  setupSwagger(app);

  // ============================
  // API Routes v1
  // ============================
  const apiPrefix = `/api/${env.API_VERSION}`;

  app.use(`${apiPrefix}/auth`, authRouter);
  app.use(`${apiPrefix}/users`, usersRouter);
  app.use(`${apiPrefix}/events`, eventsRouter);
  app.use(`${apiPrefix}/tickets`, ticketsRouter);
  app.use(`${apiPrefix}/orders`, ordersRouter);
  app.use(`${apiPrefix}/payments`, paymentsRouter);
  app.use(`${apiPrefix}/checkin`, checkinRouter);
  app.use(`${apiPrefix}/producers`, producersRouter);
  app.use(`${apiPrefix}/affiliates`, affiliatesRouter);
  app.use(`${apiPrefix}/reports`, reportsRouter);
  app.use(`${apiPrefix}/admin`, adminRouter);
  app.use(`${apiPrefix}/favorites`, favoritesRouter);
  app.use(`${apiPrefix}/live`, liveRouter);

  // Novos módulos
  app.use(`${apiPrefix}/price-rules`, priceRulesRouter);
  app.use(`${apiPrefix}/permissions`, permissionsRouter);
  app.use(`${apiPrefix}/courtesies`, courtesiesRouter);
  app.use(`${apiPrefix}/box-office`, boxOfficeRouter);
  app.use(`${apiPrefix}/waitlist`, waitlistRouter);
  app.use(`${apiPrefix}/guest-lists`, guestListsRouter);
  app.use(`${apiPrefix}/promoters`, promotersRouter);
  app.use(`${apiPrefix}/cashless`, cashlessRouter);
  app.use(`${apiPrefix}/staff`, staffRouter);
  app.use(`${apiPrefix}/areas`, areasRouter);
  app.use(`${apiPrefix}/store`, storeRouter);
  app.use(`${apiPrefix}/form-fields`, formFieldsRouter);
  app.use(`${apiPrefix}/credentials`, credentialsRouter);
  app.use(`${apiPrefix}/certificates`, certificatesRouter);
  app.use(`${apiPrefix}/insurance`, insuranceRouter);
  app.use(`${apiPrefix}/webhooks/external`, externalWebhooksRouter);

  // ============================
  // Novos módulos — Auditoria CTO 2026-05
  // ============================
  app.use(`${apiPrefix}/organizations`, organizationsRouter);
  app.use(`${apiPrefix}/branding`, brandingRouter);
  app.use(`${apiPrefix}/ledger`, ledgerRouter);
  app.use(`${apiPrefix}/webhooks/outbound`, webhooksOutboundRouter);
  app.use(`${apiPrefix}/lgpd`, lgpdRouter);
  app.use(`${apiPrefix}/pos-devices`, posDevicesRouter);

  // ============================
  // 404 handler
  // ============================
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Rota não encontrada' },
    });
  });

  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn({ err, requestId: req.headers['x-request-id'], path: req.path });
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
      });
      return;
    }
    logger.error({ err, requestId: req.headers['x-request-id'], path: req.path });
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
    });
  });

  return app;
}
