import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate } from '../../middleware/auth';
import { authenticateDevice } from '../../middleware/authenticateDevice';
import { validate } from '../../middleware/validate';
import { prisma } from '../../config/database';
import { UnauthorizedError } from '../../shared/errors';
import { PosDeviceService } from './pos-devices.service';
import {
  issuePairCodeSchema, posIdParamSchema, deviceParamsSchema,
  redeemSchema, heartbeatSchema, operatorLoginSchema,
} from './pos-devices.validators';

const router = Router();

/**
 * Helper: resolve organizationId from POS (via POS -> Event -> organizationId).
 * Returns null when POS does not exist.
 */
async function resolvePosOrg(posId: string): Promise<{ organizationId: string } | null> {
  const pos = await prisma.pointOfSale.findUnique({
    where: { id: posId },
    include: { event: { select: { organizationId: true } } },
  });
  if (!pos) return null;
  return { organizationId: pos.event.organizationId };
}

// --- Admin (autenticação de usuário) ---

// Express 5: rejeições de async handlers propagam nativamente ao error middleware — asyncHandler não é necessário.
router.post(
  '/pos/:posId/devices/pair-code',
  authenticate,
  validate({ params: posIdParamSchema, body: issuePairCodeSchema }),
  async (req: Request, res: Response) => {
    const posInfo = await resolvePosOrg(req.params.posId as string);
    if (!posInfo) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    const r = await PosDeviceService.issuePairCode({
      posId: req.params.posId as string,
      organizationId: posInfo.organizationId,
      label: req.body.label,
      actorId: req.user!.userId,
    });
    res.status(201).json({ success: true, data: r });
  },
);

router.get(
  '/pos/:posId/devices',
  authenticate,
  validate({ params: posIdParamSchema }),
  async (req: Request, res: Response) => {
    const posInfo = await resolvePosOrg(req.params.posId as string);
    if (!posInfo) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    const devices = await PosDeviceService.listByPos(req.params.posId as string, posInfo.organizationId);
    res.json({ success: true, data: devices });
  },
);

router.delete(
  '/pos/:posId/devices/:deviceId',
  authenticate,
  validate({ params: deviceParamsSchema }),
  async (req: Request, res: Response) => {
    const posInfo = await resolvePosOrg(req.params.posId as string);
    if (!posInfo) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }); return; }
    await PosDeviceService.revoke({
      posId: req.params.posId as string,
      organizationId: posInfo.organizationId,
      deviceId: req.params.deviceId as string,
      actorId: req.user!.userId,
    });
    res.status(204).end();
  },
);

// --- Device (sem auth de usuário) ---

router.post(
  '/redeem',
  validate({ body: redeemSchema }),
  async (req: Request, res: Response) => {
    const r = await PosDeviceService.redeem(req.body.pairingCode, { ipAddress: req.ip });
    res.json({ success: true, data: r });
  },
);

router.get('/me', authenticateDevice, async (req: Request, res: Response) => {
  const pos = await prisma.pointOfSale.findUnique({
    where: { id: req.posDevice!.posId },
    select: { id: true, name: true, eventId: true },
  });
  res.json({ success: true, data: { device: req.posDevice, pos } });
});

router.post(
  '/heartbeat',
  authenticateDevice,
  validate({ body: heartbeatSchema }),
  async (req: Request, res: Response) => {
    await PosDeviceService.heartbeat(req.posDevice!.id, { appVersion: req.body.appVersion }, req.ip);
    res.json({ success: true });
  },
);

// Operator login dentro do device (PIN -> sessão de turno)
router.post(
  '/operator-login',
  authenticateDevice,
  validate({ body: operatorLoginSchema }),
  async (req: Request, res: Response) => {
    const operators = await prisma.pOSOperator.findMany({
      where: {
        posId: req.posDevice!.posId,
        isActive: true,
        isArchived: false,
        pinHash: { not: null },
      },
    });
    for (const op of operators) {
      if (op.pinHash && (await bcrypt.compare(req.body.pin, op.pinHash))) {
        res.json({ success: true, data: { operatorId: op.id, name: op.name } });
        return;
      }
    }
    throw new UnauthorizedError('PIN inválido');
  },
);

export default router;
