import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PosDeviceService } from '../pos-devices.service';
import { prisma } from '../../../config/database';
import { logAudit } from '../../../shared/audit';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../../../shared/errors';

describe('PosDeviceService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('issuePairCode', () => {
    it('gera código de 8 chars com TTL e audita', async () => {
      vi.mocked(prisma.posDevice.create).mockResolvedValueOnce({ id: 'd1', pairingCode: 'ABCD1234' } as any);
      const r = await PosDeviceService.issuePairCode({
        posId: 'pos1', organizationId: 'org1', label: 'Bar 1', actorId: 'u1',
      });
      expect(r.pairingCode).toMatch(/^[A-Z0-9]{8}$/);
      expect(r.expiresAt).toBeInstanceOf(Date);
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pos_device.pair_code_issued', actorId: 'u1' }),
      );
    });
  });

  describe('redeem', () => {
    it('troca código válido por deviceToken (cru retornado uma vez, só hash salvo)', async () => {
      const future = new Date(Date.now() + 60000);
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', posId: 'pos1', organizationId: 'org1', status: 'pending',
        pairingCodeExpiresAt: future, createdBy: 'u1',
      } as any);
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1', posId: 'pos1' } as any);

      const r = await PosDeviceService.redeem('ABCD1234');

      expect(r.deviceToken).toMatch(/^pd_[A-Za-z0-9_-]+$/);
      expect(r.posId).toBe('pos1');
      const updateArg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(updateArg.data.deviceTokenHash).toBeTruthy();
      expect(updateArg.data.deviceTokenHash).not.toBe(r.deviceToken);
      expect(updateArg.data.status).toBe('active');
      expect(updateArg.data.pairingCode).toBeNull();
    });

    it('rejeita código inexistente', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce(null);
      await expect(PosDeviceService.redeem('NOPE0000')).rejects.toThrow(NotFoundError);
    });

    it('rejeita código expirado', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', status: 'pending', pairingCodeExpiresAt: new Date(Date.now() - 1000),
      } as any);
      await expect(PosDeviceService.redeem('ABCD1234')).rejects.toThrow(BadRequestError);
    });

    it('rejeita device já revogado', async () => {
      vi.mocked(prisma.posDevice.findUnique).mockResolvedValueOnce({
        id: 'd1', status: 'revoked', pairingCodeExpiresAt: new Date(Date.now() + 60000),
      } as any);
      await expect(PosDeviceService.redeem('ABCD1234')).rejects.toThrow(BadRequestError);
    });
  });

  describe('authenticateByToken', () => {
    it('resolve device ativo pelo hash do token', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce({
        id: 'd1', posId: 'pos1', organizationId: 'org1', status: 'active',
      } as any);
      const d = await PosDeviceService.authenticateByToken('pd_abc');
      expect(d.posId).toBe('pos1');
    });

    it('rejeita token de device revogado/inexistente', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce(null);
      await expect(PosDeviceService.authenticateByToken('pd_x')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('revoke', () => {
    it('marca revoked + audita', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce({ id: 'd1', posId: 'pos1' } as any);
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1' } as any);
      await PosDeviceService.revoke({ posId: 'pos1', organizationId: 'org1', deviceId: 'd1', actorId: 'u1' });
      const arg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(arg.data.status).toBe('revoked');
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pos_device.revoked' }),
      );
    });

    it('rejeita device de outro POS/org (NotFound)', async () => {
      vi.mocked(prisma.posDevice.findFirst).mockResolvedValueOnce(null);
      await expect(
        PosDeviceService.revoke({ posId: 'pos1', organizationId: 'org1', deviceId: 'dX', actorId: 'u1' }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('heartbeat', () => {
    it('atualiza lastSeenAt e telemetria', async () => {
      vi.mocked(prisma.posDevice.update).mockResolvedValueOnce({ id: 'd1' } as any);
      await PosDeviceService.heartbeat('d1', { appVersion: '1.0.0', online: true, pendingQueue: 2 });
      const arg = vi.mocked(prisma.posDevice.update).mock.calls[0][0] as any;
      expect(arg.where).toEqual({ id: 'd1' });
      expect(arg.data.lastSeenAt).toBeInstanceOf(Date);
      expect(arg.data.appVersion).toBe('1.0.0');
    });
  });

  describe('listByPos', () => {
    it('lista devices do POS/org', async () => {
      vi.mocked(prisma.posDevice.findMany).mockResolvedValueOnce([{ id: 'd1' }] as any);
      const r = await PosDeviceService.listByPos('pos1', 'org1');
      expect(r).toHaveLength(1);
      const arg = vi.mocked(prisma.posDevice.findMany).mock.calls[0][0] as any;
      expect(arg.where).toEqual({ posId: 'pos1', organizationId: 'org1' });
    });
  });
});
