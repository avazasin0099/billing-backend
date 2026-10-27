import {
  Payment,
  Invoice,
  Customer,
  CustomerLedgerEntry,
  CashBookEntry,
  BankBookEntry,
} from '../../database/associations';
import { getSequelize } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { PaymentMethod, PaymentStatus, LedgerEntryType } from '../../shared/constants';
import { GstService } from '../gst/gst.service';

export class PaymentsService {
  public static async recordPayment(
    shopId: string,
    userId: string,
    data: {
      invoiceId?: string;
      customerId?: string;
      paymentMethod: PaymentMethod;
      amount: number;
      transactionReference?: string;
      notes?: string;
    }
  ) {
    const amount = Number(data.amount);
    if (amount <= 0) {
      throw AppError.badRequest('Payment amount must be greater than zero');
    }

    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      let invoice: Invoice | null = null;
      let customer: Customer | null = null;

      if (data.invoiceId) {
        invoice = await Invoice.findOne({
          where: { id: data.invoiceId, shopId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!invoice) throw AppError.notFound('Invoice not found');
      }

      const targetCustomerId = data.customerId || invoice?.customerId;
      if (targetCustomerId) {
        customer = await Customer.findOne({
          where: { id: targetCustomerId, shopId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      }

      // 1. Create Payment record
      const payment = await Payment.create(
        {
          shopId,
          invoiceId: invoice?.id,
          customerId: customer?.id,
          paymentMethod: data.paymentMethod,
          amount,
          transactionReference: data.transactionReference,
          paymentDate: new Date(),
          notes: data.notes,
          recordedBy: userId,
        },
        { transaction }
      );

      // 2. If tied to invoice, update invoice balances
      if (invoice) {
        const newPaid = GstService.round(Number(invoice.paidAmount) + amount);
        const newBalance = GstService.round(Math.max(0, Number(invoice.totalAmount) - newPaid));
        invoice.paidAmount = newPaid;
        invoice.balanceAmount = newBalance;

        if (newBalance === 0) {
          invoice.paymentStatus = PaymentStatus.PAID;
        } else {
          invoice.paymentStatus = PaymentStatus.PARTIALLY_PAID;
        }
        await invoice.save({ transaction });
      }

      // 3. Update customer ledger and reduce debt balance
      if (customer) {
        const newBalance = GstService.round(Number(customer.currentBalance) - amount);
        customer.currentBalance = newBalance;
        await customer.save({ transaction });

        await CustomerLedgerEntry.create(
          {
            shopId,
            customerId: customer.id,
            entryType: LedgerEntryType.PAYMENT,
            debitAmount: 0,
            creditAmount: amount,
            runningBalance: newBalance,
            referenceType: 'PAYMENT',
            referenceId: payment.id,
            notes: `Manual payment (${data.paymentMethod})${
              data.transactionReference ? ` Ref: ${data.transactionReference}` : ''
            }`,
          },
          { transaction }
        );
      }

      // 4. Update Cash Book or Bank Book
      if (data.paymentMethod === PaymentMethod.CASH) {
        await CashBookEntry.create(
          {
            shopId,
            description: `Customer payment${invoice ? ` for ${invoice.invoiceNumber}` : ''}`,
            inflowAmount: amount,
            outflowAmount: 0,
            referenceType: 'CUSTOMER_PAYMENT',
            referenceId: payment.id,
            recordedBy: userId,
          },
          { transaction }
        );
      } else if (
        [PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE].includes(
          data.paymentMethod
        )
      ) {
        await BankBookEntry.create(
          {
            shopId,
            description: `Customer payment (${data.paymentMethod})`,
            paymentMethod: data.paymentMethod,
            inflowAmount: amount,
            outflowAmount: 0,
            transactionReference: data.transactionReference,
            referenceType: 'CUSTOMER_PAYMENT',
            referenceId: payment.id,
            recordedBy: userId,
          },
          { transaction }
        );
      }

      await transaction.commit();
      return payment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public static async listPayments(
    shopId: string,
    query: { invoiceId?: string; customerId?: string; paymentMethod?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;

    const { rows, count } = await Payment.findAndCountAll({
      where,
      limit,
      offset,
      order: [['paymentDate', 'DESC']],
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'totalAmount'] },
      ],
    });

    return {
      payments: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async getPaymentById(shopId: string, paymentId: string) {
    const payment = await Payment.findOne({
      where: { id: paymentId, shopId },
      include: [
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' },
      ],
    });
    if (!payment) throw AppError.notFound('Payment record not found');
    return payment;
  }
}
