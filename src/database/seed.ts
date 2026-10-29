import bcrypt from 'bcryptjs';
import { initSequelize } from '../config/database';
import {
  initializeDatabaseModels,
  Business,
  Shop,
  User,
  UserShopMembership,
  TaxCategory,
  Unit,
  StockLocation,
  InvoiceNumberSequence,
} from './associations';
import { UserRole } from '../shared/constants';
import { logger } from '../config/logger';

/**
 * Bootstrap seed — creates only the minimum needed to use the app:
 *   - one OWNER login
 *   - an empty business + shop (edit the details in-app)
 *   - standard Indian GST tax categories
 *   - common units of measure
 *
 * It intentionally seeds NO demo products, customers, suppliers, or stock.
 * Run with `--fresh` to drop and recreate all tables before seeding.
 */
export const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');
    const sequelize = await initSequelize();
    initializeDatabaseModels();
    await sequelize.sync();

    const isFresh = process.argv.includes('--fresh');
    if (isFresh) {
      logger.info('Fresh flag detected. Dropping and recreating tables...');
      await sequelize.sync({ force: true });
    }

    // Idempotency guard: if an owner already exists, bootstrap is already done.
    const existingUsers = await User.count();
    if (!isFresh && existingUsers > 0) {
      logger.info('Database already initialized. Skipping bootstrap seed.');
      return;
    }

    // 1. Business (placeholder details — edit these in the app)
    const business = await Business.create({
      name: 'My Business',
      tradeName: 'My Business',
      pan: 'AAPFU0939F',
      gstin: '27AAPFU0939F1ZV',
      email: 'owner@billpro.local',
      phone: '9999999999',
      addressLine1: 'Address line 1',
      addressLine2: '',
      city: 'City',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400001',
      isActive: true,
    });

    // 2. Primary Shop (empty — no products/customers/suppliers)
    const shop = await Shop.create({
      businessId: business.id,
      name: 'Main Shop',
      code: 'SHOP01',
      phone: '9999999999',
      email: 'shop@billpro.local',
      address: 'Address line 1, City',
      state: 'Maharashtra',
      stateCode: '27',
      gstin: '27AAPFU0939F1ZV',
      isActive: true,
      settings: {
        enableNegativeStock: false,
        taxInclusiveDefault: true,
        thermalPrinterWidth: '3inch',
        invoicePrefix: 'INV',
        roundOffTotal: true,
      },
    });

    // 3. Primary Stock Location
    await StockLocation.create({
      shopId: shop.id,
      name: 'Main Counter',
      code: 'STORE01',
      isPrimary: true,
    });

    // 4. Owner login
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);
    const ownerUser = await User.create({
      businessId: business.id,
      name: 'Administrator',
      email: 'admin@billpro.local',
      phone: '9999999999',
      passwordHash,
      pinHash,
      role: UserRole.OWNER,
      isActive: true,
    });

    await UserShopMembership.create({
      userId: ownerUser.id,
      shopId: shop.id,
      role: UserRole.OWNER,
      isActive: true,
    });

    // 5. Standard Indian GST tax categories
    await TaxCategory.create({ name: 'Exempt / 0% GST', taxRate: 0.0, cessRate: 0.0, description: '0% GST' });
    await TaxCategory.create({ name: '5% GST', taxRate: 5.0, cessRate: 0.0, description: '5% GST' });
    await TaxCategory.create({ name: '12% GST', taxRate: 12.0, cessRate: 0.0, description: '12% GST' });
    await TaxCategory.create({ name: '18% GST', taxRate: 18.0, cessRate: 0.0, description: '18% GST' });
    await TaxCategory.create({ name: '28% GST + 12% Cess', taxRate: 28.0, cessRate: 12.0, description: '28% GST + cess' });

    // 6. Common units of measure
    await Unit.create({ name: 'Pieces', code: 'PCS', symbol: 'pcs', isActive: true });
    await Unit.create({ name: 'Kilograms', code: 'KG', symbol: 'kg', isActive: true });
    await Unit.create({ name: 'Grams', code: 'G', symbol: 'g', isActive: true });
    await Unit.create({ name: 'Litres', code: 'LTR', symbol: 'L', isActive: true });
    await Unit.create({ name: 'Pack / Box', code: 'BOX', symbol: 'box', isActive: true });

    // 7. Invoice numbering sequence
    await InvoiceNumberSequence.create({
      shopId: shop.id,
      prefix: 'INV',
      financialYear: '2026-27',
      currentSequence: 0,
    });

    logger.info('Bootstrap seed complete: owner login + empty shop + tax categories + units.');
  } catch (error: any) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase().then(() => {
    logger.info('Seeding finished. Exiting.');
    process.exit(0);
  });
}
