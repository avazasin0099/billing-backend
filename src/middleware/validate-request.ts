import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../shared/errors/app-error';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationIssues = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));
        return next(AppError.badRequest('Validation failed', validationIssues));
      }
      return next(error);
    }
  };
};
