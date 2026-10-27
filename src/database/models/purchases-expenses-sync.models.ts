import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';
import { PaymentStatus, PaymentMethod, LedgerEntryType } from '../../shared/constants';

export class Supplier extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public name: string;
  declare public companyName?: string;
  declare public phone?: string;
  declare public email?: string;
  declare public gstin?: string;
  declare public address?: string;
  declare public state: string;
  declare public stateCode: string;
  declare public currentBalance: number;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initSupplierModel = () => {
  Supplier.init(
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
      companyName: {
        type: DataTypes.STRING,
        allowNull: true,
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
      address: {
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
      tableName: 'suppliers',
      underscored: true,
      timestamps: true,
    }
  );
  return Supplier;
};

export class Purchase extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public supplierId: string;
  declare public purchaseNumber: string;
  declare public supplierInvoiceNumber?: string;
  declare public purchaseDate: Date;
  declare public subtotalAmount: number;
  declare public taxAmount: number;
  declare public totalAmount: number;
  declare public paidAmount: number;
  declare public balanceAmount: number;
  declare public paymentStatus: PaymentStatus;
  declare public status: string;
  declare public notes?: string;
  declare public createdBy?: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initPurchaseModel = () => {
  Purchase.init(
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
      supplierId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      purchaseNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      supplierInvoiceNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      purchaseDate: {
        type: DataTypes.DATEONLY,
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
      paidAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      balanceAmount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      paymentStatus: {
        type: DataTypes.STRING(20),
        defaultValue: PaymentStatus.UNPAID,
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'RECEIVED',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'purchases',
      underscored: true,
      timestamps: true,
    }
  );
  return Purchase;
};

export class PurchaseLine extends Model {
  declare public id: string;
  declare public purchaseId: string;
  declare public itemId: string;
  declare public itemName: string;
  declare public quantity: number;
  declare public unitCost: number;
  declare public gstRate: number;
  declare public taxAmount: number;
  declare public lineTotal: number;
  declare public batchNumber?: string;
  declare public expiryDate?: Date;
}

export const initPurchaseLineModel = () => {
  PurchaseLine.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      purchaseId: {
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
      quantity: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      unitCost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
      },
      taxAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      lineTotal: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      batchNumber: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'purchase_lines',
      underscored: true,
      timestamps: false,
    }
  );
  return PurchaseLine;
};

export class SupplierLedgerEntry extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public supplierId: string;
  declare public entryType: LedgerEntryType;
  declare public debitAmount: number;
  declare public creditAmount: number;
  declare public runningBalance: number;
  declare public referenceType: string;
  declare public referenceId?: string;
  declare public notes?: string;
}

export const initSupplierLedgerEntryModel = () => {
  SupplierLedgerEntry.init(
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
      supplierId: {
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
      tableName: 'supplier_ledger_entries',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return SupplierLedgerEntry;
};

export class Expense extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public category: string;
  declare public amount: number;
  declare public paymentMethod: PaymentMethod;
  declare public expenseDate: Date;
  declare public recipientName?: string;
  declare public notes?: string;
  declare public createdBy?: string;
}

export const initExpenseModel = () => {
  Expense.init(
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
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      expenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      recipientName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      notes: {
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
      tableName: 'expenses',
      underscored: true,
      timestamps: true,
    }
  );
  return Expense;
};

export class CashBookEntry extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public entryDate: Date;
  declare public description: string;
  declare public inflowAmount: number;
  declare public outflowAmount: number;
  declare public referenceType: string;
  declare public referenceId?: string;
  declare public recordedBy?: string;
}

export const initCashBookEntryModel = () => {
  CashBookEntry.init(
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
      entryDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      inflowAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      outflowAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      referenceType: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      referenceId: {
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
      tableName: 'cash_book_entries',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return CashBookEntry;
};

export class BankBookEntry extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public entryDate: Date;
  declare public description: string;
  declare public paymentMethod: string;
  declare public inflowAmount: number;
  declare public outflowAmount: number;
  declare public transactionReference?: string;
  declare public referenceType: string;
  declare public referenceId?: string;
  declare public recordedBy?: string;
}

export const initBankBookEntryModel = () => {
  BankBookEntry.init(
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
      entryDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      paymentMethod: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      inflowAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      outflowAmount: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      transactionReference: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      referenceType: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      referenceId: {
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
      tableName: 'bank_book_entries',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return BankBookEntry;
};

export class SyncEvent extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public deviceId: string;
  declare public eventType: string;
  declare public entityName: string;
  declare public entityId: string;
  declare public payload: any;
  declare public schemaVersion: number;
  declare public status: string;
  declare public errorMessage?: string;
  declare public processedAt?: Date;
}

export const initSyncEventModel = () => {
  SyncEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      deviceId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      eventType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      schemaVersion: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      status: {
        type: DataTypes.STRING(20),
        defaultValue: 'PENDING',
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'sync_events',
      underscored: true,
      timestamps: true,
    }
  );
  return SyncEvent;
};

export class SyncConflict extends Model {
  declare public id: string;
  declare public syncEventId: string;
  declare public shopId: string;
  declare public conflictType: string;
  declare public clientPayload: any;
  declare public serverState: any;
  declare public resolutionStatus: string;
  declare public resolutionNotes?: string;
  declare public resolvedBy?: string;
  declare public resolvedAt?: Date;
}

export const initSyncConflictModel = () => {
  SyncConflict.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      syncEventId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      conflictType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      clientPayload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      serverState: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      resolutionStatus: {
        type: DataTypes.STRING(30),
        defaultValue: 'OPEN',
      },
      resolutionNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      resolvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'sync_conflicts',
      underscored: true,
      timestamps: true,
    }
  );
  return SyncConflict;
};
