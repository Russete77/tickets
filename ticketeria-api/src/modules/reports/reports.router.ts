import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import { ReportsController } from './reports.controller';
import { salesReportSchema, checkinReportSchema, eventIdParamSchema } from './reports.validators';
import { UserRole } from '../../generated/prisma/client';

export const reportsRouter = Router();

/**
 * GET /reports/sales/:eventId
 * Obter relatório de vendas (autenticado, produtor dono do evento)
 */
reportsRouter.get(
  '/sales/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema, query: salesReportSchema }),
  requireEventOwnership,
  ReportsController.getSalesReport,
);

/**
 * GET /reports/checkin/:eventId
 * Obter relatório de checkin (autenticado, produtor dono do evento)
 */
reportsRouter.get(
  '/checkin/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema, query: checkinReportSchema }),
  requireEventOwnership,
  ReportsController.getCheckinReport,
);

/**
 * GET /reports/financial/:eventId
 * Obter relatório financeiro (autenticado, produtor dono do evento)
 */
reportsRouter.get(
  '/financial/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema }),
  requireEventOwnership,
  ReportsController.getFinancialReport,
);

/**
 * GET /reports/export/:type/:eventId
 * Exportar relatório em CSV (autenticado, produtor dono do evento)
 */
reportsRouter.get(
  '/export/:type/:eventId',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  requireEventOwnership,
  ReportsController.exportReport,
);

/**
 * GET /reports/:eventId/excel
 * Exportar relatório completo em Excel 9 abas (autenticado, produtor dono do evento)
 */
reportsRouter.get(
  '/:eventId/excel',
  authenticate,
  authorize(UserRole.producer, UserRole.admin),
  validate({ params: eventIdParamSchema }),
  requireEventOwnership,
  ReportsController.exportExcel,
);
