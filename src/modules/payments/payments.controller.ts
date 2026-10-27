import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class PaymentsController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const payment = await PaymentsService.recordPayment(shopId, userId, req.body);
      return sendCreated(res, payment, 'Payment record saved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PaymentsService.listPayments(shopId, req.query);
      return sendSuccess(res, result.payments, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const payment = await PaymentsService.getPaymentById(shopId, req.params.id);
      return sendSuccess(res, payment);
    } catch (error) {
      next(error);
    }
  }
}
