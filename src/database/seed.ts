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
  Item,
  StockLocation,
  StockMovement,
  Customer,
  Supplier,
  InvoiceNumberSequence,
} from './associations';
import { UserRole, MovementType } from '../shared/constants';
import { logger } from '../config/logger';

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

    const existingItems = await Item.count();
    if (!isFresh && existingItems > 0) {
      logger.info('Database already seeded with items. Skipping initial seed.');
      return;
    }

    // 1. Create Business
    const business = await Business.create({
      name: 'Shree Ganesh Supermarket & Retail',
      tradeName: 'Ganesh Retailers',
      pan: 'AAPFU0939F',
      gstin: '27AAPFU0939F1ZV',
      email: 'owner@ganeshretail.com',
      phone: '9820123456',
      addressLine1: 'Shop No. 4-6, Station Road',
      addressLine2: 'Dadar West',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400028',
      isActive: true,
    });

    // 2. Create Primary Shop
    const shop = await Shop.create({
      businessId: business.id,
      name: 'Main Branch - Dadar',
      code: 'MUM01',
      phone: '022-24381122',
      email: 'dadar@ganeshretail.com',
      address: 'Shop No. 4-6, Station Road, Dadar West, Mumbai 400028',
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

    // 3. Create Primary Stock Location
    const location = await StockLocation.create({
      shopId: shop.id,
      name: 'Main Counter & Shelf Stock',
      code: 'STORE01',
      isPrimary: true,
    });

    // 4. Create Users (Owner, Manager, Cashier)
    const passwordHash = await bcrypt.hash('Admin@1234', 10);
    const pinHash = await bcrypt.hash('1234', 10);

    const ownerUser = await User.create({
      businessId: business.id,
      name: 'Rajesh Sharma (Owner)',
      email: 'admin@billpro.local',
      phone: '9820123456',
      passwordHash,
      pinHash,
      role: UserRole.OWNER,
      isActive: true,
    });

    const managerHash = await bcrypt.hash('Manager@1234', 10);
    const managerPin = await bcrypt.hash('2345', 10);
    const managerUser = await User.create({
      businessId: business.id,
      name: 'Kavita Patil (Manager)',
      email: 'manager@billpro.local',
      phone: '9820123457',
      passwordHash: managerHash,
      pinHash: managerPin,
      role: UserRole.MANAGER,
      isActive: true,
    });

    const cashierHash = await bcrypt.hash('Cashier@1234', 10);
    const cashierPin = await bcrypt.hash('3456', 10);
    const cashierUser = await User.create({
      businessId: business.id,
      name: 'Amit Verma (Cashier)',
      email: 'cashier@billpro.local',
      phone: '9820123458',
      passwordHash: cashierHash,
      pinHash: cashierPin,
      role: UserRole.CASHIER,
      isActive: true,
    });

    await UserShopMembership.bulkCreate([
      { userId: ownerUser.id, shopId: shop.id, role: UserRole.OWNER, isActive: true },
      { userId: managerUser.id, shopId: shop.id, role: UserRole.MANAGER, isActive: true },
      { userId: cashierUser.id, shopId: shop.id, role: UserRole.CASHIER, isActive: true },
    ]);

    // 5. Create Tax Categories
    const taxCat0 = await TaxCategory.create({ name: 'Exempt / 0% GST', taxRate: 0.0, cessRate: 0.0, description: 'Fresh essentials' });
    const taxCat5 = await TaxCategory.create({ name: '5% GST', taxRate: 5.0, cessRate: 0.0, description: 'Basic groceries and food staples' });
    const taxCat12 = await TaxCategory.create({ name: '12% GST', taxRate: 12.0, cessRate: 0.0, description: 'Dairy processed products, dry fruits' });
    const taxCat18 = await TaxCategory.create({ name: '18% GST', taxRate: 18.0, cessRate: 0.0, description: 'Confectionery, toiletries, soaps' });
    const taxCat28 = await TaxCategory.create({ name: '28% GST + 12% Cess', taxRate: 28.0, cessRate: 12.0, description: 'Aerated soft drinks' });

    // 6. Create Units
    const unitPcs = await Unit.create({ name: 'Pieces', code: 'PCS', symbol: 'pcs', isActive: true });
    await Unit.create({ name: 'Kilograms', code: 'KG', symbol: 'kg', isActive: true });
    await Unit.create({ name: 'Grams', code: 'G', symbol: 'g', isActive: true });
    await Unit.create({ name: 'Litres', code: 'LTR', symbol: 'L', isActive: true });
    await Unit.create({ name: 'Pack / Box', code: 'BOX', symbol: 'box', isActive: true });

    // 7. Create Invoice Sequence
    await InvoiceNumberSequence.create({
      shopId: shop.id,
      prefix: 'INV',
      financialYear: '2026-27',
      currentSequence: 0,
    });

    // 8. Create Demo Products & Opening Stock
    const demoItems = [
      {
        name: 'Tata Salt Iodized 1kg',
        sku: 'TS-1KG',
        barcode: '8901234567890',
        hsnCode: '25010010',
        category: 'Grocery Staples',
        purchasePrice: 22.0,
        sellingPrice: 28.0,
        mrp: 28.0,
        isTaxInclusive: true,
        gstRate: 5.0,
        cessRate: 0.0,
        currentStock: 120,
        reorderLevel: 20,
        taxCategoryId: taxCat5.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Amul Pasteurised Butter 500g',
        sku: 'AMUL-BTR-500',
        barcode: '8901262010054',
        hsnCode: '04051000',
        category: 'Dairy & Refrigerated',
        purchasePrice: 240.0,
        sellingPrice: 275.0,
        mrp: 285.0,
        isTaxInclusive: true,
        gstRate: 12.0,
        cessRate: 0.0,
        currentStock: 45,
        reorderLevel: 10,
        taxCategoryId: taxCat12.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Parle-G Gold Biscuits 1kg Family Pack',
        sku: 'PARLE-G-1KG',
        barcode: '8901719114013',
        hsnCode: '19053100',
        category: 'Snacks & Biscuits',
        purchasePrice: 102.0,
        sellingPrice: 120.0,
        mrp: 130.0,
        isTaxInclusive: true,
        gstRate: 18.0,
        cessRate: 0.0,
        currentStock: 65,
        reorderLevel: 15,
        taxCategoryId: taxCat18.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Fortune Sunlite Sunflower Oil 1L Pouch',
        sku: 'FORTUNE-OIL-1L',
        barcode: '8906007281014',
        hsnCode: '15121910',
        category: 'Edible Oils',
        purchasePrice: 142.0,
        sellingPrice: 165.0,
        mrp: 175.0,
        isTaxInclusive: true,
        gstRate: 5.0,
        cessRate: 0.0,
        currentStock: 80,
        reorderLevel: 20,
        taxCategoryId: taxCat5.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Colgate MaxFresh Red Gel Toothpaste 150g',
        sku: 'COLGATE-MF-150',
        barcode: '8901314010354',
        hsnCode: '33061020',
        category: 'Personal Care',
        purchasePrice: 94.0,
        sellingPrice: 115.0,
        mrp: 125.0,
        isTaxInclusive: true,
        gstRate: 18.0,
        cessRate: 0.0,
        currentStock: 50,
        reorderLevel: 12,
        taxCategoryId: taxCat18.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Dettol Original Bathing Soap 125g',
        sku: 'DETTOL-125G',
        barcode: '8901396001234',
        hsnCode: '34011110',
        category: 'Personal Care',
        purchasePrice: 44.0,
        sellingPrice: 55.0,
        mrp: 60.0,
        isTaxInclusive: true,
        gstRate: 18.0,
        cessRate: 0.0,
        currentStock: 90,
        reorderLevel: 25,
        taxCategoryId: taxCat18.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Maggi 2-Minute Masala Noodles 280g (4-Pack)',
        sku: 'MAGGI-4PK',
        barcode: '8901058852331',
        hsnCode: '19023010',
        category: 'Instant Food',
        purchasePrice: 40.0,
        sellingPrice: 48.0,
        mrp: 52.0,
        isTaxInclusive: true,
        gstRate: 18.0,
        cessRate: 0.0,
        currentStock: 140,
        reorderLevel: 30,
        taxCategoryId: taxCat18.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Aashirvaad Shudh Chakki Whole Wheat Atta 5kg',
        sku: 'AASHIRVAAD-5KG',
        barcode: '8901725181221',
        hsnCode: '11010000',
        category: 'Flours & Grains',
        purchasePrice: 228.0,
        sellingPrice: 260.0,
        mrp: 275.0,
        isTaxInclusive: true,
        gstRate: 5.0,
        cessRate: 0.0,
        currentStock: 40,
        reorderLevel: 10,
        taxCategoryId: taxCat5.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Coca-Cola 750ml PET Bottle',
        sku: 'COKE-750ML',
        barcode: '8901764012211',
        hsnCode: '22021010',
        category: 'Beverages',
        purchasePrice: 31.0,
        sellingPrice: 40.0,
        mrp: 40.0,
        isTaxInclusive: true,
        gstRate: 28.0,
        cessRate: 12.0,
        currentStock: 85,
        reorderLevel: 24,
        taxCategoryId: taxCat28.id,
        unitId: unitPcs.id,
      },
      {
        name: 'Farm Fresh Brown Eggs (Pack of 6)',
        sku: 'EGGS-6PK',
        barcode: '8909988776655',
        hsnCode: '04072100',
        category: 'Fresh Food',
        purchasePrice: 34.0,
        sellingPrice: 42.0,
        mrp: 45.0,
        isTaxInclusive: true,
        gstRate: 0.0,
        cessRate: 0.0,
        currentStock: 60,
        reorderLevel: 15,
        taxCategoryId: taxCat0.id,
        unitId: unitPcs.id,
      },
    ];

    for (const itemData of demoItems) {
      const createdItem = await Item.create({
        ...itemData,
        shopId: shop.id,
        isActive: true,
      });

      // Log opening stock movement
      await StockMovement.create({
        shopId: shop.id,
        itemId: createdItem.id,
        locationId: location.id,
        movementType: MovementType.OPENING_STOCK,
        quantity: itemData.currentStock,
        unitCost: itemData.purchasePrice,
        referenceType: 'OPENING_BALANCE',
        referenceId: createdItem.id,
        notes: 'Initial store inventory opening balance',
        createdBy: ownerUser.id,
      });
    }

    // 9. Create Demo Customers
    await Customer.create({
      shopId: shop.id,
      name: 'Walk-in Retail Customer',
      phone: '0000000000',
      state: 'Maharashtra',
      stateCode: '27',
      creditLimit: 0,
      currentBalance: 0,
      isActive: true,
    });

    await Customer.create({
      shopId: shop.id,
      name: 'Suresh Patil (Udhaar Account)',
      phone: '9820112233',
      email: 'suresh.patil@gmail.com',
      billingAddress: 'Flat 302, Sai Kripa Apts, Dadar West',
      state: 'Maharashtra',
      stateCode: '27',
      creditLimit: 5000.0,
      currentBalance: 450.0, // Existing credit balance
      isActive: true,
    });

    await Customer.create({
      shopId: shop.id,
      name: 'Modern Bakers & Confectioners',
      phone: '9821556677',
      email: 'orders@modernbakers.in',
      gstin: '27AABCM8891P1ZO',
      billingAddress: 'Unit 12, Industrial Estate, Mahim West, Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      creditLimit: 25000.0,
      currentBalance: 0.0,
      isActive: true,
    });

    // 10. Create Demo Suppliers
    await Supplier.create({
      shopId: shop.id,
      name: 'Metro Cash & Carry Wholesalers',
      companyName: 'Metro Wholesale India Pvt Ltd',
      phone: '022-67891234',
      email: 'orders@metro-wholesale.co.in',
      gstin: '27AAACM1234L1ZX',
      address: 'Plot 45, MIDC Industrial Area, Turbhe, Navi Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      currentBalance: 12450.0, // Pending payable
      isActive: true,
    });

    await Supplier.create({
      shopId: shop.id,
      name: 'Hindustan Consumer Agency',
      companyName: 'Hindustan Consumer Products Dist Ltd',
      phone: '022-26123456',
      email: 'hca.distributors@gmail.com',
      gstin: '27AAACH8899M1ZQ',
      address: 'Gala 5, Wholesale Bhavan, Cotton Green, Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      currentBalance: 0.0,
      isActive: true,
    });

    logger.info('Database seeded successfully with realistic retail data!');
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
