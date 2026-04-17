import { Router } from 'express';
import { AreasController } from './areas.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import {
  createAreaSchema,
  updateAreaSchema,
  areaIdParamSchema,
  eventIdParamSchema,
  updateCountSchema,
} from './areas.validators';

const router = Router();

/**
 * POST /areas/:eventId
 * Cria nova área (auth+producer)
 */
router.post(
  '/:eventId',
  authenticate,
  authorize('producer'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: createAreaSchema }),
  AreasController.createArea,
);

/**
 * GET /areas/:eventId
 * Lista áreas com contagens em tempo real (auth)
 */
router.get(
  '/:eventId',
  authenticate,
  validate({ params: eventIdParamSchema }),
  AreasController.listAreas,
);

/**
 * PATCH /areas/:id
 * Atualiza área (auth+producer)
 */
router.patch(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: areaIdParamSchema, body: updateAreaSchema }),
  AreasController.updateArea,
);

/**
 * DELETE /areas/:id
 * Remove área (auth+producer)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: areaIdParamSchema }),
  AreasController.deleteArea,
);

/**
 * POST /areas/:id/count
 * Incrementa ou decrementa contagem (auth)
 */
router.post(
  '/:id/count',
  authenticate,
  validate({ params: areaIdParamSchema, body: updateCountSchema }),
  AreasController.updateAreaCount,
);

/**
 * GET /areas/:eventId/capacity
 * Obtém visão geral de capacidade (auth)
 */
router.get(
  '/:eventId/capacity',
  authenticate,
  validate({ params: eventIdParamSchema }),
  AreasController.getCapacityOverview,
);

export const areasRouter = router;
