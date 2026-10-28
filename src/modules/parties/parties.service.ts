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
  /** Reject creating a party when an active one already shares the same phone or GSTIN in this shop. */
  private static async assertNoDuplicateParty(
    model: typeof Customer | typeof Supplier,
    shopId: string,
    phone?: string,
    gstin?: string
  ) {
    const ors: any[] = [];
    if (phone && phone.trim()) ors.push({ phone: phone.trim() });
    if (gstin && gstin.trim()) ors.push({ gstin: gstin.trim() });
    if (ors.length === 0) return;
    const existing = await (model as any).findOne({ where: { shopId, isActive: true, [Op.or]: ors } });
    if (existing) {
      throw AppError.conflict('A customer/supplier with this phone or GSTIN already exists');
    }
  }

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
    await this.assertNoDuplicateParty(Customer, shopId, data.phone, data.gstin);

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

  public static async updateCustomer(
    shopId: string,
    id: string,
    data: Partial<{
      name: string; phone: string; email: string; gstin: string;
      billingAddress: string; state: string; stateCode: string; creditLimit: number;
    }>
  ) {
    const customer = await Customer.findOne({ where: { id, shopId } });
    if (!customer) throw AppError.notFound('Customer not found');

    const allowed = ['name', 'phone', 'email', 'gstin', 'billingAddress', 'state', 'stateCode', 'creditLimit'] as const;
    const updates: Record<string, any> = {};
    for (const k of allowed) if ((data as any)[k] !== undefined) updates[k] = (data as any)[k];

    await customer.update(updates); // currentBalance intentionally not editable here
    return customer;
  }

  public static async deleteCustomer(shopId: string, id: string) {
    const customer = await Customer.findOne({ where: { id, shopId } });
    if (!customer) throw AppError.notFound('Customer not found');
    if (Number(customer.currentBalance) !== 0) {
      throw AppError.badRequest('Cannot remove a customer with an outstanding balance. Settle the ledger first.');
    }
    await customer.update({ isActive: false }); // soft delete — preserves history
    return { id, deactivated: true };
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
    await this.assertNoDuplicateParty(Supplier, shopId, data.phone, data.gstin);

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

  public static async updateSupplier(
    shopId: string,
    id: string,
    data: Partial<{
      name: string; companyName: string; phone: string; email: string;
      gstin: string; address: string; state: string; stateCode: string;
    }>
  ) {
    const supplier = await Supplier.findOne({ where: { id, shopId } });
    if (!supplier) throw AppError.notFound('Supplier not found');

    const allowed = ['name', 'companyName', 'phone', 'email', 'gstin', 'address', 'state', 'stateCode'] as const;
    const updates: Record<string, any> = {};
    for (const k of allowed) if ((data as any)[k] !== undefined) updates[k] = (data as any)[k];

    await supplier.update(updates);
    return supplier;
  }

  public static async deleteSupplier(shopId: string, id: string) {
    const supplier = await Supplier.findOne({ where: { id, shopId } });
    if (!supplier) throw AppError.notFound('Supplier not found');
    if (Number(supplier.currentBalance) !== 0) {
      throw AppError.badRequest('Cannot remove a supplier with an outstanding balance. Settle the ledger first.');
    }
    await supplier.update({ isActive: false });
    return { id, deactivated: true };
  }
}
