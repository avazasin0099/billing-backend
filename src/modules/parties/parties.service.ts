import { Op } from 'sequelize';
import {
  Customer,
  Supplier,
  CustomerLedgerEntry,
  SupplierLedgerEntry,
  Invoice,
  Payment,
} from '../../database/associations';
import { AppError } from '../../shared/errors/app-error';

export class PartiesService {
  // --- Customers ---
  public static async listCustomers(
    shopId: string,
    query: { search?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId, isActive: true };
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { phone: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { gstin: { [Op.iLike ? Op.iLike : Op.like]: term } },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    return {
      customers: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async createCustomer(
    shopId: string,
    data: {
      name: string;
      phone?: string;
      email?: string;
      gstin?: string;
      billingAddress?: string;
      state?: string;
      stateCode?: string;
      creditLimit?: number;
      openingBalance?: number;
    }
  ) {
    const customer = await Customer.create({
      shopId,
      name: data.name,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      billingAddress: data.billingAddress,
      state: data.state || 'Maharashtra',
      stateCode: data.stateCode || '27',
      creditLimit: data.creditLimit || 0,
      currentBalance: data.openingBalance || 0,
      isActive: true,
    });

    return customer;
  }

  public static async getCustomerLedger(shopId: string, customerId: string) {
    const customer = await Customer.findOne({ where: { id: customerId, shopId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const ledger = await CustomerLedgerEntry.findAll({
      where: { customerId, shopId },
      order: [['createdAt', 'ASC']],
    });

    return {
      customer,
      currentBalance: customer.currentBalance,
      ledger,
    };
  }

  // --- Suppliers ---
  public static async listSuppliers(
    shopId: string,
    query: { search?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId, isActive: true };
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { companyName: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { phone: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { gstin: { [Op.iLike ? Op.iLike : Op.like]: term } },
      ];
    }

    const { rows, count } = await Supplier.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
    });

    return {
      suppliers: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async createSupplier(
    shopId: string,
    data: {
      name: string;
      companyName?: string;
      phone?: string;
      email?: string;
      gstin?: string;
      address?: string;
      state?: string;
      stateCode?: string;
      openingBalance?: number;
    }
  ) {
    const supplier = await Supplier.create({
      shopId,
      name: data.name,
      companyName: data.companyName,
      phone: data.phone,
      email: data.email,
      gstin: data.gstin,
      address: data.address,
      state: data.state || 'Maharashtra',
      stateCode: data.stateCode || '27',
      currentBalance: data.openingBalance || 0,
      isActive: true,
    });

    return supplier;
  }

  public static async getSupplierLedger(shopId: string, supplierId: string) {
    const supplier = await Supplier.findOne({ where: { id: supplierId, shopId } });
    if (!supplier) throw AppError.notFound('Supplier not found');

    const ledger = await SupplierLedgerEntry.findAll({
      where: { supplierId, shopId },
      order: [['createdAt', 'ASC']],
    });

    return {
      supplier,
      currentBalance: supplier.currentBalance,
      ledger,
    };
  }
}
