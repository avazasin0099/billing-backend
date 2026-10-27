import { Request, Response, NextFunction } from 'express';
import { BillingService } from './billing.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class BillingController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const invoice = await BillingService.createInvoice(shopId, userId, req.body);
      return sendCreated(res, invoice, 'Invoice created and posted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await BillingService.listInvoices(shopId, req.query);
      return sendSuccess(res, result.invoices, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const invoice = await BillingService.getInvoiceById(shopId, req.params.id);
      return sendSuccess(res, invoice);
    } catch (error) {
      next(error);
    }
  }

  public static async createReturn(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const creditNote = await BillingService.createSalesReturn(shopId, userId, req.params.id, req.body);
      return sendCreated(res, creditNote, 'Sales return processed and credit note created');
    } catch (error) {
      next(error);
    }
  }
}
