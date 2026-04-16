import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createInsurance,
  getInsurance,
  updateInsurance,
  deleteInsurance,
} from './insurance.controller';
import {
  createInsuranceSchema,
  updateInsuranceSchema,
  eventIdParamSchema,
  insuranceIdParamSchema,
} from './insurance.validators';

/**
 * Router para rotas de seguro
 */
const router = Router();

/**
 * Rotas autenticadas (produtor/admin)
 */

// POST /insurance/:eventId - Criar seguro
router.post(
  '/:eventId',
  authenticate,
  authorize('producer'),
  validate({ params: eventIdParamSchema, body: createInsuranceSchema }),
  createInsurance
);

// GET /insurance/:eventId - Obter seguro de um evento
router.get(
  '/:eventId',
  authenticate,
  authorize('producer'),
  validate({ params: eventIdParamSchema }),
  getInsurance
);

// PATCH /insurance/:id - Atualizar seguro
router.patch(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: insuranceIdParamSchema, body: updateInsuranceSchema }),
  updateInsurance
);

// DELETE /insurance/:id - Deletar seguro
router.delete(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: insuranceIdParamSchema }),
  deleteInsurance
);

export const insuranceRouter = router;
