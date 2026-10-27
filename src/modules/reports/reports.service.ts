import { Op } from 'sequelize';
import {
  Invoice,
  InvoiceLine,
  InvoiceTaxSummary,
  Purchase,
  Payment,
  Customer,
  Supplier,
  Item,
  Expense,
} from '../../database/associations';
import { GstService } from '../gst/gst.service';
import { PaymentMethod } from '../../shared/constants';

export class ReportsService {
  public static async getSalesReport(
    shopId: string,
    query: { startDate?: string; endDate?: string }
  ) {
    const where: any = { shopId };
    if (query.startDate && query.endDate) {
      where.invoiceDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: InvoiceTaxSummary, as: 'taxSummaries' },
        { model: Payment, as: 'payments' },
      ],
      order: [['invoiceDate', 'DESC']],
    });

    let totalBilled = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalDiscounts = 0;
    let totalPaid = 0;
    let totalCredit = 0;

    const paymentMethodTotals: Record<string, number> = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.UPI]: 0,
      [PaymentMethod.CARD]: 0,
      [PaymentMethod.BANK_TRANSFER]: 0,
      [PaymentMethod.CHEQUE]: 0,
      [PaymentMethod.CREDIT]: 0,
      [PaymentMethod.OTHER]: 0,
    };

    for (const inv of invoices) {
      totalBilled = GstService.round(totalBilled + Number(inv.totalAmount));
      totalTaxable = GstService.round(totalTaxable + Number(inv.taxableAmount));
      totalTax = GstService.round(
        totalTax +
          Number(inv.cgstAmount) +
          Number(inv.sgstAmount) +
          Number(inv.igstAmount) +
          Number(inv.cessAmount)
      );
      totalDiscounts = GstService.round(totalDiscounts + Number(inv.discountAmount));
      totalPaid = GstService.round(totalPaid + Number(inv.paidAmount));
      totalCredit = GstService.round(totalCredit + Number(inv.balanceAmount));

      if ((inv as any).payments) {
        for (const p of (inv as any).payments) {
          const method = p.paymentMethod;
          if (paymentMethodTotals[method] !== undefined) {
            paymentMethodTotals[method] = GstService.round(
              paymentMethodTotals[method] + Number(p.amount)
            );
          }
        }
      }
    }

    return {
      totalInvoices: invoices.length,
      totalBilled,
      totalTaxable,
      totalTax,
      totalDiscounts,
      totalPaid,
      totalCredit,
      paymentMethodTotals,
      invoices,
    };
  }

  public static async getGstReport(
    shopId: string,
    query: { startDate?: string; endDate?: string }
  ) {
    const where: any = { shopId };
    if (query.startDate && query.endDate) {
      where.invoiceDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceLine, as: 'lines' },
        { model: InvoiceTaxSummary, as: 'taxSummaries' },
      ],
    });

    // Partition into B2B (with GSTIN) and B2C (without GSTIN)
    const b2bInvoices: any[] = [];
    const b2cInvoices: any[] = [];
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalCess = 0;
    let totalTaxableValue = 0;

    const rateBuckets: Record<string, { taxable: number; cgst: number; sgst: number; igst: number; cess: number }> = {};

    for (const inv of invoices) {
      const isB2B = !!(inv as any).customer?.gstin;
      if (isB2B) {
        b2bInvoices.push(inv);
      } else {
        b2cInvoices.push(inv);
      }

      totalCgst = GstService.round(totalCgst + Number(inv.cgstAmount));
      totalSgst = GstService.round(totalSgst + Number(inv.sgstAmount));
      totalIgst = GstService.round(totalIgst + Number(inv.igstAmount));
      totalCess = GstService.round(totalCess + Number(inv.cessAmount));
      totalTaxableValue = GstService.round(totalTaxableValue + Number(inv.taxableAmount));

      if ((inv as any).taxSummaries) {
        for (const summary of (inv as any).taxSummaries) {
          const rateKey = `${summary.gstRate}%`;
          if (!rateBuckets[rateKey]) {
            rateBuckets[rateKey] = { taxable: 0, cgst: 0, sgst: 0, igst: 0, cess: 0 };
          }
          rateBuckets[rateKey].taxable = GstService.round(rateBuckets[rateKey].taxable + Number(summary.taxableAmount));
          rateBuckets[rateKey].cgst = GstService.round(rateBuckets[rateKey].cgst + Number(summary.cgstAmount));
          rateBuckets[rateKey].sgst = GstService.round(rateBuckets[rateKey].sgst + Number(summary.sgstAmount));
          rateBuckets[rateKey].igst = GstService.round(rateBuckets[rateKey].igst + Number(summary.igstAmount));
          rateBuckets[rateKey].cess = GstService.round(rateBuckets[rateKey].cess + Number(summary.cessAmount));
        }
      }
    }

    return {
      summary: {
        totalInvoices: invoices.length,
        b2bCount: b2bInvoices.length,
        b2cCount: b2cInvoices.length,
        totalTaxableValue,
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess,
        totalTaxLiability: GstService.round(totalCgst + totalSgst + totalIgst + totalCess),
      },
      rateWiseBreakdown: rateBuckets,
      b2bInvoices,
      b2cInvoices,
    };
  }

  public static async getProfitAndLoss(
    shopId: string,
    query: { startDate?: string; endDate?: string }
  ) {
    const invWhere: any = { shopId };
    const expWhere: any = { shopId };
    if (query.startDate && query.endDate) {
      invWhere.invoiceDate = { [Op.between]: [query.startDate, query.endDate] };
      expWhere.expenseDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const invoices = await Invoice.findAll({
      where: invWhere,
      include: [{ model: InvoiceLine, as: 'lines' }],
    });

    const expenses = await Expense.findAll({ where: expWhere });

    let grossSalesRevenue = 0;
    let costOfGoodsSold = 0;

    for (const inv of invoices) {
      grossSalesRevenue = GstService.round(grossSalesRevenue + Number(inv.taxableAmount));
      if ((inv as any).lines) {
        for (const line of (inv as any).lines) {
          // Approximate COGS using current product purchase price
          const qty = Number(line.quantity);
          const item = await Item.findByPk(line.itemId);
          const unitCost = item ? Number(item.purchasePrice) : Number(line.unitPrice) * 0.8;
          costOfGoodsSold = GstService.round(costOfGoodsSold + qty * unitCost);
        }
      }
    }

    let totalOperatingExpenses = 0;
    for (const exp of expenses) {
      totalOperatingExpenses = GstService.round(totalOperatingExpenses + Number(exp.amount));
    }

    const grossProfit = GstService.round(grossSalesRevenue - costOfGoodsSold);
    const netProfit = GstService.round(grossProfit - totalOperatingExpenses);
    const grossMarginPercent =
      grossSalesRevenue > 0
        ? GstService.round((grossProfit / grossSalesRevenue) * 100)
        : 0;

    return {
      grossSalesRevenue,
      costOfGoodsSold,
      grossProfit,
      grossMarginPercent,
      totalOperatingExpenses,
      netProfit,
    };
  }

  public static async getCustomerDues(shopId: string) {
    const customersWithDues = await Customer.findAll({
      where: {
        shopId,
        isActive: true,
        currentBalance: { [Op.gt]: 0 },
      },
      order: [['currentBalance', 'DESC']],
    });

    let totalOutstanding = 0;
    for (const c of customersWithDues) {
      totalOutstanding = GstService.round(totalOutstanding + Number(c.currentBalance));
    }

    return {
      totalOutstanding,
      customerCount: customersWithDues.length,
      customers: customersWithDues,
    };
  }
}
