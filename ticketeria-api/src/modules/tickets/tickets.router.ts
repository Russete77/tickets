import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  getMyTickets,
  getTicket,
  getTicketQR,
  getTicketTotpSecret,
  rotateTicketTotp,
  initiateTransfer,
  confirmTransfer,
  getTicketHistory,
  validateQR,
} from './tickets.controller';
import {
  ticketIdParamSchema,
  transferIdParamSchema,
  transferTicketSchema,
  confirmTransferSchema,
  validateQRSchema,
} from './tickets.validators';

/**
 * Router para rotas de ingressos
 */
const router = Router();

/**
 * Rotas autenticadas (consumidor)
 */

// GET /tickets/mine
router.get('/mine', authenticate, getMyTickets);

// GET /tickets/history
router.get('/history', authenticate, getTicketHistory);

// GET /tickets/:id
router.get('/:id', authenticate, validate({ params: ticketIdParamSchema }), getTicket);

// GET /tickets/:id/qr
router.get('/:id/qr', authenticate, validate({ params: ticketIdParamSchema }), getTicketQR);

// GET /tickets/:id/totp-secret — expõe segredo ao titular (audit logged)
router.get(
  '/:id/totp-secret',
  authenticate,
  validate({ params: ticketIdParamSchema }),
  getTicketTotpSecret,
);

// POST /tickets/:id/rotate-totp — rotaciona o segredo TOTP (auto-serve em caso de suspeita)
router.post(
  '/:id/rotate-totp',
  authenticate,
  validate({ params: ticketIdParamSchema }),
  rotateTicketTotp,
);

// POST /tickets/:id/transfer
router.post(
  '/:id/transfer',
  authenticate,
  validate({ params: ticketIdParamSchema, body: transferTicketSchema }),
  initiateTransfer,
);

// POST /tickets/transfers/:id/confirm
router.post(
  '/transfers/:id/confirm',
  authenticate,
  validate({ params: transferIdParamSchema, body: confirmTransferSchema }),
  confirmTransfer,
);

/**
 * Rota de validação (operador de checkin)
 */

// POST /tickets/validate-qr
router.post('/validate-qr', authenticate, validate({ body: validateQRSchema }), validateQR);

export default router;
