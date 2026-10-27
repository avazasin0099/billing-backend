export interface GstLineCalculationInput {
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  isTaxInclusive: boolean;
  gstRate: number; // e.g. 5, 12, 18, 28
  cessRate?: number; // e.g. 12
  isInterstate: boolean;
}

export interface GstLineCalculationResult {
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  grossAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTaxAmount: number;
  lineTotal: number;
}

export interface InvoiceTaxSummaryItem {
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  totalTax: number;
}

export class GstService {
  /**
   * Deterministically round monetary value to 2 decimal places using half-up method.
   */
  public static round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Determines if transaction is interstate based on 2-digit Indian State Codes.
   */
  public static isInterstate(supplierStateCode: string, customerStateCode?: string): boolean {
    if (!customerStateCode || customerStateCode.trim() === '') {
      return false; // Default to intra-state for walk-in B2C retail
    }
    return supplierStateCode.trim() !== customerStateCode.trim();
  }

  /**
   * Calculates GST breakdown for an individual line item.
   */
  public static calculateLine(input: GstLineCalculationInput): GstLineCalculationResult {
    const {
      unitPrice,
      quantity,
      discountAmount = 0,
      isTaxInclusive,
      gstRate,
      cessRate = 0,
      isInterstate,
    } = input;

    const grossAmount = this.round(unitPrice * quantity);
    const netBilled = Math.max(0, grossAmount - discountAmount);

    let taxableAmount: number;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    const effectiveTotalRate = gstRate + cessRate;

    if (isTaxInclusive) {
      // Tax-Inclusive formula: Taxable = Net / (1 + (Rate / 100))
      taxableAmount = this.round(netBilled / (1 + effectiveTotalRate / 100));
      const totalTaxPlusCess = this.round(netBilled - taxableAmount);

      if (effectiveTotalRate > 0) {
        const gstProportion = gstRate / effectiveTotalRate;
        const totalGst = this.round(totalTaxPlusCess * gstProportion);
        cessAmount = this.round(totalTaxPlusCess - totalGst);

        if (isInterstate) {
          igstAmount = totalGst;
        } else {
          cgstAmount = this.round(totalGst / 2);
          sgstAmount = this.round(totalGst - cgstAmount); // Avoid half-cent discrepancy
        }
      }
    } else {
      // Tax-Exclusive formula: Taxable = Net; Tax is added on top
      taxableAmount = this.round(netBilled);

      if (gstRate > 0) {
        if (isInterstate) {
          igstAmount = this.round(taxableAmount * (gstRate / 100));
        } else {
          const halfRate = gstRate / 2;
          cgstAmount = this.round(taxableAmount * (halfRate / 100));
          sgstAmount = this.round(taxableAmount * (halfRate / 100));
        }
      }

      if (cessRate > 0) {
        cessAmount = this.round(taxableAmount * (cessRate / 100));
      }
    }

    const totalTaxAmount = this.round(cgstAmount + sgstAmount + igstAmount + cessAmount);
    const lineTotal = this.round(taxableAmount + totalTaxAmount);

    return {
      unitPrice,
      quantity,
      discountAmount,
      grossAmount,
      taxableAmount,
      gstRate,
      cgstRate: isInterstate ? 0 : this.round(gstRate / 2),
      cgstAmount,
      sgstRate: isInterstate ? 0 : this.round(gstRate / 2),
      sgstAmount,
      igstRate: isInterstate ? gstRate : 0,
      igstAmount,
      cessRate,
      cessAmount,
      totalTaxAmount,
      lineTotal,
    };
  }

  /**
   * Aggregates line calculations into bill totals and tax summaries by GST bracket.
   */
  public static calculateInvoice(
    lines: GstLineCalculationResult[],
    roundOff = true
  ): {
    subtotalAmount: number;
    discountAmount: number;
    taxableAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    cessAmount: number;
    totalTaxAmount: number;
    roundOffAmount: number;
    totalAmount: number;
    taxSummaries: InvoiceTaxSummaryItem[];
  } {
    let subtotalAmount = 0;
    let discountAmount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let cessAmount = 0;

    const rateBuckets = new Map<number, InvoiceTaxSummaryItem>();

    for (const line of lines) {
      subtotalAmount = this.round(subtotalAmount + line.grossAmount);
      discountAmount = this.round(discountAmount + line.discountAmount);
      taxableAmount = this.round(taxableAmount + line.taxableAmount);
      cgstAmount = this.round(cgstAmount + line.cgstAmount);
      sgstAmount = this.round(sgstAmount + line.sgstAmount);
      igstAmount = this.round(igstAmount + line.igstAmount);
      cessAmount = this.round(cessAmount + line.cessAmount);

      const existing = rateBuckets.get(line.gstRate) || {
        gstRate: line.gstRate,
        taxableAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cessAmount: 0,
        totalTax: 0,
      };

      existing.taxableAmount = this.round(existing.taxableAmount + line.taxableAmount);
      existing.cgstAmount = this.round(existing.cgstAmount + line.cgstAmount);
      existing.sgstAmount = this.round(existing.sgstAmount + line.sgstAmount);
      existing.igstAmount = this.round(existing.igstAmount + line.igstAmount);
      existing.cessAmount = this.round(existing.cessAmount + line.cessAmount);
      existing.totalTax = this.round(
        existing.cgstAmount + existing.sgstAmount + existing.igstAmount + existing.cessAmount
      );

      rateBuckets.set(line.gstRate, existing);
    }

    const totalTaxAmount = this.round(cgstAmount + sgstAmount + igstAmount + cessAmount);
    const unroundedTotal = this.round(taxableAmount + totalTaxAmount);

    let roundOffAmount = 0;
    let totalAmount = unroundedTotal;

    if (roundOff) {
      totalAmount = Math.round(unroundedTotal);
      roundOffAmount = this.round(totalAmount - unroundedTotal);
    }

    return {
      subtotalAmount,
      discountAmount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalTaxAmount,
      roundOffAmount,
      totalAmount,
      taxSummaries: Array.from(rateBuckets.values()).sort((a, b) => a.gstRate - b.gstRate),
    };
  }
}
