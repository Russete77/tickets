/**
 * Middleware: autenticação por API key (Bearer pk_live_xxxx.secret).
 * Auditoria CTO 2026-05 — gap 4.10
 */
import { Request, Response, NextFunction } from 'express';
import { ApiKeysService, ApiScope } from '../modules/api-keys/api-keys.service';
import { ForbiddenError, UnauthorizedError } from '../shared/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiAuth?: { organizationId: string; keyId: string; scopes: string[] };
    }
  }
}

export function apiKeyAuth(requiredScope?: ApiScope) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Bearer token obrigatório'));
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token.startsWith('pk_')) {
      // Não é API key — deixa o middleware de JWT lidar.
      return next();
    }

    try {
      const auth = await ApiKeysService.authenticate(token);
      req.apiAuth = auth;
      if (requiredScope && !auth.scopes.includes(requiredScope)) {
        return next(
          new ForbiddenError(`Escopo insuficiente. Necessário: ${requiredScope}`),
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
