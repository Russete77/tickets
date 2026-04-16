import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { PriceRulesController } from './price-rules.controller';
import {
  createRuleSchema,
  updateRuleSchema,
  batchIdParamSchema,
  idParamSchema,
} from './price-rules.validators';

export const priceRulesRouter = Router();

/**
 * POST /price-rules/:batchId
 * Criar nova regra de preço para um lote
 * Requer autenticação e papel de produtor
 */
priceRulesRouter.post(
  '/:batchId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: batchIdParamSchema, body: createRuleSchema }),
  PriceRulesController.createRule,
);

/**
 * GET /price-rules/:batchId
 * Listar regras de preço de um lote (público)
 */
priceRulesRouter.get(
  '/:batchId',
  validate({ params: batchIdParamSchema }),
  PriceRulesController.getRules,
);

/**
 * PATCH /price-rules/:id
 * Atualizar uma regra de preço
 * Requer autenticação e papel de produtor
 */
priceRulesRouter.patch(
  '/:id',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: idParamSchema, body: updateRuleSchema }),
  PriceRulesController.updateRule,
);

/**
 * DELETE /price-rules/:id
 * Deletar uma regra de preço (soft delete)
 * Requer autenticação e papel de produtor
 */
priceRulesRouter.delete(
  '/:id',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: idParamSchema }),
  PriceRulesController.deleteRule,
);

/**
 * GET /price-rules/:batchId/availability
 * Verificar disponibilidade de cada tipo de preço (público)
 */
priceRulesRouter.get(
  '/:batchId/availability',
  validate({ params: batchIdParamSchema }),
  PriceRulesController.checkAvailability,
);
