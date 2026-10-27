import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../shared/errors/app-error';
import { User, Shop, UserShopMembership } from '../database/associations';
import { UserRole } from '../shared/constants';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  shopId: string;
  businessId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      shopId?: string;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Authentication token missing or invalid'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: UserRole;
      shopId?: string;
      businessId: string;
    };

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return next(AppError.unauthorized('User not found or inactive'));
    }

    // Determine active shop: from header, or token, or primary shop membership
    let activeShopId = (req.headers['x-shop-id'] as string) || decoded.shopId;

    if (!activeShopId) {
      const membership = await UserShopMembership.findOne({
        where: { userId: user.id, isActive: true },
      });
      if (membership) {
        activeShopId = membership.shopId;
      } else {
        const firstShop = await Shop.findOne({ where: { businessId: user.businessId } });
        activeShopId = firstShop?.id;
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      shopId: activeShopId || '',
      businessId: user.businessId,
    };
    req.shopId = activeShopId;

    return next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token has expired'));
    }
    return next(AppError.unauthorized('Invalid authentication token'));
  }
};
