/**
 * Router de ledger — read-only para auditoria/dashboard.
 * Auditoria CTO 2026-05 — gap 4.5
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { requireOrganizationRole } from '../../middleware/organization';
import { asyncHandler } from '../../shared/asyncHandler';
import { prisma } from '../../config/database';
import { LedgerService } from './ledger.service';

export const ledgerRouter = Router();

ledgerRouter.use(authenticate);

/** GET /ledger/:organizationId/accounts — finance+ */
ledgerRouter.get(
  '/:organizationId/accounts',
  requireOrganizationRole('finance'),
  asyncHandler(async (req, res) => {
    const accounts = await prisma.ledgerAccount.findMany({
      where: { organizationId: String(req.params.organizationId) },
      orderBy: [{ eventId: 'desc' }, { type: 'asc' }],
      take: 500,
    });
    res.json({ success: true, data: accounts });
  }),
);

/** GET /ledger/:organizationId/accounts/:accountId/entries — paginação simples */
ledgerRouter.get(
  '/:organizationId/accounts/:accountId/entries',
  requireOrganizationRole('finance'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const cursor = req.query.cursor as string | undefined;

    const account = await prisma.ledgerAccount.findUnique({
      where: { id: String(req.params.accountId) },
    });
    if (!account || account.organizationId !== String(req.params.organizationId)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
      return;
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { accountId: String(req.params.accountId) },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    res.json({
      success: true,
      data: entries,
      meta: { nextCursor: entries.length === limit ? entries[entries.length - 1].id : null },
    });
  }),
);

/** POST /ledger/:organizationId/events/:eventId/close — valida invariantes */
ledgerRouter.post(
  '/:organizationId/events/:eventId/close',
  requireOrganizationRole('finance'),
  asyncHandler(async (req, res) => {
    const issues = await LedgerService.assertEventClosed(String(req.params.eventId));
    res.json({
      success: issues.length === 0,
      data: { eventId: req.params.eventId, issues },
    });
  }),
);
