import { Op } from 'sequelize';
import {
  Invoice,
  InvoiceLine,
  InvoiceTaxSummary,
  InvoiceNumberSequence,
  Customer,
  Item,
  StockMovement,
  StockLocation,
  Payment,
  CustomerLedgerEntry,
  CreditNote,
  CashBookEntry,
  BankBookEntry,
  Shop,
} from '../../database/associations';
import { getSequelize } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { GstService } from '../gst/gst.service';
import {
  InvoiceType,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  MovementType,
  LedgerEntryType,
  UserRole,
} from '../../shared/constants';

export interface CreateInvoiceItemDto {
  itemId: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
}

export interface CreateInvoicePaymentDto {
  paymentMethod: PaymentMethod;
  amount: number;
  transactionReference?: string;
  notes?: string;
}

export interface CreateInvoiceDto {
  customerId?: string;
  invoiceType?: InvoiceType;
  invoiceDate?: string;
  dueDate?: string;
  placeOfSupplyStateCode?: string;
  notes?: string;
  items: CreateInvoiceItemDto[];
  payments?: CreateInvoicePaymentDto[];
  roundOff?: boolean;
  /** Optional client-generated key to make invoice creation idempotent (retries/double-submit). */
  idempotencyKey?: string;
  /** Manager/owner may waive the customer credit limit for this bill. */
  overrideCreditLimit?: boolean;
}

