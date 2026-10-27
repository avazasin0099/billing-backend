import { Request, Response, NextFunction } from 'express';
import { StaffService } from './staff.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class StaffController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const businessId = req.user?.businessId;
      if (!shopId || !businessId) throw AppError.badRequest('Shop and business context required');
      const staff = await StaffService.listStaff(businessId, shopId);
      return sendSuccess(res, staff);
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      const businessId = req.user?.businessId;
      if (!shopId || !businessId) throw AppError.badRequest('Shop and business context required');
      const staff = await StaffService.addStaff(businessId, shopId, req.body);
      return sendCreated(res, staff, 'Staff member added successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const settings = await StaffService.getSettings(shopId);
      return sendSuccess(res, settings);
    } catch (error) {
      next(error);
    }
  }

  public static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const updated = await StaffService.updateSettings(shopId, req.body);
      return sendSuccess(res, updated, 'Settings saved successfully');
    } catch (error) {
      next(error);
    }
  }
}
