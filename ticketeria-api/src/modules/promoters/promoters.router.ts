import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { PromotersController } from './promoters.controller';
import {
  registerPromoterSchema,
  listPromotersSchema,
  updatePromoterSchema,
  assignToEventSchema,
  promoterIdParamSchema,
  eventIdParamSchema,
} from './promoters.validators';

export const promotersRouter = Router();

/**
 * POST /promoters
 * Registrar novo promoter (autenticado)
 */
promotersRouter.post(
  '/',
  authenticate,
  validate({ body: registerPromoterSchema }),
  PromotersController.register,
);

/**
 * GET /promoters
 * Listar promoters com paginação e busca (autenticado, produtor/admin)
 */
promotersRouter.get(
  '/',
  authenticate,
  authorize('producer', 'admin'),
  validate({ query: listPromotersSchema }),
  PromotersController.list,
);

/**
 * GET /promoters/:id
 * Obter promoter por ID (autenticado)
 */
promotersRouter.get(
  '/:id',
  authenticate,
  validate({ params: promoterIdParamSchema }),
  PromotersController.getById,
);

/**
 * PATCH /promoters/:id
 * Atualizar dados do promoter (autenticado)
 */
promotersRouter.patch(
  '/:id',
  authenticate,
  validate({ params: promoterIdParamSchema, body: updatePromoterSchema }),
  PromotersController.update,
);

/**
 * POST /promoters/:id/assign/:eventId
 * Atribuir promoter a um evento (autenticado, produtor/admin)
 */
promotersRouter.post(
  '/:id/assign/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({
    params: {
      id: promoterIdParamSchema.shape.id,
      eventId: eventIdParamSchema.shape.eventId,
    },
    body: assignToEventSchema,
  }),
  PromotersController.assignToEvent,
);

/**
 * GET /promoters/:id/events
 * Obter eventos atribuídos ao promoter (autenticado)
 */
promotersRouter.get(
  '/:id/events',
  authenticate,
  validate({ params: promoterIdParamSchema }),
  PromotersController.getAssignedEvents,
);

/**
 * GET /promoters/me/dashboard
 * Obter dashboard do promoter autenticado (autenticado)
 */
promotersRouter.get(
  '/me/dashboard',
  authenticate,
  PromotersController.getMyDashboard,
);

/**
 * GET /promoters/me/events/:eventId/stats
 * Obter estatísticas do promoter para um evento (autenticado)
 */
promotersRouter.get(
  '/me/events/:eventId/stats',
  authenticate,
  validate({ params: eventIdParamSchema }),
  PromotersController.getEventStats,
);
