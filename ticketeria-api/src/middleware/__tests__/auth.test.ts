import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, optionalAuth, AuthPayload } from '../auth';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors';
import { UserRole } from '../../generated/prisma/client';
import { jwtKeys } from '../../config/jwt';

// Mock jwt is already set up in setup.ts

describe('Auth Middleware', () => {
  describe('authenticate', () => {
    it('should set req.user and call next() with valid token', () => {
      const payload: AuthPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.consumer,
      };

      const token = `token_${JSON.stringify(payload)}`;

      const req = {
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      expect(() => authenticate(req, res, next)).not.toThrow();
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('user123');
      expect(next).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError when Authorization header is missing', () => {
      const req = {
        headers: {},
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError when Authorization header does not start with Bearer', () => {
      const req = {
        headers: { authorization: 'Basic abc123' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError with invalid token', () => {
      const req = {
        headers: { authorization: 'Bearer invalid_token' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError with expired token', () => {
      const req = {
        headers: { authorization: 'Bearer token_expired' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      // Mock jwt.verify to throw TokenExpiredError
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      expect(() => authenticate(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should extract user info from token payload', () => {
      const payload: AuthPayload = {
        userId: 'user456',
        email: 'john@example.com',
        role: UserRole.producer,
      };

      const token = `token_${JSON.stringify(payload)}`;

      const req = {
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      authenticate(req, res, next);

      expect(req.user?.userId).toBe('user456');
      expect(req.user?.email).toBe('john@example.com');
      expect(req.user?.role).toBe(UserRole.producer);
    });

    it('should verify token with RS256 public key and algorithms option', () => {
      const payload: AuthPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.consumer,
      };

      const token = `token_${JSON.stringify(payload)}`;

      const req = {
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith(
        token,
        jwtKeys.publicKey,
        { algorithms: ['RS256'] }
      );
    });
  });

  describe('authorize', () => {
    it('should call next() when user has required role', () => {
      const req = {
        user: {
          userId: 'user123',
          email: 'test@example.com',
          role: UserRole.producer,
        },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorize(UserRole.producer);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should call next() when user has one of multiple required roles', () => {
      const req = {
        user: {
          userId: 'user123',
          email: 'test@example.com',
          role: UserRole.admin,
        },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorize(UserRole.consumer, UserRole.admin);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when user does not have required role', () => {
      const req = {
        user: {
          userId: 'user123',
          email: 'test@example.com',
          role: UserRole.consumer,
        },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorize(UserRole.producer);

      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);
    });

    it('should throw UnauthorizedError when req.user is undefined', () => {
      const req = {
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      const middleware = authorize(UserRole.producer);

      expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should accept multiple roles and check all', () => {
      const req = {
        user: {
          userId: 'user123',
          email: 'test@example.com',
          role: UserRole.consumer,
        },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      // Should fail - consumer not in list
      const middleware = authorize(UserRole.producer, UserRole.admin);
      expect(() => middleware(req, res, next)).toThrow(ForbiddenError);

      // Should pass - consumer is in list
      const middleware2 = authorize(UserRole.producer, UserRole.consumer, UserRole.admin);
      next.mockClear();
      middleware2(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should set req.user when valid token is provided', () => {
      const payload: AuthPayload = {
        userId: 'user123',
        email: 'test@example.com',
        role: UserRole.consumer,
      };

      const token = `token_${JSON.stringify(payload)}`;

      const req = {
        headers: { authorization: `Bearer ${token}` },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe('user123');
      expect(next).toHaveBeenCalled();
    });

    it('should call next() without setting req.user when no Authorization header', () => {
      const req = {
        headers: {},
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should call next() without setting req.user when token is invalid', () => {
      const req = {
        headers: { authorization: 'Bearer invalid_token' },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should not throw error when Authorization header format is wrong', () => {
      const req = {
        headers: { authorization: 'InvalidFormat' },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      expect(() => optionalAuth(req, res, next)).not.toThrow();
      expect(next).toHaveBeenCalled();
    });

    it('should silently ignore expired tokens', () => {
      vi.mocked(jwt.verify).mockImplementationOnce(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });

      const req = {
        headers: { authorization: 'Bearer token_expired' },
        user: undefined,
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      optionalAuth(req, res, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });
});
