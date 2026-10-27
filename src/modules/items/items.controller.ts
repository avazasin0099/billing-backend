import { Request, Response, NextFunction } from 'express';
import { ItemsService } from './items.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class ItemsController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await ItemsService.listItems(shopId, req.query);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const item = await ItemsService.getItemById(shopId, req.params.id);
      return sendSuccess(res, item);
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and User context required');
      const item = await ItemsService.createItem(shopId, userId, req.body);
      return sendCreated(res, item, 'Item added successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const item = await ItemsService.updateItem(shopId, req.params.id, req.body);
      return sendSuccess(res, item, 'Item updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const meta = await ItemsService.getCategoriesAndUnits();
      return sendSuccess(res, meta);
    } catch (error) {
      next(error);
    }
  }

  public static async importItems(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop context required');
      const { items } = req.body;
      const result = await ItemsService.bulkImport(shopId, userId, items);
      return sendSuccess(res, result, 'Import completed');
    } catch (error) {
      next(error);
    }
  }
}
