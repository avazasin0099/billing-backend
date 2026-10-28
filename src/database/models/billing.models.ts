import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';
import { InvoiceType, InvoiceStatus, PaymentStatus, PaymentMethod, LedgerEntryType } from '../../shared/constants';

export class Customer extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public name: string;
  declare public phone?: string;
  declare public email?: string;
  declare public gstin?: string;
  declare public billingAddress?: string;
  declare public state: string;
  declare public stateCode: string;
  declare public creditLimit: number;
  declare public currentBalance: number;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initCustomerModel = () => {
  Customer.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gstin: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      billingAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        defaultValue: 'Maharashtra',
      },
      stateCode: {
        type: DataTypes.STRING(2),
        defaultValue: '27',
      },
      creditLimit: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      currentBalance: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'customers',
      underscored: true,
      timestamps: true,
    }
  );
  return Customer;
};

export class InvoiceNumberSequence extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public prefix: string;
  declare public financialYear: string;
  declare public currentSequence: number;
}

export const initInvoiceNumberSequenceModel = () => {
  InvoiceNumberSequence.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      prefix: {
        type: DataTypes.STRING(20),
        defaultValue: 'INV',
      },
      financialYear: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      currentSequence: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'invoice_number_sequences',
      underscored: true,
      timestamps: true,
    }
  );
  return InvoiceNumberSequence;
};

export class Invoice extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public customerId?: string;
  declare public invoiceNumber: string;
  declare public invoiceType: InvoiceType;
  declare public invoiceDate: Date;
  declare public dueDate?: Date;
  declare public placeOfSupplyStateCode: string;
  declare public isInterstate: boolean;
  declare public subtotalAmount: number;
  declare public discountAmount: number;
  declare public taxableAmount: number;
  declare public cgstAmount: number;
  declare public sgstAmount: number;
  declare public igstAmount: number;
  declare public cessAmount: number;
  declare public roundOffAmount: number;
  declare public totalAmount: number;
  declare public paidAmount: number;
  declare public balanceAmount: number;
  declare public paymentStatus: PaymentStatus;
  declare public status: InvoiceStatus;
  declare public notes?: string;
  declare public idempotencyKey?: string;
  declare public createdBy?: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initInvoiceModel = () => {
  Invoice.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      invoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      invoiceType: {
        type: DataTypes.STRING(30),
        defaultValue: InvoiceType.TAX_INVOICE,
      },
      invoiceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      dueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      placeOfSupplyStateCode: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: '27',
      },
      isInterstate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      subtotalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      taxableAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      cgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      sgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      igstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      cessAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      roundOffAmount: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      paidAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      balanceAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      paymentStatus: {
        type: DataTypes.STRING(20),
        defaultValue: PaymentStatus.UNPAID,
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: InvoiceStatus.POSTED,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      idempotencyKey: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'invoices',
      underscored: true,
      timestamps: true,
    }
  );
  return Invoice;
};

export class InvoiceLine extends Model {
  declare public id: string;
  declare public invoiceId: string;
  declare public itemId: string;
  declare public itemName: string;
  declare public hsnCode?: string;
  declare public quantity: number;
  declare public unitCode: string;
  declare public unitPrice: number;
  declare public discountAmount: number;
  declare public taxableAmount: number;
  declare public gstRate: number;
  declare public cgstAmount: number;
  declare public sgstAmount: number;
  declare public igstAmount: number;
  declare public cessAmount: number;
  declare public lineTotal: number;
  declare public returnedQuantity: number;
}

export const initInvoiceLineModel = () => {
  InvoiceLine.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      itemName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hsnCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      unitCode: {
        type: DataTypes.STRING(10),
        defaultValue: 'PCS',
      },
      unitPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      discountAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      taxableAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
      },
      cgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      sgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      igstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      cessAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      lineTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      returnedQuantity: {
        type: DataTypes.DECIMAL(14, 4),
        defaultValue: 0,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'invoice_lines',
      underscored: true,
      timestamps: true,
    }
  );
  return InvoiceLine;
};

export class InvoiceTaxSummary extends Model {
  declare public id: string;
  declare public invoiceId: string;
  declare public gstRate: number;
  declare public taxableAmount: number;
  declare public cgstAmount: number;
  declare public sgstAmount: number;
  declare public igstAmount: number;
  declare public cessAmount: number;
}

export const initInvoiceTaxSummaryModel = () => {
  InvoiceTaxSummary.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
      },
      taxableAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      cgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      sgstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      igstAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      cessAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'invoice_tax_summaries',
      underscored: true,
      timestamps: false,
    }
  );
  return InvoiceTaxSummary;
};

export class Payment extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public invoiceId?: string;
  declare public customerId?: string;
  declare public paymentMethod: PaymentMethod;
  declare public amount: number;
  declare public transactionReference?: string;
  declare public paymentDate: Date;
  declare public notes?: string;
  declare public recordedBy?: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initPaymentModel = () => {
  Payment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      transactionReference: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      paymentDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      recordedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'payments',
      underscored: true,
      timestamps: true,
    }
  );
  return Payment;
};

export class CustomerLedgerEntry extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public customerId: string;
  declare public entryType: LedgerEntryType;
  declare public debitAmount: number;
  declare public creditAmount: number;
  declare public runningBalance: number;
  declare public referenceType: string;
  declare public referenceId?: string;
  declare public notes?: string;
  declare public readonly createdAt: Date;
}

export const initCustomerLedgerEntryModel = () => {
  CustomerLedgerEntry.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      entryType: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      debitAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      creditAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      runningBalance: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      referenceType: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      referenceId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'customer_ledger_entries',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return CustomerLedgerEntry;
};

export class CreditNote extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public invoiceId: string;
  declare public customerId?: string;
  declare public creditNoteNumber: string;
  declare public subtotalAmount: number;
  declare public taxAmount: number;
  declare public totalAmount: number;
  declare public reason: string;
  declare public refundMode: string;
  declare public createdBy?: string;
  declare public readonly createdAt: Date;
}

export const initCreditNoteModel = () => {
  CreditNote.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      invoiceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      creditNoteNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      subtotalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      taxAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      totalAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      refundMode: {
        type: DataTypes.STRING(30),
        defaultValue: 'CASH',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'credit_notes',
      underscored: true,
      timestamps: true,
    }
  );
  return CreditNote;
};
