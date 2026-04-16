import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../validate';
import { BadRequestError } from '../../shared/errors';

describe('Validate Middleware', () => {
  describe('body validation', () => {
    it('should pass valid body and call next()', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });

      const middleware = validate({ body: schema });

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.body.email).toBe('test@example.com');
      expect(req.body.password).toBe('password123');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error for invalid body', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
      });

      const middleware = validate({ body: schema });

      const req = {
        body: { email: 'invalid-email', password: 'short' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should include field details in error when body validation fails', () => {
      const schema = z.object({
        email: z.string().email('Invalid email format'),
        password: z.string().min(6, 'Password too short'),
      });

      const middleware = validate({ body: schema });

      const req = {
        body: { email: 'not-an-email', password: '123' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.details).toBeDefined();
      expect(Array.isArray(error.details)).toBe(true);
      expect(error.details.length).toBeGreaterThan(0);
    });
  });

  describe('query validation', () => {
    it('should pass valid query and call next()', () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
        limit: z.coerce.number().min(1).max(100),
      });

      const middleware = validate({ query: schema });

      const req = {
        query: { page: '1', limit: '20' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.query.page).toBe(1);
      expect(req.query.limit).toBe(20);
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error for invalid query', () => {
      const schema = z.object({
        page: z.coerce.number().min(1),
      });

      const middleware = validate({ query: schema });

      const req = {
        query: { page: 'invalid' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('params validation', () => {
    it('should pass valid params and call next()', () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const middleware = validate({ params: schema });

      const req = {
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(req.params.id).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with error for invalid params', () => {
      const schema = z.object({
        id: z.string().uuid(),
      });

      const middleware = validate({ params: schema });

      const req = {
        params: { id: 'not-a-uuid' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('combined validation', () => {
    it('should validate body, query, and params together', () => {
      const middleware = validate({
        body: z.object({ name: z.string() }),
        query: z.object({ filter: z.string().optional() }),
        params: z.object({ id: z.string().uuid() }),
      });

      const req = {
        body: { name: 'Test' },
        query: { filter: 'active' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should fail if any validation fails', () => {
      const middleware = validate({
        body: z.object({ name: z.string() }),
        query: z.object({ page: z.coerce.number() }),
        params: z.object({ id: z.string().uuid() }),
      });

      const req = {
        body: { name: 'Test' },
        query: { page: 'not-a-number' },
        params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(BadRequestError);
    });
  });

  describe('no validation schemas', () => {
    it('should call next when no schemas provided', () => {
      const middleware = validate({});

      const req = {
        body: { anything: 'goes' },
        query: {},
        params: {},
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('error details', () => {
    it('should provide field-level error details', () => {
      const schema = z.object({
        email: z.string().email('Invalid email'),
        age: z.number().min(18, 'Must be at least 18'),
      });

      const middleware = validate({ body: schema });

      const req = {
        body: { email: 'invalid', age: 10 },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      expect(error.details).toBeDefined();

      const details = error.details as Array<{ field: string; message: string }>;
      expect(details.some((d) => d.field.includes('email'))).toBe(true);
      expect(details.some((d) => d.field.includes('age'))).toBe(true);
    });

    it('should flatten nested field paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            age: z.number().positive(),
          }),
        }),
      });

      const middleware = validate({ body: schema });

      const req = {
        body: { user: { profile: { age: -5 } } },
      } as any;

      const res = {} as Response;
      const next = vi.fn();

      middleware(req, res, next);

      const error = next.mock.calls[0][0];
      const details = error.details as Array<{ field: string }>;
      expect(details[0].field).toBe('user.profile.age');
    });
  });
});
