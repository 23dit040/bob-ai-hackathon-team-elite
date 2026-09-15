import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Returns middleware that validates req.body / req.query / req.params
 * against a Zod schema. Calls next(ZodError) on failure.
 */
export const validate =
  (schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with parsed (coerced) values — cast through unknown first
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
