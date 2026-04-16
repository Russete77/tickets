import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ReportsController } from './reports.controller';
import { salesReportSchema, checkinReportSchema, eventIdParamSchema } from './reports.validators';
import { UserRole } from '../../generated/prisma/client';

export const reportsRouter = Router();

/**
 * GET /reports/sales/:eventId
 * Obter relatório de vendas (autenticado, produtor)
 */
reportsRouter.get(
  '/sales/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema, query: salesReportSchema }),
  ReportsController.getSalesReport,
);

/**
 * GET /reports/checkin/:eventId
 * Obter relatório de checkin (autenticado, produtor)
 */
reportsRouter.get(
  '/checkin/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema, query: checkinReportSchema }),
  ReportsController.getCheckinReport,
);

/**
 * GET /reports/financial/:eventId
 * Obter relatório financeiro (autenticado, produtor)
 */
reportsRouter.get(
  '/financial/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema }),
  ReportsController.getFinancialReport,
);

/**
 * GET /reports/export/:type/:eventId
 * Exportar relatório em CSV (autenticado, produtor)
 */
reportsRouter.get(
  '/export/:type/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  ReportsController.exportReport,
);
