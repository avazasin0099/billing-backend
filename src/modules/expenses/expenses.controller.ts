import { Request, Response, NextFunction } from 'express';
import { ExpensesService } from './expenses.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class ExpensesController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const userId = req.user?.id;
      if (!shopId || !userId) throw AppError.badRequest('Shop and user context required');
      const expense = await ExpensesService.createExpense(shopId, userId, req.body);
      return sendCreated(res, expense, 'Expense recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await ExpensesService.listExpenses(shopId, req.query);
      return sendSuccess(res, result.expenses, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async getCashBook(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const cashBook = await ExpensesService.getCashBook(shopId, req.query);
      return sendSuccess(res, cashBook);
    } catch (error) {
      next(error);
    }
  }

  public static async getBankBook(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const bankBook = await ExpensesService.getBankBook(shopId, req.query);
      return sendSuccess(res, bankBook);
    } catch (error) {
      next(error);
    }
  }
}
