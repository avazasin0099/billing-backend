import { Request, Response, NextFunction } from 'express';
import { PartiesService } from './parties.service';
import { sendSuccess, sendCreated } from '../../shared/utilities/response';
import { AppError } from '../../shared/errors/app-error';

export class PartiesController {
  // Customers
  public static async listCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PartiesService.listCustomers(shopId, req.query);
      return sendSuccess(res, result.customers, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const customer = await PartiesService.createCustomer(shopId, req.body);
      return sendCreated(res, customer, 'Customer created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getCustomerLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const ledger = await PartiesService.getCustomerLedger(shopId, req.params.id);
      return sendSuccess(res, ledger);
    } catch (error) {
      next(error);
    }
  }

  public static async updateCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const customer = await PartiesService.updateCustomer(shopId, req.params.id, req.body);
      return sendSuccess(res, customer, 'Customer updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PartiesService.deleteCustomer(shopId, req.params.id);
      return sendSuccess(res, result, 'Customer removed');
    } catch (error) {
      next(error);
    }
  }

  // Suppliers
  public static async listSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PartiesService.listSuppliers(shopId, req.query);
      return sendSuccess(res, result.suppliers, undefined, 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  public static async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const supplier = await PartiesService.createSupplier(shopId, req.body);
      return sendCreated(res, supplier, 'Supplier created successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getSupplierLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const ledger = await PartiesService.getSupplierLedger(shopId, req.params.id);
      return sendSuccess(res, ledger);
    } catch (error) {
      next(error);
    }
  }

  public static async updateSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const supplier = await PartiesService.updateSupplier(shopId, req.params.id, req.body);
      return sendSuccess(res, supplier, 'Supplier updated successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async deleteSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const shopId = req.shopId;
      if (!shopId) throw AppError.badRequest('Shop context required');
      const result = await PartiesService.deleteSupplier(shopId, req.params.id);
      return sendSuccess(res, result, 'Supplier removed');
    } catch (error) {
      next(error);
    }
  }
}
