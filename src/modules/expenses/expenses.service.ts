import { Op } from 'sequelize';
import { Expense, CashBookEntry, BankBookEntry } from '../../database/associations';
import { getSequelize } from '../../config/database';
import { PaymentMethod } from '../../shared/constants';
import { GstService } from '../gst/gst.service';

export class ExpensesService {
  public static async createExpense(
    shopId: string,
    userId: string,
    data: {
      category: string;
      amount: number;
      paymentMethod: PaymentMethod;
      expenseDate?: string;
      recipientName?: string;
      notes?: string;
    }
  ) {
    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const amount = Number(data.amount);

      const expense = await Expense.create(
        {
          shopId,
          category: data.category,
          amount,
          paymentMethod: data.paymentMethod,
          expenseDate: data.expenseDate || new Date().toISOString().slice(0, 10),
          recipientName: data.recipientName,
          notes: data.notes,
          createdBy: userId,
        },
        { transaction }
      );

      if (data.paymentMethod === PaymentMethod.CASH) {
        await CashBookEntry.create(
          {
            shopId,
            description: `Expense: ${data.category}${data.recipientName ? ` (Paid to ${data.recipientName})` : ''}`,
            inflowAmount: 0,
            outflowAmount: amount,
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            recordedBy: userId,
          },
          { transaction }
        );
      } else {
        await BankBookEntry.create(
          {
            shopId,
            description: `Expense: ${data.category}${data.recipientName ? ` (Paid to ${data.recipientName})` : ''}`,
            paymentMethod: data.paymentMethod,
            inflowAmount: 0,
            outflowAmount: amount,
            referenceType: 'EXPENSE',
            referenceId: expense.id,
            recordedBy: userId,
          },
          { transaction }
        );
      }

      await transaction.commit();
      return expense;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async listExpenses(
    shopId: string,
    query: { category?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };
    if (query.category) where.category = query.category;
    if (query.startDate && query.endDate) {
      where.expenseDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const { rows, count } = await Expense.findAndCountAll({
      where,
      limit,
      offset,
      order: [['expenseDate', 'DESC']],
    });

    return {
      expenses: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async getCashBook(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    if (query.startDate && query.endDate) {
      where.entryDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const entries = await CashBookEntry.findAll({
      where,
      order: [['entryDate', 'ASC']],
    });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const e of entries) {
      totalInflow = GstService.round(totalInflow + Number(e.inflowAmount));
      totalOutflow = GstService.round(totalOutflow + Number(e.outflowAmount));
    }

    return {
      entries,
      totalInflow,
      totalOutflow,
      netCashBalance: GstService.round(totalInflow - totalOutflow),
    };
  }

  public static async getBankBook(shopId: string, query: { startDate?: string; endDate?: string }) {
    const where: any = { shopId };
    if (query.startDate && query.endDate) {
      where.entryDate = { [Op.between]: [query.startDate, query.endDate] };
    }

    const entries = await BankBookEntry.findAll({
      where,
      order: [['entryDate', 'ASC']],
    });

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const e of entries) {
      totalInflow = GstService.round(totalInflow + Number(e.inflowAmount));
      totalOutflow = GstService.round(totalOutflow + Number(e.outflowAmount));
    }

    return {
      entries,
      totalInflow,
      totalOutflow,
      netBankBalance: GstService.round(totalInflow - totalOutflow),
    };
  }
}
