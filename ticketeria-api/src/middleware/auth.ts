import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtKeys } from '../config/jwt';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';
import { UserRole } from '../generated/prisma/client';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware de autenticacao JWT (RS256)
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de acesso nao fornecido');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as AuthPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expirado');
    }
    throw new UnauthorizedError('Token invalido');
  }
}

/**
 * Middleware de autorizacao por role
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Nao autenticado');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Sem permissao para acessar este recurso');
    }

    next();
  };
}

/**
 * Middleware opcional de autenticacao (nao exige token, mas extrai se presente)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const payload = jwt.verify(token, jwtKeys.publicKey, { algorithms: ['RS256'] }) as AuthPayload;
      req.user = payload;
    } catch {
      // Token invalido mas e opcional - continua sem user
    }
  }

  next();
}
