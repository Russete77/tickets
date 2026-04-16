import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { CheckinController } from './checkin.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validateCheckinSchema, capacityParamSchema, syncOfflineCheckinsSchema } from './checkin.validators';

/**
 * Rate limiter para check-in: 20 req/s por userId (evita replay em rajada)
 */
const checkinRateLimiter = rateLimit({
  windowMs: 1000, // 1 segundo
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as typeof req & { user?: { userId: string } }).user?.userId || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Muitas tentativas de check-in. Aguarde um momento.',
    },
  },
});

const router = Router();

/**
 * POST /checkin/validate
 * Validar QR code e realizar check-in
 */
router.post(
  '/validate',
  authenticate,
  checkinRateLimiter,
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
