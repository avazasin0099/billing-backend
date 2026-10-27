import { GstService } from '../../src/modules/gst/gst.service';

describe('GST Calculation Engine Unit Tests', () => {
  describe('isInterstate', () => {
    it('should return false when customer state code matches supplier state code', () => {
      expect(GstService.isInterstate('27', '27')).toBe(false);
    });

    it('should return true when customer state code differs from supplier state code', () => {
      expect(GstService.isInterstate('27', '29')).toBe(true);
    });

    it('should default to false (intra-state) if customer state code is undefined or empty', () => {
      expect(GstService.isInterstate('27', undefined)).toBe(false);
      expect(GstService.isInterstate('27', '')).toBe(false);
    });
  });

  describe('Tax-Exclusive Calculations', () => {
    it('should correctly calculate intra-state 18% GST (CGST 9% + SGST 9%)', () => {
      const result = GstService.calculateLine({
        unitPrice: 100,
        quantity: 2,
        isTaxInclusive: false,
        gstRate: 18,
        isInterstate: false,
      });

      expect(result.grossAmount).toBe(200);
      expect(result.taxableAmount).toBe(200);
      expect(result.cgstRate).toBe(9);
      expect(result.cgstAmount).toBe(18);
      expect(result.sgstRate).toBe(9);
      expect(result.sgstAmount).toBe(18);
      expect(result.igstAmount).toBe(0);
      expect(result.totalTaxAmount).toBe(36);
      expect(result.lineTotal).toBe(236);
    });

    it('should correctly calculate inter-state 12% GST (IGST 12%)', () => {
      const result = GstService.calculateLine({
        unitPrice: 500,
        quantity: 1,
        isTaxInclusive: false,
        gstRate: 12,
        isInterstate: true,
      });

      expect(result.grossAmount).toBe(500);
      expect(result.taxableAmount).toBe(500);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstRate).toBe(12);
      expect(result.igstAmount).toBe(60);
      expect(result.totalTaxAmount).toBe(60);
      expect(result.lineTotal).toBe(560);
    });
  });

  describe('Tax-Inclusive Calculations', () => {
    it('should correctly extract 5% GST from retail MRP', () => {
      // Tata Salt MRP 28 with 5% inclusive GST
      const result = GstService.calculateLine({
        unitPrice: 28,
        quantity: 1,
        isTaxInclusive: true,
        gstRate: 5,
        isInterstate: false,
      });

      expect(result.grossAmount).toBe(28);
      // Taxable = 28 / 1.05 = 26.67
      expect(result.taxableAmount).toBe(26.67);
      expect(result.totalTaxAmount).toBe(1.33);
      expect(result.cgstAmount).toBe(0.67);
      expect(result.sgstAmount).toBe(0.66);
      expect(result.lineTotal).toBe(28);
    });

    it('should correctly calculate 18% inclusive GST with discount', () => {
      const result = GstService.calculateLine({
        unitPrice: 100,
        quantity: 1,
        discountAmount: 10, // Net billed: 90
        isTaxInclusive: true,
        gstRate: 18,
        isInterstate: false,
      });

      expect(result.grossAmount).toBe(100);
      expect(result.discountAmount).toBe(10);
      // Taxable = 90 / 1.18 = 76.27
      expect(result.taxableAmount).toBe(76.27);
      expect(result.totalTaxAmount).toBe(13.73);
      expect(result.lineTotal).toBe(90);
    });
  });

  describe('Compensation Cess', () => {
    it('should calculate 28% GST + 12% Cess on luxury/aerated drink', () => {
      const result = GstService.calculateLine({
        unitPrice: 100,
        quantity: 1,
        isTaxInclusive: false,
        gstRate: 28,
        cessRate: 12,
        isInterstate: false,
      });

      expect(result.taxableAmount).toBe(100);
      expect(result.cgstAmount).toBe(14);
      expect(result.sgstAmount).toBe(14);
      expect(result.cessAmount).toBe(12);
      expect(result.totalTaxAmount).toBe(40);
      expect(result.lineTotal).toBe(140);
    });
  });

  describe('Invoice Aggregation & Round-Off', () => {
    it('should aggregate multi-item cart and round final rupee value correctly', () => {
      const line1 = GstService.calculateLine({
        unitPrice: 28,
        quantity: 2,
        isTaxInclusive: true,
        gstRate: 5,
        isInterstate: false,
      });
      const line2 = GstService.calculateLine({
        unitPrice: 115,
        quantity: 1,
        isTaxInclusive: true,
        gstRate: 18,
        isInterstate: false,
      });

      const invoice = GstService.calculateInvoice([line1, line2], true);

      expect(invoice.totalAmount).toBe(171); // 56 + 115 = 171
      expect(invoice.taxSummaries.length).toBe(2);
      expect(invoice.taxSummaries[0].gstRate).toBe(5);
      expect(invoice.taxSummaries[1].gstRate).toBe(18);
    });
  });
});
