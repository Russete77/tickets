import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { checkoutRateLimiter } from '../../middleware/rateLimiter';
import { idempotency } from '../../middleware/idempotency';
import { flashSaleQueue } from '../../middleware/flashSaleQueue';
import { checkoutSchema } from './payments.validators';

const router = Router();

/**
 * POST /payments/checkout
 * Realizar checkout de compra
 * Flash sale queue: if active for event, user enters virtual queue
 */
router.post(
  '/checkout',
  authenticate,
  checkoutRateLimiter,
  flashSaleQueue(),
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
