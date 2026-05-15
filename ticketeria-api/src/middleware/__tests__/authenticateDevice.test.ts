import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateDevice } from '../authenticateDevice';
import { PosDeviceService } from '../../modules/pos-devices/pos-devices.service';
import { UnauthorizedError } from '../../shared/errors';

vi.mock('../../modules/pos-devices/pos-devices.service');

function mockReqRes(token?: string) {
  const req: any = { headers: token ? { 'x-device-token': token } : {} };
  const res: any = {};
  const next = vi.fn();
  return { req, res, next };
}

describe('authenticateDevice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('injeta req.posDevice quando token válido', async () => {
    vi.mocked(PosDeviceService.authenticateByToken).mockResolvedValueOnce({
      id: 'd1', posId: 'pos1', organizationId: 'org1',
    });
    const { req, res, next } = mockReqRes('pd_abc');
    await authenticateDevice(req, res, next);
    expect(req.posDevice).toEqual({ id: 'd1', posId: 'pos1', organizationId: 'org1' });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejeita sem header', async () => {
    const { req, res, next } = mockReqRes();
    await authenticateDevice(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('rejeita token inválido/revogado', async () => {
    vi.mocked(PosDeviceService.authenticateByToken).mockRejectedValueOnce(new UnauthorizedError('x'));
    const { req, res, next } = mockReqRes('pd_bad');
    await authenticateDevice(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
