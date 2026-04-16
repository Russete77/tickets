import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { checkoutRateLimiter } from '../../middleware/rateLimiter';
import { idempotency } from '../../middleware/idempotency';
import { checkoutSchema } from './payments.validators';

const router = Router();

/**
 * POST /payments/checkout
 * Realizar checkout de compra
 */
router.post(
  '/checkout',
  authenticate,
  checkoutRateLimiter,
  idempotency(),
  validate({ body: checkoutSchema }),
  PaymentsController.checkout,
);

/**
 * POST /payments/webhook
 * Webhook do Asaas (sem autenticação)
 */
router.post(
  '/webhook',
  WebhookController.handleAsaasWebhook,
);

export const paymentsRouter = router;
