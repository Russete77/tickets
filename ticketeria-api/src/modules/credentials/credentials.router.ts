import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import { CredentialsController } from './credentials.controller';
import {
  createCredentialSchema,
  listCredentialsSchema,
  bulkCreateSchema,
  eventIdParamSchema,
  credentialIdParamSchema,
} from './credentials.validators';

/**
 * Router para rotas de credenciais
 */
const router = Router();

/**
 * Rotas autenticadas (produtor/admin)
 */

// POST /credentials/:eventId
router.post(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: createCredentialSchema }),
  CredentialsController.createCredential,
);

// GET /credentials/:eventId
router.get(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, query: listCredentialsSchema }),
  CredentialsController.listByEvent,
);

// POST /credentials/:eventId/bulk
router.post(
  '/:eventId/bulk',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: bulkCreateSchema }),
  CredentialsController.bulkCreateCredentials,
);

/**
 * Rotas autenticadas (qualquer usuário)
 */

// GET /credentials/:id
router.get(
  '/:id',
  authenticate,
  validate({ params: credentialIdParamSchema }),
  CredentialsController.getCredentialById,
);

// POST /credentials/:id/checkin
router.post(
  '/:id/checkin',
  authenticate,
  validate({ params: credentialIdParamSchema }),
  CredentialsController.checkinCredential,
);

export const credentialsRouter = router;
