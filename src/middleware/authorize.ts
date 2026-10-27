import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../shared/constants';
import { AppError } from '../shared/errors/app-error';

export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized('User must be authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Access forbidden for role ${req.user.role}. Required: ${allowedRoles.join(', ')}`)
      );
    }

    return next();
  };
};
