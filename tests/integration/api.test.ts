import request from 'supertest';
import { createApp } from '../../src/app';
import { initSequelize } from '../../src/config/database';
import { initializeDatabaseModels } from '../../src/database/associations';
import { seedDatabase } from '../../src/database/seed';

let app: any;

beforeAll(async () => {
  await initSequelize();
  initializeDatabaseModels();
  await seedDatabase();
  app = createApp();
});

describe('Bill Pro Integration Tests', () => {
  let token: string;
  let shopId: string;
  let sampleItemId: string;

  describe('1. Health and Authentication', () => {
    it('GET /api/v1/health should return UP status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
    });

    it('POST /api/v1/auth/login should authenticate owner and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@billpro.local', password: 'Admin@1234' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();

      token = res.body.data.tokens.accessToken;
      shopId = res.body.data.shop.id;
    });

    it('POST /api/v1/auth/pin-login should authenticate cashier via PIN', async () => {
      const res = await request(app)
        .post('/api/v1/auth/pin-login')
        .send({ pin: '3456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('CASHIER');
    });
  });

  describe('2. Catalog and Items', () => {
    it('GET /api/v1/items should list items seeded in database', async () => {
      const res = await request(app)
        .get('/api/v1/items')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      sampleItemId = res.body.data[0].id;
    });

    it('GET /api/v1/inventory/summary should return stock valuation', async () => {
      const res = await request(app)
        .get('/api/v1/inventory/summary')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      expect(res.status).toBe(200);
      expect(res.body.data.totalStockUnits).toBeGreaterThan(0);
    });
  });

  describe('3. Invoicing and Split Payment Flow', () => {
    it('POST /api/v1/invoices should create invoice with split payment and deduct stock', async () => {
      // Fetch initial stock
      const itemBefore = await request(app)
        .get(`/api/v1/items/${sampleItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      const stockBefore = Number(itemBefore.body.data.currentStock);

      // Fetch customer
      const customersRes = await request(app)
        .get('/api/v1/parties/customers')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      const customer = customersRes.body.data[0];

      const itemSellingPrice = Number(itemBefore.body.data.sellingPrice);
      const totalBill = itemSellingPrice * 2;
      const cashPart = Math.floor(totalBill / 2);
      const upiPart = totalBill - cashPart;

      const invoicePayload = {
        customerId: customer?.id,
        invoiceDate: '2026-10-25',
        items: [{ itemId: sampleItemId, quantity: 2, discountAmount: 0 }],
        payments: [
          { paymentMethod: 'CASH', amount: cashPart },
          { paymentMethod: 'UPI', amount: upiPart, transactionReference: 'UPI123456' },
        ],
      };

      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId)
        .send(invoicePayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.invoiceNumber).toMatch(/^INV\//);
      expect(res.body.data.lines.length).toBe(1);

      // Verify stock deducted by 2
      const itemAfter = await request(app)
        .get(`/api/v1/items/${sampleItemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      const stockAfter = Number(itemAfter.body.data.currentStock);
      expect(stockAfter).toBe(stockBefore - 2);
    });
  });

  describe('4. Reports and Financial Statements', () => {
    it('GET /api/v1/reports/sales should return sales aggregate with payment methods', async () => {
      const res = await request(app)
        .get('/api/v1/reports/sales')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      expect(res.status).toBe(200);
      expect(res.body.data.totalInvoices).toBeGreaterThan(0);
      expect(res.body.data.paymentMethodTotals.CASH).toBeGreaterThanOrEqual(20);
      expect(res.body.data.paymentMethodTotals.UPI).toBeGreaterThanOrEqual(36);
    });

    it('GET /api/v1/reports/gst should provide GSTR breakdown', async () => {
      const res = await request(app)
        .get('/api/v1/reports/gst')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Shop-Id', shopId);

      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalInvoices).toBeGreaterThan(0);
    });
  });
});
