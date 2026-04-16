import { Router } from 'express';
import { authenticate, authorize, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createField,
  listFields,
  updateField,
  deleteField,
  submitResponses,
  getResponses,
  exportResponses,
} from './form-fields.controller';
import {
  createFieldSchema,
  updateFieldSchema,
  submitResponseSchema,
  eventIdParamSchema,
  fieldIdParamSchema,
  ticketIdParamSchema,
} from './form-fields.validators';

/**
 * Router para rotas de campos de formulário
 */
const router = Router();

/**
 * Rotas públicas
 */

// GET /form-fields/:eventId - Listar campos de um evento (público para checkout)
router.get(
  '/:eventId',
  optionalAuth,
  validate({ params: eventIdParamSchema }),
  listFields
);

/**
 * Rotas autenticadas (usuário)
 */

// POST /form-fields/responses/:ticketId - Submeter respostas
router.post(
  '/responses/:ticketId',
  authenticate,
  validate({ params: ticketIdParamSchema, body: submitResponseSchema }),
  submitResponses
);

// GET /form-fields/responses/:ticketId - Obter respostas de um ticket
router.get(
  '/responses/:ticketId',
  authenticate,
  validate({ params: ticketIdParamSchema }),
  getResponses
);

/**
 * Rotas autenticadas (produtor/admin)
 */

// POST /form-fields/:eventId - Criar campo
router.post(
  '/:eventId',
  authenticate,
  authorize('producer'),
  validate({ params: eventIdParamSchema, body: createFieldSchema }),
  createField
);

// PATCH /form-fields/:id - Atualizar campo
router.patch(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: fieldIdParamSchema, body: updateFieldSchema }),
  updateField
);

// DELETE /form-fields/:id - Deletar campo
router.delete(
  '/:id',
  authenticate,
  authorize('producer'),
  validate({ params: fieldIdParamSchema }),
  deleteField
);

// GET /form-fields/:eventId/export - Exportar respostas
router.get(
  '/:eventId/export',
  authenticate,
  authorize('producer'),
  validate({ params: eventIdParamSchema }),
  exportResponses
);

export const formFieldsRouter = router;
