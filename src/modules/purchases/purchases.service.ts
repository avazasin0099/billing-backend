import { Op } from 'sequelize';
import {
  Purchase,
  PurchaseLine,
  Supplier,
  SupplierLedgerEntry,
  Item,
  StockMovement,
  StockLocation,
  CashBookEntry,
  BankBookEntry,
} from '../../database/associations';
import { getSequelize } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { MovementType, LedgerEntryType, PaymentStatus, PaymentMethod } from '../../shared/constants';
import { GstService } from '../gst/gst.service';

export interface CreatePurchaseItemDto {
  itemId: string;
  quantity: number;
  unitCost: number;
  gstRate?: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface CreatePurchaseDto {
  supplierId: string;
  supplierInvoiceNumber?: string;
  purchaseDate?: string;
  notes?: string;
  items: CreatePurchaseItemDto[];
  paidAmount?: number;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
}

export class PurchasesService {
  public static async createPurchase(shopId: string, userId: string, data: CreatePurchaseDto) {
    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('Purchase must include at least one item');
    }

    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const supplier = await Supplier.findOne({
        where: { id: data.supplierId, shopId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!supplier) throw AppError.notFound('Supplier not found');

      let subtotalAmount = 0;
      let taxAmount = 0;
      const calculatedLines: any[] = [];

      for (const itemDto of data.items) {
        const item = await Item.findOne({
          where: { id: itemDto.itemId, shopId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!item) throw AppError.notFound(`Item with ID ${itemDto.itemId} not found`);

        const qty = Number(itemDto.quantity);
        const cost = Number(itemDto.unitCost);
        const gstRate = itemDto.gstRate !== undefined ? Number(itemDto.gstRate) : Number(item.gstRate);

        const lineSubtotal = GstService.round(qty * cost);
        const lineTax = GstService.round(lineSubtotal * (gstRate / 100));
        const lineTotal = GstService.round(lineSubtotal + lineTax);

        subtotalAmount = GstService.round(subtotalAmount + lineSubtotal);
        taxAmount = GstService.round(taxAmount + lineTax);

        calculatedLines.push({
          item,
          quantity: qty,
          unitCost: cost,
          gstRate,
          taxAmount: lineTax,
          lineTotal,
          batchNumber: itemDto.batchNumber,
          expiryDate: itemDto.expiryDate,
        });
      }

      const totalAmount = GstService.round(subtotalAmount + taxAmount);
      const paidAmount = Number(data.paidAmount) || 0;
      const balanceAmount = GstService.round(Math.max(0, totalAmount - paidAmount));

      let paymentStatus = PaymentStatus.UNPAID;
      if (balanceAmount === 0 && paidAmount >= totalAmount) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paidAmount > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      }

      const purchaseNumber = `PUR-${Date.now().toString().slice(-6)}`;

      // 1. Create Purchase
      const purchase = await Purchase.create(
        {
          shopId,
          supplierId: supplier.id,
          purchaseNumber,
          supplierInvoiceNumber: data.supplierInvoiceNumber,
          purchaseDate: data.purchaseDate || new Date().toISOString().slice(0, 10),
          subtotalAmount,
          taxAmount,
          totalAmount,
          paidAmount,
          balanceAmount,
          paymentStatus,
          status: 'RECEIVED',
          notes: data.notes,
          createdBy: userId,
        },
        { transaction }
      );

      // 2. Create Purchase Lines & update stock
      const location = await StockLocation.findOne({
        where: { shopId, isPrimary: true },
        transaction,
      });

      for (const line of calculatedLines) {
        await PurchaseLine.create(
          {
            purchaseId: purchase.id,
            itemId: line.item.id,
            itemName: line.item.name,
            quantity: line.quantity,
            unitCost: line.unitCost,
            gstRate: line.gstRate,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
            batchNumber: line.batchNumber,
            expiryDate: line.expiryDate,
          },
          { transaction }
        );

        // Update stock
        line.item.currentStock = GstService.round(Number(line.item.currentStock) + line.quantity);
        line.item.purchasePrice = line.unitCost; // Update latest cost
        await line.item.save({ transaction });

        // Stock movement audit
        await StockMovement.create(
          {
            shopId,
            itemId: line.item.id,
            locationId: location?.id,
            movementType: MovementType.PURCHASE,
            quantity: line.quantity,
            unitCost: line.unitCost,
            referenceType: 'PURCHASE',
            referenceId: purchase.id,
            notes: `Inward purchase ${purchaseNumber}${
              data.supplierInvoiceNumber ? ` (Inv: ${data.supplierInvoiceNumber})` : ''
            }`,
            createdBy: userId,
          },
          { transaction }
        );
      }

      // 3. Update Supplier Ledger
      // Invoice increases payable (credit)
      const balanceAfterInvoice = GstService.round(Number(supplier.currentBalance) + totalAmount);
      supplier.currentBalance = balanceAfterInvoice;

      await SupplierLedgerEntry.create(
        {
          shopId,
          supplierId: supplier.id,
          entryType: LedgerEntryType.INVOICE,
          debitAmount: 0,
          creditAmount: totalAmount,
          runningBalance: balanceAfterInvoice,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          notes: `Purchase bill ${purchaseNumber}`,
        },
        { transaction }
      );

      // If paid amount recorded, log debit entry to reduce payable
      if (paidAmount > 0) {
        const balanceAfterPayment = GstService.round(balanceAfterInvoice - paidAmount);
        supplier.currentBalance = balanceAfterPayment;

        await SupplierLedgerEntry.create(
          {
            shopId,
            supplierId: supplier.id,
            entryType: LedgerEntryType.PAYMENT,
            debitAmount: paidAmount,
            creditAmount: 0,
            runningBalance: balanceAfterPayment,
            referenceType: 'PURCHASE_PAYMENT',
            referenceId: purchase.id,
            notes: `Payment for purchase ${purchaseNumber} via ${data.paymentMethod || 'BANK_TRANSFER'}`,
          },
          { transaction }
        );

        // Outflow recorded in cash/bank book
        if (data.paymentMethod === PaymentMethod.CASH) {
          await CashBookEntry.create(
            {
              shopId,
              description: `Supplier payment to ${supplier.name} for ${purchaseNumber}`,
              inflowAmount: 0,
              outflowAmount: paidAmount,
              referenceType: 'SUPPLIER_PAYMENT',
              referenceId: purchase.id,
              recordedBy: userId,
            },
            { transaction }
          );
        } else {
          await BankBookEntry.create(
            {
              shopId,
              description: `Supplier payment to ${supplier.name} for ${purchaseNumber}`,
              paymentMethod: data.paymentMethod || PaymentMethod.BANK_TRANSFER,
              inflowAmount: 0,
              outflowAmount: paidAmount,
              transactionReference: data.transactionReference,
              referenceType: 'SUPPLIER_PAYMENT',
              referenceId: purchase.id,
              recordedBy: userId,
            },
            { transaction }
          );
        }
      }

      await supplier.save({ transaction });
      await transaction.commit();

      return await this.getPurchaseById(shopId, purchase.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async listPurchases(
    shopId: string,
    query: { supplierId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };
    if (query.supplierId) where.supplierId = query.supplierId;

    if (query.startDate && query.endDate) {
      where.purchaseDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const { rows, count } = await Purchase.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'name', 'gstin'] }],
    });

    return {
      purchases: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async getPurchaseById(shopId: string, purchaseId: string) {
    const purchase = await Purchase.findOne({
      where: { id: purchaseId, shopId },
      include: [
        { model: Supplier, as: 'supplier' },
        { model: PurchaseLine, as: 'lines' },
      ],
    });

    if (!purchase) throw AppError.notFound('Purchase record not found');
    return purchase;
  }
}
