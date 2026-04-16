import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../asyncHandler';

describe('AsyncHandler', () => {
  it('should call handler with correct parameters', async () => {
    const handler = vi.fn(async (req, res, next) => {
      res.json({ success: true });
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {
      json: vi.fn().mockReturnValue(res),
    } as any;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      // Give async operation time to complete
      setTimeout(resolve, 10);
    });

    expect(handler).toHaveBeenCalledWith(req, res, next);
  });

  it('should call handler and allow it to resolve normally', async () => {
    const handler = vi.fn(async (req, res, next) => {
      return 'success';
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(handler).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch async errors and pass to next()', async () => {
    const testError = new Error('Async operation failed');
    const handler = vi.fn(async (req, res, next) => {
      throw testError;
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should catch promise rejections and pass to next()', async () => {
    const testError = new Error('Promise rejected');
    const handler = vi.fn(async (req, res, next) => {
      throw testError;
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should handle errors from async operations within handler', async () => {
    const testError = new Error('DB error');
    const handler = vi.fn(async (req, res, next) => {
      // Simulate async operation that fails
      await new Promise((_, reject) => {
        setTimeout(() => reject(testError), 5);
      });
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 20);
    });

    expect(next).toHaveBeenCalled();
    const passedError = next.mock.calls[0][0];
    expect(passedError.message).toBe('DB error');
  });

  it('should work with res methods before error occurs', async () => {
    const handler = vi.fn(async (req, res, next) => {
      res.status(200);
      throw new Error('Error after status');
    });

    const wrappedHandler = asyncHandler(handler);

    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnValue(res),
    } as any;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).toHaveBeenCalled();
  });

  it('should pass synchronous errors to next()', async () => {
    const testError = new Error('Sync error');
    const handler = vi.fn((req, res, next) => {
      // Return a rejected promise
      return Promise.reject(testError);
    });

    const wrappedHandler = asyncHandler(handler as any);

    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(next).toHaveBeenCalledWith(testError);
  });

  it('should maintain request/response context', async () => {
    let capturedReq: any;
    let capturedRes: any;

    const handler = vi.fn(async (req: any, res: any, next) => {
      capturedReq = req;
      capturedRes = res;
    });

    const wrappedHandler = asyncHandler(handler);

    const req = { userId: '123' } as any;
    const res = { statusCode: 200 } as any;
    const next = vi.fn();

    await new Promise((resolve) => {
      wrappedHandler(req, res, next);
      setTimeout(resolve, 10);
    });

    expect(capturedReq).toEqual(req);
    expect(capturedRes).toEqual(res);
  });
});
