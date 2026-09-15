import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers so uncaught promise rejections propagate to
 * the centralized error handler instead of crashing the process.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
