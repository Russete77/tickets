import { Router } from 'express';
import { ProducersController } from './producers.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  registerProducerSchema,
  requestWithdrawalSchema,
  getStatementQuerySchema,
} from './producers.validators';

const router = Router();

/**
 * POST /producers/register
 * Registra novo produtor e cria subconta no Asaas com webhooks
 * Requerido: autenticado
 */
router.post(
  '/register',
  authenticate,
  validate({ body: registerProducerSchema }),
  ProducersController.register,
);

/**
 * GET /producers/me
 * Obtém perfil completo do produtor autenticado
 * Requerido: autenticado, role: producer ou admin
 */
router.get(
  '/me',
  authenticate,
  authorize('producer', 'admin'),
  ProducersController.getProfile,
);

/**
 * GET /producers/me/financial
 * Obtém resumo financeiro com saldo disponível
 * Chama API Asaas com API key da subconta
 * Requerido: autenticado, role: producer ou admin
 */
router.get(
  '/me/financial',
  authenticate,
  authorize('producer', 'admin'),
  ProducersController.getFinancialSummary,
);

/**
 * POST /producers/me/withdrawal
 * Solicita saque/transferência para conta bancária
 * Requerido: autenticado, role: producer ou admin
 * Body: { amount: number }
 */
router.post(
  '/me/withdrawal',
  authenticate,
  authorize('producer', 'admin'),
  validate({ body: requestWithdrawalSchema }),
  ProducersController.requestWithdrawal,
);

/**
 * GET /producers/me/statement
 * Obtém extrato financeiro detalhado
 * Query: dateFrom (YYYY-MM-DD, dateTo (YYYY-MM-DD, limit?, offset?
 * Requerido: autenticado, role: producer ou admin
 */
router.get(
  '/me/statement',
  authenticate,
  authorize('producer', 'admin'),
  validate({ query: getStatementQuerySchema }),
  ProducersController.getStatement,
);

export const producersRouter = router;
