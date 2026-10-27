export enum UserRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CREDIT = 'CREDIT',
  OTHER = 'OTHER'
}

export enum InvoiceType {
  TAX_INVOICE = 'TAX_INVOICE',
  BILL_OF_SUPPLY = 'BILL_OF_SUPPLY',
  PROFORMA = 'PROFORMA',
  QUOTATION = 'QUOTATION'
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID'
}

export enum MovementType {
  OPENING_STOCK = 'OPENING_STOCK',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  SALE_RETURN = 'SALE_RETURN',
  PURCHASE_RETURN = 'PURCHASE_RETURN',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  STOCK_TAKE = 'STOCK_TAKE',
  OFFLINE_OVERDRAFT = 'OFFLINE_OVERDRAFT'
}

export enum AdjustmentReason {
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  FOUND = 'FOUND',
  THEFT = 'THEFT',
  STOCK_TAKE_CORRECTION = 'STOCK_TAKE_CORRECTION',
  OTHER = 'OTHER'
}

export enum LedgerEntryType {
  INVOICE = 'INVOICE',
  PAYMENT = 'PAYMENT',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  OPENING_BALANCE = 'OPENING_BALANCE',
  ADJUSTMENT = 'ADJUSTMENT'
}

export const INDIAN_STATES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh (New)',
  '38': 'Ladakh'
};
