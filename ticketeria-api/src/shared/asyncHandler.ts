import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * DEPRECATED: This function is no longer needed with Express 5+
 *
 * Express 5 automatically catches errors from async route handlers
 * and passes them to the error handler middleware.
 *
 * Use async route handlers directly without this wrapper:
 * - Before: asyncHandler(async (req, res) => { ... })
 * - After: async (req, res) => { ... }
 *
 * Keeping this for backwards compatibility only.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
