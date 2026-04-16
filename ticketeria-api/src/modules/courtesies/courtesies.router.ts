import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CourtesiesController } from './courtesies.controller';
import {
  requestCourtesySchema,
  listCourtesiesSchema,
  courtesyIdParamSchema,
  eventIdParamSchema,
} from './courtesies.validators';

export const courtesiesRouter = Router();

/**
 * POST /courtesies/:eventId
 * Solicitar cortesia (autenticado, produtor/admin)
 */
courtesiesRouter.post(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema, body: requestCourtesySchema }),
  CourtesiesController.requestCourtesy,
);

/**
 * GET /courtesies/:eventId
 * Listar cortesias com filtros (autenticado, produtor)
 */
courtesiesRouter.get(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema, query: listCourtesiesSchema }),
  CourtesiesController.listCourtesies,
);

/**
 * PATCH /courtesies/:id/approve
 * Aprovar cortesia e emitir ingresso (autenticado, produtor)
 */
courtesiesRouter.patch(
  '/:id/approve',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: courtesyIdParamSchema }),
  CourtesiesController.approveCourtesy,
);

/**
 * PATCH /courtesies/:id/reject
 * Rejeitar cortesia (autenticado, produtor)
 */
courtesiesRouter.patch(
  '/:id/reject',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: courtesyIdParamSchema }),
  CourtesiesController.rejectCourtesy,
);

/**
 * PATCH /courtesies/:id/revoke
 * Revogar cortesia e cancelar ingresso (autenticado, produtor)
 */
courtesiesRouter.patch(
  '/:id/revoke',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: courtesyIdParamSchema }),
  CourtesiesController.revokeCourtesy,
);

/**
 * GET /courtesies/:eventId/report
 * Relatório de cortesias (autenticado, produtor)
 */
courtesiesRouter.get(
  '/:eventId/report',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema }),
  CourtesiesController.getReport,
);
