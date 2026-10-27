import { Request, Response, NextFunction } from 'express';
import { PurchasesService } from './purchases.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class PurchasesController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const purchase = await PurchasesService.createPurchase(shopId, userId, req.body);
      return sendCreated(res, purchase, 'Purchase invoice recorded and stock incremented');
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PurchasesService.listPurchases(shopId, req.query);
      return sendSuccess(res, result.purchases, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const purchase = await PurchasesService.getPurchaseById(shopId, req.params.id);
      return sendSuccess(res, purchase);
    } catch (error) {
      next(error);
    }
  }
}