export class BillingService {
  /**
   * Concurrency-safe sequential invoice number generator.
   */
  public static async generateNextInvoiceNumber(
    shopId: string,
    transaction: any,
    prefix = 'INV'
  ): Promise<string> {
    // Indian financial year runs April–March. Jan–Mar belongs to the prior start-year.
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const financialYear = `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;

    let sequence = await InvoiceNumberSequence.findOne({
      where: { shopId, financialYear },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!sequence) {
      sequence = await InvoiceNumberSequence.create(
        {
          shopId,
          prefix,
          financialYear,
          currentSequence: 0,
        },
        { transaction }
      );
    }

    sequence.currentSequence += 1;
    await sequence.save({ transaction });

    const paddedSeq = String(sequence.currentSequence).padStart(4, '0');
    return `${sequence.prefix}/${financialYear}/${paddedSeq}`;
  }

  public static async createInvoice(
    shopId: string,
    userId: string,
    data: CreateInvoiceDto,
    userRole?: UserRole
  ) {
    if (!data.items || data.items.length === 0) {
      throw AppError.badRequest('Invoice must contain at least one item');
    }

    const isManagerial = userRole === UserRole.OWNER || userRole === UserRole.MANAGER;

    // Idempotency: if this exact client key already produced an invoice, return it (no double-post).
    if (data.idempotencyKey) {
      const existing = await Invoice.findOne({ where: { shopId, idempotencyKey: data.idempotencyKey } });
      if (existing) return await this.getInvoiceById(shopId, existing.id);
    }

    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const shop = await Shop.findByPk(shopId, { transaction });
      if (!shop) throw AppError.notFound('Shop not found');

      // 1. Resolve Customer and Place of Supply
      let customer: Customer | null = null;
      let placeOfSupplyStateCode = data.placeOfSupplyStateCode || shop.stateCode;

      if (data.customerId) {
        customer = await Customer.findOne({
          where: { id: data.customerId, shopId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (customer && customer.stateCode) {
          placeOfSupplyStateCode = customer.stateCode;
        }
      }

      const isInterstate = GstService.isInterstate(shop.stateCode, placeOfSupplyStateCode);

      // 2. Fetch and Lock Items for Stock Deductions
      const itemIds = data.items.map((i) => i.itemId);
      const dbItems = await Item.findAll({
        where: { id: itemIds, shopId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const itemMap = new Map<string, Item>();
      for (const item of dbItems) {
        itemMap.set(item.id, item);
      }

      // 3. Compute Line Items and Tax Breakdown
      const allowNegativeStock = !!(shop.settings && shop.settings.enableNegativeStock);
      const calculatedLines: any[] = [];
      const stockMovementDeltas: { item: Item; qty: number }[] = [];
      let priceOverridden = false;

      for (const reqItem of data.items) {
        const dbItem = itemMap.get(reqItem.itemId);
        if (!dbItem || !dbItem.isActive) {
          throw AppError.badRequest(`Item with ID ${reqItem.itemId} is inactive or not found`);
        }

        const quantity = Number(reqItem.quantity);
        if (quantity <= 0) {
          throw AppError.badRequest(`Invalid quantity ${quantity} for item "${dbItem.name}"`);
        }

        // Price is locked to the catalog; only OWNER/MANAGER may override it.
        const catalogPrice = Number(dbItem.sellingPrice);
        let unitPrice = catalogPrice;
        if (reqItem.unitPrice !== undefined && Number(reqItem.unitPrice) !== catalogPrice) {
          if (!isManagerial) {
            throw AppError.forbidden(
              `Price override for "${dbItem.name}" requires manager/owner approval`
            );
          }
          unitPrice = Number(reqItem.unitPrice);
          priceOverridden = true;
        }
        if (unitPrice < 0) {
          throw AppError.badRequest(`Invalid price for "${dbItem.name}"`);
        }

        const discountAmount = Number(reqItem.discountAmount) || 0;
        const grossAmount = unitPrice * quantity;
        if (discountAmount < 0 || discountAmount > grossAmount) {
          throw AppError.badRequest(`Invalid discount for "${dbItem.name}"`);
        }

        // Stock availability (respects the shop's negative-stock setting).
        if (!allowNegativeStock && Number(dbItem.currentStock) < quantity) {
          throw AppError.badRequest(
            `Insufficient stock for "${dbItem.name}": available ${dbItem.currentStock}, requested ${quantity}`
          );
        }

        const lineCalc = GstService.calculateLine({
          unitPrice,
          quantity,
          discountAmount,
          isTaxInclusive: dbItem.isTaxInclusive,
          gstRate: Number(dbItem.gstRate) || 0,
          cessRate: Number(dbItem.cessRate) || 0,
          isInterstate,
        });

        calculatedLines.push({
          itemId: dbItem.id,
          itemName: dbItem.name,
          hsnCode: dbItem.hsnCode,
          unitCode: 'PCS',
          lineCalc,
        });

        stockMovementDeltas.push({ item: dbItem, qty: quantity });
      }

      // 4. Compute Invoice Totals and Tax Summaries
      const invoiceTotals = GstService.calculateInvoice(
        calculatedLines.map((l) => l.lineCalc),
        data.roundOff !== false
      );

      // 5. Calculate Payments & Outstanding Balance
      let paidAmount = 0;
      const validPayments = data.payments || [];

      for (const p of validPayments) {
        if (p.amount > 0) {
          paidAmount = GstService.round(paidAmount + Number(p.amount));
        }
      }

      const balanceAmount = GstService.round(Math.max(0, invoiceTotals.totalAmount - paidAmount));
      let paymentStatus = PaymentStatus.UNPAID;

      if (balanceAmount === 0 && paidAmount >= invoiceTotals.totalAmount) {
        paymentStatus = PaymentStatus.PAID;
      } else if (paidAmount > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      }

      // If credit remains and no customer selected, fail
      if (balanceAmount > 0 && !customer) {
        throw AppError.badRequest(
          `Outstanding balance of ₹${balanceAmount} requires a registered customer for Credit / Udhaar recording.`
        );
      }

      // 6. Generate Sequential Invoice Number
      const invoiceNumber = await this.generateNextInvoiceNumber(
        shopId,
        transaction,
        shop.settings?.invoicePrefix || 'INV'
      );

      // 7. Create Invoice
      const invoice = await Invoice.create(
        {
          shopId,
          customerId: customer?.id,
          invoiceNumber,
          invoiceType: data.invoiceType || InvoiceType.TAX_INVOICE,
          invoiceDate: data.invoiceDate || new Date().toISOString().slice(0, 10),
          dueDate: data.dueDate,
          placeOfSupplyStateCode,
          isInterstate,
          subtotalAmount: invoiceTotals.subtotalAmount,
          discountAmount: invoiceTotals.discountAmount,
          taxableAmount: invoiceTotals.taxableAmount,
          cgstAmount: invoiceTotals.cgstAmount,
          sgstAmount: invoiceTotals.sgstAmount,
          igstAmount: invoiceTotals.igstAmount,
          cessAmount: invoiceTotals.cessAmount,
          roundOffAmount: invoiceTotals.roundOffAmount,
          totalAmount: invoiceTotals.totalAmount,
          paidAmount,
          balanceAmount,
          paymentStatus,
          status: InvoiceStatus.POSTED,
          notes: priceOverridden
            ? `${data.notes ? data.notes + ' | ' : ''}Price override by ${userRole}`
            : data.notes,
          idempotencyKey: data.idempotencyKey,
          createdBy: userId,
        },
        { transaction }
      );

      // 8. Create Invoice Lines
      for (const line of calculatedLines) {
        const calc = line.lineCalc;
        await InvoiceLine.create(
          {
            invoiceId: invoice.id,
            itemId: line.itemId,
            itemName: line.itemName,
            hsnCode: line.hsnCode,
            quantity: calc.quantity,
            unitCode: line.unitCode,
            unitPrice: calc.unitPrice,
            discountAmount: calc.discountAmount,
            taxableAmount: calc.taxableAmount,
            gstRate: calc.gstRate,
            cgstAmount: calc.cgstAmount,
            sgstAmount: calc.sgstAmount,
            igstAmount: calc.igstAmount,
            cessAmount: calc.cessAmount,
            lineTotal: calc.lineTotal,
          },
          { transaction }
        );
      }

      // 9. Create Invoice Tax Summaries
      for (const summary of invoiceTotals.taxSummaries) {
        await InvoiceTaxSummary.create(
          {
            invoiceId: invoice.id,
            gstRate: summary.gstRate,
            taxableAmount: summary.taxableAmount,
            cgstAmount: summary.cgstAmount,
            sgstAmount: summary.sgstAmount,
            igstAmount: summary.igstAmount,
            cessAmount: summary.cessAmount,
          },
          { transaction }
        );
      }

      // 10. Deduct Stock & Record Stock Movements
      const primaryLocation = await StockLocation.findOne({
        where: { shopId, isPrimary: true },
        transaction,
      });

      for (const delta of stockMovementDeltas) {
        const item = delta.item;
        item.currentStock = GstService.round(Number(item.currentStock) - delta.qty);
        await item.save({ transaction });

        await StockMovement.create(
          {
            shopId,
            itemId: item.id,
            locationId: primaryLocation?.id,
            movementType: MovementType.SALE,
            quantity: -delta.qty,
            unitCost: Number(item.purchasePrice),
            referenceType: 'INVOICE',
            referenceId: invoice.id,
            notes: `Sale on invoice ${invoiceNumber}`,
            createdBy: userId,
          },
          { transaction }
        );
      }

      // 11. Record Payments & Update Cash/Bank Books
      for (const paymentDto of validPayments) {
        if (paymentDto.amount <= 0) continue;

        const payment = await Payment.create(
          {
            shopId,
            invoiceId: invoice.id,
            customerId: customer?.id,
            paymentMethod: paymentDto.paymentMethod,
            amount: paymentDto.amount,
            transactionReference: paymentDto.transactionReference,
            paymentDate: new Date(),
            notes: paymentDto.notes,
            recordedBy: userId,
          },
          { transaction }
        );

        if (paymentDto.paymentMethod === PaymentMethod.CASH) {
          await CashBookEntry.create(
            {
              shopId,
              description: `POS Bill ${invoiceNumber}`,
              inflowAmount: paymentDto.amount,
              outflowAmount: 0,
              referenceType: 'INVOICE_PAYMENT',
              referenceId: payment.id,
              recordedBy: userId,
            },
            { transaction }
          );
        } else if (
          [PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER].includes(
            paymentDto.paymentMethod
          )
        ) {
          await BankBookEntry.create(
            {
              shopId,
              description: `POS Bill ${invoiceNumber} (${paymentDto.paymentMethod})`,
              paymentMethod: paymentDto.paymentMethod,
              inflowAmount: paymentDto.amount,
              outflowAmount: 0,
              transactionReference: paymentDto.transactionReference,
              referenceType: 'INVOICE_PAYMENT',
              referenceId: payment.id,
              recordedBy: userId,
            },
            { transaction }
          );
        }
      }

      // 12. If customer has remaining balance (Credit/Udhaar), update Customer Ledger
      if (balanceAmount > 0 && customer) {
        const newBalance = GstService.round(Number(customer.currentBalance) + balanceAmount);

        // Enforce the customer's credit limit (0 = no limit). Manager/owner may waive it.
        const creditLimit = Number(customer.creditLimit) || 0;
        const overrideCredit = isManagerial && data.overrideCreditLimit === true;
        if (creditLimit > 0 && newBalance > creditLimit && !overrideCredit) {
          throw AppError.badRequest(
            `Credit limit exceeded for ${customer.name}: limit ₹${creditLimit}, balance would become ₹${newBalance}. Collect payment or get manager approval.`
          );
        }

        customer.currentBalance = newBalance;
        await customer.save({ transaction });

        await CustomerLedgerEntry.create(
          {
            shopId,
            customerId: customer.id,
            entryType: LedgerEntryType.INVOICE,
            debitAmount: balanceAmount,
            creditAmount: 0,
            runningBalance: newBalance,
            referenceType: 'INVOICE',
            referenceId: invoice.id,
            notes: `Unpaid balance on invoice ${invoiceNumber}`,
          },
          { transaction }
        );
      }

      await transaction.commit();

      // Return fully hydrated invoice
      return await this.getInvoiceById(shopId, invoice.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async listInvoices(
    shopId: string,
    query: {
      search?: string;
      startDate?: string;
      endDate?: string;
      paymentStatus?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.startDate && query.endDate) {
      where.invoiceDate = { [Op.between]: [query.startDate, query.endDate] };
    } else if (query.startDate) {
      where.invoiceDate = { [Op.gte]: query.startDate };
    } else if (query.endDate) {
      where.invoiceDate = { [Op.lte]: query.endDate };
    }

    if (query.search && query.search.trim()) {
      where.invoiceNumber = { [Op.iLike ? Op.iLike : Op.like]: `%${query.search.trim()}%` };
    }

    const { rows, count } = await Invoice.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone', 'gstin'] },
        { model: Payment, as: 'payments' },
      ],
    });

    return {
      invoices: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async getInvoiceById(shopId: string, invoiceId: string) {
    const invoice = await Invoice.findOne({
      where: { id: invoiceId, shopId },
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLine, as: 'lines' },
        { model: InvoiceTaxSummary, as: 'taxSummaries' },
        { model: Payment, as: 'payments' },
      ],
    });

    if (!invoice) {
      throw AppError.notFound('Invoice not found');
    }

    return invoice;
  }

  public static async createSalesReturn(
    shopId: string,
    userId: string,
    invoiceId: string,
    data: {
      items: { itemId: string; quantity: number; reason?: string }[];
      refundMode: 'CASH' | 'LEDGER_CREDIT';
      notes?: string;
    }
  ) {
    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const invoice = await Invoice.findOne({
        where: { id: invoiceId, shopId },
        include: [{ model: InvoiceLine, as: 'lines' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!invoice) throw AppError.notFound('Original invoice not found');

      let returnSubtotal = 0;
      let returnTax = 0;
      const returnedLines: any[] = [];
      const lineUpdates: { line: any; newReturnedQty: number }[] = [];

      for (const returnItem of data.items) {
        const originalLine = (invoice as any).lines.find((l: any) => l.itemId === returnItem.itemId);
        if (!originalLine) {
          throw AppError.badRequest(`Item with ID ${returnItem.itemId} is not on original invoice`);
        }

        const qty = Number(returnItem.quantity);
        const alreadyReturned = Number(originalLine.returnedQuantity) || 0;
        if (qty <= 0) {
          throw AppError.badRequest(`Invalid return quantity ${qty}`);
        }
        // Cap TOTAL returns across all credit notes to the quantity actually sold.
        if (alreadyReturned + qty > Number(originalLine.quantity)) {
          throw AppError.badRequest(
            `Cannot return ${qty} of "${originalLine.itemName}": sold ${originalLine.quantity}, already returned ${alreadyReturned}`
          );
        }
        lineUpdates.push({ line: originalLine, newReturnedQty: alreadyReturned + qty });

        const unitTaxable = Number(originalLine.taxableAmount) / Number(originalLine.quantity);
        const unitTax =
          (Number(originalLine.cgstAmount) +
            Number(originalLine.sgstAmount) +
            Number(originalLine.igstAmount) +
            Number(originalLine.cessAmount)) /
          Number(originalLine.quantity);

        const lineTaxable = GstService.round(unitTaxable * qty);
        const lineTax = GstService.round(unitTax * qty);

        returnSubtotal = GstService.round(returnSubtotal + lineTaxable);
        returnTax = GstService.round(returnTax + lineTax);

        returnedLines.push({
          itemId: returnItem.itemId,
          quantity: qty,
          reason: returnItem.reason,
        });
      }

      const returnTotal = GstService.round(returnSubtotal + returnTax);
      const creditNoteNumber = `CN-${Date.now().toString().slice(-6)}`;

      // 1. Create Credit Note
      const creditNote = await CreditNote.create(
        {
          shopId,
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          creditNoteNumber,
          subtotalAmount: returnSubtotal,
          taxAmount: returnTax,
          totalAmount: returnTotal,
          reason: data.notes || 'Customer Return',
          refundMode: data.refundMode,
          createdBy: userId,
        },
        { transaction }
      );

      // 2. Replenish inventory
      const primaryLocation = await StockLocation.findOne({
        where: { shopId, isPrimary: true },
        transaction,
      });

      for (const item of returnedLines) {
        const dbItem = await Item.findOne({
          where: { id: item.itemId, shopId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (dbItem) {
          dbItem.currentStock = GstService.round(Number(dbItem.currentStock) + item.quantity);
          await dbItem.save({ transaction });

          await StockMovement.create(
            {
              shopId,
              itemId: dbItem.id,
              locationId: primaryLocation?.id,
              movementType: MovementType.SALE_RETURN,
              quantity: item.quantity,
              unitCost: Number(dbItem.purchasePrice),
              referenceType: 'CREDIT_NOTE',
              referenceId: creditNote.id,
              notes: `Sales return on ${creditNoteNumber}. Reason: ${item.reason || 'Not specified'}`,
              createdBy: userId,
            },
            { transaction }
          );
        }
      }

      // 2b. Mark the returned quantity on each original line (prevents over-returning later).
      for (const u of lineUpdates) {
        u.line.returnedQuantity = u.newReturnedQty;
        await u.line.save({ transaction });
      }

      // 3. Handle Refund.
      // Cash can only be refunded up to what the customer actually paid; any remainder
      // is settled as ledger credit (reducing their udhaar) rather than draining the drawer.
      const paidSoFar = Number(invoice.paidAmount) || 0;
      const cashRefund =
        data.refundMode === 'CASH' ? GstService.round(Math.min(returnTotal, paidSoFar)) : 0;
      const ledgerCredit = GstService.round(returnTotal - cashRefund);

      if (cashRefund > 0) {
        await CashBookEntry.create(
          {
            shopId,
            description: `Sales return refund for ${invoice.invoiceNumber} (${creditNoteNumber})`,
            inflowAmount: 0,
            outflowAmount: cashRefund,
            referenceType: 'CREDIT_NOTE',
            referenceId: creditNote.id,
            recordedBy: userId,
          },
          { transaction }
        );

        // Cash handed back reduces how much this invoice counts as paid.
        const newPaid = GstService.round(paidSoFar - cashRefund);
        invoice.paidAmount = newPaid;
        invoice.balanceAmount = GstService.round(Math.max(0, Number(invoice.totalAmount) - newPaid));
        invoice.paymentStatus =
          invoice.balanceAmount === 0 && newPaid >= Number(invoice.totalAmount)
            ? PaymentStatus.PAID
            : newPaid > 0
            ? PaymentStatus.PARTIALLY_PAID
            : PaymentStatus.UNPAID;
        await invoice.save({ transaction });
      }

      if (ledgerCredit > 0 && invoice.customerId) {
        const customer = await Customer.findByPk(invoice.customerId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (customer) {
          const newBalance = GstService.round(Number(customer.currentBalance) - ledgerCredit);
          customer.currentBalance = newBalance;
          await customer.save({ transaction });

          await CustomerLedgerEntry.create(
            {
              shopId,
              customerId: customer.id,
              entryType: LedgerEntryType.CREDIT_NOTE,
              debitAmount: 0,
              creditAmount: ledgerCredit,
              runningBalance: newBalance,
              referenceType: 'CREDIT_NOTE',
              referenceId: creditNote.id,
              notes: `Credit adjustment for return ${creditNoteNumber}`,
            },
            { transaction }
          );
        }
      }

      await transaction.commit();
      return creditNote;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
