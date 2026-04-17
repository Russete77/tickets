import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import {
  openSession,
  closeSession,
  sellTicket,
  getReport,
  printTicket,
} from './box-office.controller';
import {
  openSessionSchema,
  closeSessionSchema,
  sellTicketSchema,
  eventIdParamSchema,
  sessionIdParamSchema,
  ticketIdParamSchema,
} from './box-office.validators';

/**
 * Router para rotas de caixa (box-office)
 */
const router = Router();

/**
 * Rotas de caixa (apenas produtores/admins)
 */

// POST /box-office/:eventId/open
// Abre uma nova sessão de caixa
router.post(
  '/:eventId/open',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: openSessionSchema }),
  openSession,
);

// POST /box-office/:sessionId/close
// Fecha uma sessão de caixa
router.post(
  '/:sessionId/close',
  authenticate,
  authorize('producer', 'admin'),
  validate({ params: sessionIdParamSchema, body: closeSessionSchema }),
  closeSession,
);

// POST /box-office/:eventId/sell
// Vende ingresso na porta
router.post(
  '/:eventId/sell',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema, body: sellTicketSchema }),
  sellTicket,
);

// GET /box-office/:eventId/report
// Obtém relatório de vendas
router.get(
  '/:eventId/report',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({ params: eventIdParamSchema }),
  getReport,
);

// POST /box-office/:eventId/print-ticket/:ticketId
// Gera dados de impressão para um ingresso
router.post(
  '/:eventId/print-ticket/:ticketId',
  authenticate,
  validate({ params: ticketIdParamSchema }),
  printTicket,
);

export const boxOfficeRouter = router;
