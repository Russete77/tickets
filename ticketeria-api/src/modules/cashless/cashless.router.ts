import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { requireEventOwnership } from '../../middleware/eventOwnership';
import { validate } from '../../middleware/validate';
import { CashlessController } from './cashless.controller';
import { categoriesRouter } from './categories/categories.router';
import {
  eventIdParamSchema,
  walletIdParamSchema,
  transactionIdParamSchema,
  createCashlessConfigSchema,
  updateCashlessConfigSchema,
  createWalletSchema,
  topupWalletSchema,
  blockWalletSchema,
  requestRefundSchema,
  chargeWalletSchema,
  reverseTransactionSchema,
  walletTransactionsQuerySchema,
  dashboardQuerySchema,
  topProductsQuerySchema,
  hourlyStatsQuerySchema,
} from './cashless.validators';

const router = Router();

/**
 * ============================================
 * Config Routes (Producer/Admin)
 * ============================================
 */

/**
 * POST /cashless/:eventId/config
 * Criar configuração de cashless para evento (produtor/admin)
 */
router.post(
  '/:eventId/config',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    body: createCashlessConfigSchema,
  }),
  CashlessController.createConfig
);

/**
 * GET /cashless/:eventId/config
 * Obter configuração de cashless
 */
router.get(
  '/:eventId/config',
  validate({
    params: eventIdParamSchema,
  }),
  CashlessController.getConfig
);

/**
 * PATCH /cashless/:eventId/config
 * Atualizar configuração de cashless (produtor/admin)
 */
router.patch(
  '/:eventId/config',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    body: updateCashlessConfigSchema,
  }),
  CashlessController.updateConfig
);

/**
 * ============================================
 * Wallet Routes (Authenticated Users)
 * ============================================
 */

/**
 * POST /cashless/wallets
 * Criar nova carteira digital
 */
router.post(
  '/wallets',
  authenticate,
  validate({
    body: createWalletSchema,
  }),
  CashlessController.createWallet
);

/**
 * GET /cashless/wallets/me/:eventId
 * Obter carteira do usuário logado para um evento
 */
router.get(
  '/wallets/me/:eventId',
  authenticate,
  validate({
    params: eventIdParamSchema,
  }),
  CashlessController.getMyWallet
);

/**
 * POST /cashless/wallets/:id/topup
 * Realizar recarga na carteira
 */
router.post(
  '/wallets/:id/topup',
  authenticate,
  validate({
    params: walletIdParamSchema,
    body: topupWalletSchema,
  }),
  CashlessController.topupWallet
);

/**
 * POST /cashless/wallets/:id/block
 * Bloquear carteira (usuário ou admin)
 */
router.post(
  '/wallets/:id/block',
  authenticate,
  validate({
    params: walletIdParamSchema,
    body: blockWalletSchema,
  }),
  CashlessController.blockWallet
);

/**
 * POST /cashless/wallets/:id/refund
 * Solicitar reembolso
 */
router.post(
  '/wallets/:id/refund',
  authenticate,
  validate({
    params: walletIdParamSchema,
    body: requestRefundSchema,
  }),
  CashlessController.requestRefund
);

/**
 * GET /cashless/wallets/:id/balance
 * Obter saldo da carteira
 */
router.get(
  '/wallets/:id/balance',
  validate({
    params: walletIdParamSchema,
  }),
  CashlessController.getWalletBalance
);

/**
 * GET /cashless/wallets/:id/transactions
 * Obter transações da carteira com paginação por cursor
 */
router.get(
  '/wallets/:id/transactions',
  validate({
    params: walletIdParamSchema,
    query: walletTransactionsQuerySchema,
  }),
  CashlessController.getWalletTransactions
);

/**
 * ============================================
 * Transaction Routes (Authenticated)
 * ============================================
 */

/**
 * POST /cashless/transactions/charge
 * Efetuar cobrança (compra)
 */
router.post(
  '/transactions/charge',
  authenticate,
  validate({
    body: chargeWalletSchema,
  }),
  CashlessController.chargeWallet
);

/**
 * POST /cashless/transactions/reverse
 * Reverter transação
 */
router.post(
  '/transactions/reverse',
  authenticate,
  validate({
    body: reverseTransactionSchema,
  }),
  CashlessController.reverseTransaction
);

