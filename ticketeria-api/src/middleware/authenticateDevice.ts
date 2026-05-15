import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../shared/errors';
import { PosDeviceService } from '../modules/pos-devices/pos-devices.service';

declare global {
  namespace Express {
    interface Request {
      posDevice?: { id: string; posId: string; organizationId: string };
    }
  }
}

export async function authenticateDevice(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.headers['x-device-token'];
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedError('Token de dispositivo não fornecido');
    }
    req.posDevice = await PosDeviceService.authenticateByToken(token);
    next();
  } catch (err) {
    next(err instanceof Error ? err : new UnauthorizedError('Dispositivo não autorizado'));
  }
}
