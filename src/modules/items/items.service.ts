import { Op } from 'sequelize';
import { Item, TaxCategory, Unit, StockMovement, StockLocation } from '../../database/associations';
import { AppError } from '../../shared/errors/app-error';
import { MovementType } from '../../shared/constants';

export class ItemsService {
  public static async listItems(
    shopId: string,
    query: {
      search?: string;
      category?: string;
      isActive?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { sku: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { barcode: { [Op.iLike ? Op.iLike : Op.like]: term } },
        { hsnCode: { [Op.iLike ? Op.iLike : Op.like]: term } },
      ];
    }

    const { rows, count } = await Item.findAndCountAll({
      where,
      limit,
      offset,
      order: [['name', 'ASC']],
      include: [
        { model: TaxCategory, as: 'taxCategory', attributes: ['id', 'name', 'taxRate', 'cessRate'] },
        { model: Unit, as: 'unit', attributes: ['id', 'name', 'code', 'symbol'] },
      ],
    });

    return {
      items: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async getItemById(shopId: string, itemId: string) {
    const item = await Item.findOne({
      where: { id: itemId, shopId },
      include: [
        { model: TaxCategory, as: 'taxCategory' },
        { model: Unit, as: 'unit' },
      ],
    });

    if (!item) {
      throw AppError.notFound('Item not found');
    }

    return item;
  }

  public static async createItem(
    shopId: string,
    userId: string,
    data: {
      name: string;
      sku?: string;
      barcode?: string;
      hsnCode?: string;
      category?: string;
      purchasePrice: number;
      sellingPrice: number;
      mrp: number;
      isTaxInclusive?: boolean;
      gstRate?: number;
      cessRate?: number;
      openingStock?: number;
      reorderLevel?: number;
      trackBatches?: boolean;
      taxCategoryId?: string;
      unitId?: string;
      imageUrl?: string;
    }
  ) {
    const sku = data.sku || `SKU-${Date.now().toString().slice(-6)}`;

    // Verify barcode uniqueness within shop if provided
    if (data.barcode) {
      const existing = await Item.findOne({ where: { shopId, barcode: data.barcode } });
      if (existing) {
        throw AppError.conflict(`An item with barcode "${data.barcode}" already exists`);
      }
    }

    const item = await Item.create({
      shopId,
      name: data.name,
      sku,
      barcode: data.barcode,
      hsnCode: data.hsnCode,
      category: data.category || 'General',
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      mrp: data.mrp,
      isTaxInclusive: data.isTaxInclusive !== false,
      gstRate: data.gstRate || 0,
      cessRate: data.cessRate || 0,
      currentStock: data.openingStock || 0,
      reorderLevel: data.reorderLevel || 0,
      trackBatches: !!data.trackBatches,
      taxCategoryId: data.taxCategoryId,
      unitId: data.unitId,
      imageUrl: data.imageUrl,
      isActive: true,
    });

    // If opening stock provided, log movement
    if (data.openingStock && data.openingStock > 0) {
      const location = await StockLocation.findOne({ where: { shopId, isPrimary: true } });
      await StockMovement.create({
        shopId,
        itemId: item.id,
        locationId: location?.id,
        movementType: MovementType.OPENING_STOCK,
        quantity: data.openingStock,
        unitCost: data.purchasePrice,
        referenceType: 'OPENING_BALANCE',
        referenceId: item.id,
        notes: 'Initial inventory setup',
        createdBy: userId,
      });
    }

    return item;
  }

  public static async updateItem(
    shopId: string,
    itemId: string,
    data: Partial<{
      name: string;
      sku: string;
      barcode: string;
      hsnCode: string;
      category: string;
      purchasePrice: number;
      sellingPrice: number;
      mrp: number;
      isTaxInclusive: boolean;
      gstRate: number;
      cessRate: number;
      reorderLevel: number;
      trackBatches: boolean;
      taxCategoryId: string;
      unitId: string;
      isActive: boolean;
      imageUrl: string;
    }>
  ) {
    const item = await Item.findOne({ where: { id: itemId, shopId } });
    if (!item) {
      throw AppError.notFound('Item not found');
    }

    await item.update(data);
    return item;
  }

  public static async getCategoriesAndUnits() {
    const taxCategories = await TaxCategory.findAll({ where: { isActive: true } });
    const units = await Unit.findAll({ where: { isActive: true } });
    return { taxCategories, units };
  }

  public static async bulkImport(shopId: string, userId: string, items: any[]) {
    let createdCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i];
        await this.createItem(shopId, userId, {
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          hsnCode: item.hsnCode,
          category: item.category,
          purchasePrice: Number(item.purchasePrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          mrp: Number(item.mrp) || Number(item.sellingPrice) || 0,
          gstRate: Number(item.gstRate) || 0,
          openingStock: Number(item.openingStock) || 0,
        });
        createdCount++;
      } catch (err: any) {
        errors.push({ row: i + 1, error: err.message });
      }
    }

    return { createdCount, errors };
  }
}
