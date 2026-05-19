import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { lgpdRateLimiter } from '../../middleware/rateLimiter';
import { logAudit, AuditActions } from '../../shared/audit';
import { LgpdService } from './lgpd.service';
import { anonymizeAccountSchema, AnonymizeAccountInput } from './lgpd.validators';
import { lgpdExportQueue } from '../../jobs/queue';

const router = Router();

/**
 * GET /lgpd/me/export
 * Enfileira a geração assíncrona do ZIP de dados pessoais.
 * O usuário recebe o link por email (válido 24h).
 */
router.get('/me/export', authenticate, lgpdRateLimiter, async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  await logAudit({
    actorId: userId,
    action: AuditActions.LGPD_DATA_EXPORT_REQUESTED,
    entityType: 'user',
    entityId: userId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  await lgpdExportQueue.add('export', { userId });

  res.status(202).json({
    success: true,
    message:
      'Solicitação recebida. Você receberá um email com o link de download em instantes.',
  });
});

/**
 * DELETE /lgpd/me
 * Anonimiza a conta (irreversível). Exige senha + 2FA (se ativo).
 */
router.delete(
  '/me',
  authenticate,
  lgpdRateLimiter,
  validate({ body: anonymizeAccountSchema }),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { password, totpCode } = req.body as AnonymizeAccountInput;

    const result = await LgpdService.anonymizeUser(userId, password, totpCode, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: result,
      message: 'Sua conta foi anonimizada. Esta ação é irreversível.',
    });
  },
);

export default router;
