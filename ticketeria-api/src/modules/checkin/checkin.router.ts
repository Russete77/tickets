import { Router } from 'express';
import { CheckinController } from './checkin.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validateCheckinSchema, capacityParamSchema, syncOfflineCheckinsSchema } from './checkin.validators';

const router = Router();

/**
 * POST /checkin/validate
 * Validar QR code e realizar check-in
 */
router.post(
  '/validate',
  authenticate,
  validate({ body: validateCheckinSchema }),
  CheckinController.validateQR,
);

/**
 * GET /checkin/capacity/:eventId
 * Obter capacidade em tempo real
 */
router.get(
  '/capacity/:eventId',
  authenticate,
  validate({ params: capacityParamSchema }),
  CheckinController.getCapacity,
);

/**
 * POST /checkin/sync
 * Sincronizar check-ins offline
 */
router.post(
  '/sync',
  authenticate,
  validate({ body: syncOfflineCheckinsSchema }),
  CheckinController.syncOfflineCheckins,
);

export const checkinRouter = router;
