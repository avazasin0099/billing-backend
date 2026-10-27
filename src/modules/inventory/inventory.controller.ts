import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service';
import { sendSuccess } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class InventoryController {
  public static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const summary = await InventoryService.getInventorySummary(shopId);
      return sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }

  public static async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const alerts = await InventoryService.getLowStockAlerts(shopId);
      return sendSuccess(res, alerts);
    } catch (error) {
      next(error);
    }
  }

  public static async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await InventoryService.getStockMovements(shopId, req.query);
      return sendSuccess(res, result.movements, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const result = await InventoryService.adjustStock(shopId, userId, req.body);
      return sendSuccess(res, result, 'Stock count adjusted successfully');
    } catch (error) {
      next(error);
    }
  }
}