/**
 * GET /cashless/transactions/:id
 * Obter detalhes da transação
 */
router.get(
  '/transactions/:id',
  authenticate,
  validate({
    params: transactionIdParamSchema,
  }),
  CashlessController.getTransaction
);

/**
 * ============================================
 * Dashboard Routes (Producer/Admin)
 * ============================================
 */

/**
 * GET /cashless/:eventId/dashboard
 * Obter dashboard com estatísticas de cashless
 */
router.get(
  '/:eventId/dashboard',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    query: dashboardQuerySchema,
  }),
  CashlessController.getDashboard
);

/**
 * GET /cashless/:eventId/transactions
 * Listar transações do evento
 */
router.get(
  '/:eventId/transactions',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    query: dashboardQuerySchema,
  }),
  CashlessController.getEventTransactions
);

/**
 * GET /cashless/:eventId/top-products
 * Obter produtos mais vendidos
 */
router.get(
  '/:eventId/top-products',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    query: topProductsQuerySchema,
  }),
  CashlessController.getTopProducts
);

/**
 * GET /cashless/:eventId/revenue-by-pos
 * Obter receita agrupada por ponto de venda
 */
router.get(
  '/:eventId/revenue-by-pos',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    query: dashboardQuerySchema,
  }),
  CashlessController.getRevenueByPos
);

/**
 * GET /cashless/:eventId/hourly-stats
 * Obter estatísticas por hora
 */
router.get(
  '/:eventId/hourly-stats',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
    query: hourlyStatsQuerySchema,
  }),
  CashlessController.getHourlyStats
);

/**
 * GET /cashless/:eventId/export
 * Exportar dados de cashless em CSV ou JSON
 */
router.get(
  '/:eventId/export',
  authenticate,
  authorize('producer', 'admin'),
  requireEventOwnership,
  validate({
    params: eventIdParamSchema,
  }),
  CashlessController.exportData
);

router.use('/orgs', categoriesRouter);

export const cashlessRouter = router;

// ============================================================
// POS endpoints — Auditoria CTO 2026-05 (gap 4.4)
// Necessários para o app mobile POS funcionar.
// ============================================================
import { prisma as prismaPos } from '../../config/database';
import bcryptPos from 'bcryptjs';

/** GET /cashless/pos/:posId/products — lista catálogo do POS */
router.get('/pos/:posId/products', authenticate, asyncHandler(async (req, res) => {
  const products = await prismaPos.pOSProduct.findMany({
    where: { posId: String(req.params.posId), isAvailable: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json({ success: true, data: products });
}));

/** POST /cashless/pos/:posId/operator/login — valida PIN do operador */
router.post('/pos/:posId/operator/login', authenticate, asyncHandler(async (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!pin) {
    res.status(400).json({ success: false, error: { code: 'PIN_REQUIRED', message: 'PIN é obrigatório' } });
    return;
  }
  const operators = await prismaPos.pOSOperator.findMany({
    where: { posId: String(req.params.posId), isActive: true },
  });
  for (const op of operators) {
    // PIN é armazenado em texto puro (curto) ou bcrypt — testa ambos
    if (op.pin === pin || bcryptPos.compareSync(pin, op.pin)) {
      res.json({ success: true, data: { valid: true, operatorId: op.userId } });
      return;
    }
  }
  res.status(401).json({ success: false, error: { code: 'INVALID_PIN', message: 'PIN inválido' } });
}));

/** GET /cashless/wallet/by-code/:code — resolve wallet por walletCode ou nfcTagId */
router.get('/wallet/by-code/:code', authenticate, asyncHandler(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const wallet = await prismaPos.cashlessWallet.findFirst({
    where: {
      OR: [
        { walletCode: code },
        { nfcTagId: code.replace(/[^0-9A-F]/g, '') },
      ],
      status: 'wallet_active',
    },
    include: { user: { select: { name: true } } },
  });
  if (!wallet) {
    res.status(404).json({ success: false, error: { code: 'WALLET_NOT_FOUND', message: 'Wallet não encontrada' } });
    return;
  }
  res.json({
    success: true,
    data: {
      id: wallet.id,
      walletCode: wallet.walletCode,
      balanceCents: wallet.balanceCents,
      status: wallet.status,
      userName: wallet.user.name,
    },
  });
}));
