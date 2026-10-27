import { initBusinessModel, Business } from './models/business.model';
import { initShopModel, Shop } from './models/shop.model';
import { initUserModel, User } from './models/user.model';
import {
  initUserShopMembershipModel,
  UserShopMembership,
  initDeviceModel,
  Device,
  initRefreshTokenModel,
  RefreshToken,
  initAuditLogModel,
  AuditLog,
} from './models/access.models';
import {
  initTaxCategoryModel,
  TaxCategory,
  initUnitModel,
  Unit,
  initItemModel,
  Item,
  initStockLocationModel,
  StockLocation,
  initStockBatchModel,
  StockBatch,
  initStockMovementModel,
  StockMovement,
  initStockAdjustmentModel,
  StockAdjustment,
} from './models/catalog.models';
import {
  initCustomerModel,
  Customer,
  initInvoiceNumberSequenceModel,
  InvoiceNumberSequence,
  initInvoiceModel,
  Invoice,
  initInvoiceLineModel,
  InvoiceLine,
  initInvoiceTaxSummaryModel,
  InvoiceTaxSummary,
  initPaymentModel,
  Payment,
  initCustomerLedgerEntryModel,
  CustomerLedgerEntry,
  initCreditNoteModel,
  CreditNote,
} from './models/billing.models';
import {
  initSupplierModel,
  Supplier,
  initPurchaseModel,
  Purchase,
  initPurchaseLineModel,
  PurchaseLine,
  initSupplierLedgerEntryModel,
  SupplierLedgerEntry,
  initExpenseModel,
  Expense,
  initCashBookEntryModel,
  CashBookEntry,
  initBankBookEntryModel,
  BankBookEntry,
  initSyncEventModel,
  SyncEvent,
  initSyncConflictModel,
  SyncConflict,
} from './models/purchases-expenses-sync.models';

let isInitialized = false;

export const initializeDatabaseModels = () => {
  if (isInitialized) return;

  // Initialize model classes
  initBusinessModel();
  initShopModel();
  initUserModel();
  initUserShopMembershipModel();
  initDeviceModel();
  initRefreshTokenModel();
  initAuditLogModel();

  initTaxCategoryModel();
  initUnitModel();
  initItemModel();
  initStockLocationModel();
  initStockBatchModel();
  initStockMovementModel();
  initStockAdjustmentModel();

  initCustomerModel();
  initInvoiceNumberSequenceModel();
  initInvoiceModel();
  initInvoiceLineModel();
  initInvoiceTaxSummaryModel();
  initPaymentModel();
  initCustomerLedgerEntryModel();
  initCreditNoteModel();

  initSupplierModel();
  initPurchaseModel();
  initPurchaseLineModel();
  initSupplierLedgerEntryModel();
  initExpenseModel();
  initCashBookEntryModel();
  initBankBookEntryModel();
  initSyncEventModel();
  initSyncConflictModel();

  // Define Associations

  // Business & Shop
  Business.hasMany(Shop, { foreignKey: 'businessId', as: 'shops' });
  Shop.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

  Business.hasMany(User, { foreignKey: 'businessId', as: 'users' });
  User.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });

  User.hasMany(UserShopMembership, { foreignKey: 'userId', as: 'memberships' });
  UserShopMembership.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  Shop.hasMany(UserShopMembership, { foreignKey: 'shopId', as: 'memberships' });
  UserShopMembership.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

  Shop.hasMany(Device, { foreignKey: 'shopId', as: 'devices' });
  Device.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' });
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Catalog & Inventory
  Shop.hasMany(Item, { foreignKey: 'shopId', as: 'items' });
  Item.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

  TaxCategory.hasMany(Item, { foreignKey: 'taxCategoryId', as: 'items' });
  Item.belongsTo(TaxCategory, { foreignKey: 'taxCategoryId', as: 'taxCategory' });

  Unit.hasMany(Item, { foreignKey: 'unitId', as: 'items' });
  Item.belongsTo(Unit, { foreignKey: 'unitId', as: 'unit' });

  Item.hasMany(StockMovement, { foreignKey: 'itemId', as: 'movements' });
  StockMovement.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

  Item.hasMany(StockAdjustment, { foreignKey: 'itemId', as: 'adjustments' });
  StockAdjustment.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

  // Invoices & Billing
  Shop.hasMany(Invoice, { foreignKey: 'shopId', as: 'invoices' });
  Invoice.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

  Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
  Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

  Invoice.hasMany(InvoiceLine, { foreignKey: 'invoiceId', as: 'lines' });
  InvoiceLine.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  Invoice.hasMany(InvoiceTaxSummary, { foreignKey: 'invoiceId', as: 'taxSummaries' });
  InvoiceTaxSummary.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments' });
  Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  Customer.hasMany(CustomerLedgerEntry, { foreignKey: 'customerId', as: 'ledgerEntries' });
  CustomerLedgerEntry.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

  Invoice.hasMany(CreditNote, { foreignKey: 'invoiceId', as: 'creditNotes' });
  CreditNote.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  // Purchases & Suppliers
  Shop.hasMany(Purchase, { foreignKey: 'shopId', as: 'purchases' });
  Purchase.belongsTo(Shop, { foreignKey: 'shopId', as: 'shop' });

  Supplier.hasMany(Purchase, { foreignKey: 'supplierId', as: 'purchases' });
  Purchase.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

  Purchase.hasMany(PurchaseLine, { foreignKey: 'purchaseId', as: 'lines' });
  PurchaseLine.belongsTo(Purchase, { foreignKey: 'purchaseId', as: 'purchase' });

  Supplier.hasMany(SupplierLedgerEntry, { foreignKey: 'supplierId', as: 'ledgerEntries' });
  SupplierLedgerEntry.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });

  isInitialized = true;
};

export {
  Business,
  Shop,
  User,
  UserShopMembership,
  Device,
  RefreshToken,
  AuditLog,
  TaxCategory,
  Unit,
  Item,
  StockLocation,
  StockBatch,
  StockMovement,
  StockAdjustment,
  Customer,
  InvoiceNumberSequence,
  Invoice,
  InvoiceLine,
  InvoiceTaxSummary,
  Payment,
  CustomerLedgerEntry,
  CreditNote,
  Supplier,
  Purchase,
  PurchaseLine,
  SupplierLedgerEntry,
  Expense,
  CashBookEntry,
  BankBookEntry,
  SyncEvent,
  SyncConflict,
};
