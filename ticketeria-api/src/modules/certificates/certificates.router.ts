import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { CertificatesController } from './certificates.controller';
import {
  createCertificateSchema,
  listCertificatesSchema,
  eventIdParamSchema,
  certificateIdParamSchema,
  codeParamSchema,
} from './certificates.validators';

/**
 * Router para rotas de certificados
 */
const router = Router();

/**
 * Rotas autenticadas (produtor/admin)
 */

// POST /certificates/:eventId
router.post(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema, body: createCertificateSchema }),
  CertificatesController.issueCertificate,
);

// GET /certificates/:eventId
router.get(
  '/:eventId',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: eventIdParamSchema, query: listCertificatesSchema }),
  CertificatesController.listByEvent,
);

/**
 * Rotas públicas (sem autenticação)
 */

// GET /certificates/verify/:code
router.get('/verify/:code', validate({ params: codeParamSchema }), CertificatesController.verifyCertificate);

/**
 * Rotas autenticadas (qualquer usuário)
 */

// GET /certificates/:id
router.get(
  '/:id',
  authenticate,
  validate({ params: certificateIdParamSchema }),
  CertificatesController.getCertificateById,
);

// GET /certificates/:id/pdf
router.get(
  '/:id/pdf',
  authenticate,
  validate({ params: certificateIdParamSchema }),
  CertificatesController.generatePdf,
);

export const certificatesRouter = router;
