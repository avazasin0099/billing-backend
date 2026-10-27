import { Request, Response, NextFunction } from 'express';
import { ReportsService } from './reports.service';
import { sendSuccess } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class ReportsController {
  public static async getSales(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const data = await ReportsService.getSalesReport(shopId, req.query);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  public static async getGst(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const data = await ReportsService.getGstReport(shopId, req.query);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  public static async getProfitAndLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const data = await ReportsService.getProfitAndLoss(shopId, req.query);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  public static async getCustomerDues(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const data = await ReportsService.getCustomerDues(shopId);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}
