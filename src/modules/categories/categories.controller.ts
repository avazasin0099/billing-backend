import { Request, Response, NextFunction } from 'express';
import { CategoriesService } from './categories.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class CategoriesController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await CategoriesService.list(shopId, includeInactive);
      return sendSuccess(res, categories);
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const category = await CategoriesService.create(shopId, req.body.name, req.body.businessType);
      return sendCreated(res, category, 'Category added');
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const category = await CategoriesService.rename(shopId, req.params.id, req.body.name);
      return sendSuccess(res, category, 'Category updated');
    } catch (error) {
      next(error);
    }
  }

  public static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await CategoriesService.deactivate(shopId, req.params.id);
      return sendSuccess(res, result, 'Category removed');
    } catch (error) {
      next(error);
    }
  }
}
