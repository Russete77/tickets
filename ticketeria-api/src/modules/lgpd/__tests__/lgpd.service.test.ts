import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LgpdService } from '../lgpd.service';
import { prisma } from '../../../config/database';
import { logAudit } from '../../../shared/audit';
import {
  NotFoundError,
  UnauthorizedError,
  BadRequestError,
} from '../../../shared/errors';
import { createMockUser } from '../../../tests/helpers';

describe('LgpdService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collectUserData', () => {
    it('agrega profile + tickets + orders + transactions + audit', async () => {
      const user = createMockUser();
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);
      vi.mocked(prisma.ticket.findMany).mockResolvedValueOnce([{ id: 't1' }] as any);
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([{ id: 'o1' }] as any);
      vi.mocked(prisma.auditLog.findMany).mockResolvedValueOnce([{ action: 'x' }] as any);
      vi.mocked(prisma.cashlessWallet.findMany).mockResolvedValueOnce([{ id: 'w1' }] as any);
      vi.mocked(prisma.cashlessTransaction.findMany).mockResolvedValueOnce([{ id: 'tx1' }] as any);

      const result = await LgpdService.collectUserData(user.id);

      expect(result.profile).toBeDefined();
      expect(result.tickets).toHaveLength(1);
      expect(result.orders).toHaveLength(1);
      expect(result.transactions).toHaveLength(1);
      expect(result.auditTrail).toHaveLength(1);
    });

    it('lança NotFound se usuário não existe', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
      await expect(LgpdService.collectUserData('ghost')).rejects.toThrow(NotFoundError);
    });
  });

  describe('anonymizeUser', () => {
    it('anonimiza com senha correta (sem 2FA) e audita', async () => {
      const user = createMockUser({ passwordHash: 'hashed_senha123', totpEnabled: false });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ id: user.id } as any);

      const result = await LgpdService.anonymizeUser(user.id, 'senha123', undefined);

      expect(result.anonymized).toBe(true);
      const updateArg = vi.mocked(prisma.user.update).mock.calls[0][0] as any;
      expect(updateArg.data.email).toContain('redacted+');
      expect(updateArg.data.name).toContain('[REDACTED-');
      expect(updateArg.data.phone).toBeNull();
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'lgpd.user_anonymized', actorId: user.id }),
      );
    });

    it('rejeita senha incorreta', async () => {
      const user = createMockUser({ passwordHash: 'hashed_certa' });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);

      await expect(
        LgpdService.anonymizeUser(user.id, 'errada', undefined),
      ).rejects.toThrow(UnauthorizedError);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('exige 2FA quando totpEnabled', async () => {
      const user = createMockUser({ passwordHash: 'hashed_ok', totpEnabled: true, totpSecret: 'S' });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);

      await expect(
        LgpdService.anonymizeUser(user.id, 'ok', undefined),
      ).rejects.toThrow(BadRequestError);
    });

    it('rejeita 2FA inválido', async () => {
      const user = createMockUser({ passwordHash: 'hashed_ok', totpEnabled: true, totpSecret: 'S' });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);

      await expect(
        LgpdService.anonymizeUser(user.id, 'ok', '000000'),
      ).rejects.toThrow(UnauthorizedError);
    });

    it('aceita 2FA válido (código 123456 do mock)', async () => {
      const user = createMockUser({ passwordHash: 'hashed_ok', totpEnabled: true, totpSecret: 'S' });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);
      vi.mocked(prisma.user.update).mockResolvedValueOnce({ id: user.id } as any);

      const result = await LgpdService.anonymizeUser(user.id, 'ok', '123456');
      expect(result.anonymized).toBe(true);
    });

    it('é idempotente: conta já anonimizada lança BadRequest', async () => {
      const user = createMockUser({ email: `redacted+${'x'}@anonymized.local` });
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(user as any);

      await expect(
        LgpdService.anonymizeUser(user.id, 'qualquer', undefined),
      ).rejects.toThrow(BadRequestError);
    });
  });
});
