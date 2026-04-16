import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError base class', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_ERROR');
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', issue: 'Invalid format' };
      const error = new AppError('Test error', 400, 'TEST_ERROR', details);

      expect(error.details).toEqual(details);
    });

    it('should have undefined details when not provided', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');

      expect(error.details).toBeUndefined();
    });
  });

  describe('BadRequestError', () => {
    it('should have statusCode 400', () => {
      const error = new BadRequestError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should use default message when not provided', () => {
      const error = new BadRequestError();

      expect(error.message).toBe('Requisição inválida');
    });

    it('should use custom message when provided', () => {
      const error = new BadRequestError('Custom message');

      expect(error.message).toBe('Custom message');
    });

    it('should include details', () => {
      const details = { field: 'email' };
      const error = new BadRequestError('Invalid', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('UnauthorizedError', () => {
    it('should have statusCode 401', () => {
      const error = new UnauthorizedError('Access denied');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should use default message when not provided', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Não autorizado');
    });

    it('should use custom message when provided', () => {
      const error = new UnauthorizedError('Custom unauthorized message');

      expect(error.message).toBe('Custom unauthorized message');
    });
  });

  describe('ForbiddenError', () => {
    it('should have statusCode 403', () => {
      const error = new ForbiddenError('Access forbidden');

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should use default message when not provided', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Acesso negado');
    });

    it('should use custom message when provided', () => {
      const error = new ForbiddenError('You cannot access this resource');

      expect(error.message).toBe('You cannot access this resource');
    });
  });

  describe('NotFoundError', () => {
    it('should have statusCode 404', () => {
      const error = new NotFoundError('Resource not found');

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use default message when not provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Recurso não encontrado');
    });

    it('should use custom message when provided', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('should have statusCode 409', () => {
      const error = new ConflictError('Resource conflict');

      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should use default message when not provided', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Conflito de recursos');
    });

    it('should use custom message when provided', () => {
      const error = new ConflictError('Email already exists');

      expect(error.message).toBe('Email already exists');
    });
  });

  describe('TooManyRequestsError', () => {
    it('should have statusCode 429', () => {
      const error = new TooManyRequestsError();

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('TOO_MANY_REQUESTS');
    });

    it('should use default message when not provided', () => {
      const error = new TooManyRequestsError();

      expect(error.message).toBe('Muitas requisições. Tente novamente mais tarde.');
    });

    it('should use custom message when provided', () => {
      const error = new TooManyRequestsError('Rate limit exceeded');

      expect(error.message).toBe('Rate limit exceeded');
    });
  });

  describe('InternalError', () => {
    it('should have statusCode 500', () => {
      const error = new InternalError('Server error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should use default message when not provided', () => {
      const error = new InternalError();

      expect(error.message).toBe('Erro interno do servidor');
    });

    it('should use custom message when provided', () => {
      const error = new InternalError('Database connection failed');

      expect(error.message).toBe('Database connection failed');
    });
  });

  describe('Error hierarchy', () => {
    it('all error classes should extend AppError', () => {
      const errors = [
        new BadRequestError(),
        new UnauthorizedError(),
        new ForbiddenError(),
        new NotFoundError(),
        new ConflictError(),
        new TooManyRequestsError(),
        new InternalError(),
      ];

      errors.forEach((error) => {
        expect(error instanceof AppError).toBe(true);
        expect(error instanceof Error).toBe(true);
      });
    });

    it('each error should have a unique status code', () => {
      const errors = {
        BadRequest: new BadRequestError(),
        Unauthorized: new UnauthorizedError(),
        Forbidden: new ForbiddenError(),
        NotFound: new NotFoundError(),
        Conflict: new ConflictError(),
        TooManyRequests: new TooManyRequestsError(),
        Internal: new InternalError(),
      };

      const statusCodes = Object.values(errors).map((e) => e.statusCode);
      const uniqueStatusCodes = new Set(statusCodes);

      expect(uniqueStatusCodes.size).toBe(statusCodes.length);
    });
  });
});
