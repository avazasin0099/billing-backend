import { Op, Sequelize } from 'sequelize';
import { Item, StockMovement, StockAdjustment, StockLocation, User } from '../../database/associations';
import { getSequelize } from '../../config/database';
import { AppError } from '../../shared/errors/app-error';
import { MovementType, AdjustmentReason } from '../../shared/constants';

export class InventoryService {
  public static async getInventorySummary(shopId: string) {
    const items = await Item.findAll({
      where: { shopId, isActive: true },
      attributes: ['id', 'currentStock', 'purchasePrice', 'sellingPrice', 'reorderLevel'],
    });

    let totalItemsCount = items.length;
    let totalStockUnits = 0;
    let totalPurchaseValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;

    for (const item of items) {
      const stock = Number(item.currentStock) || 0;
      const purchasePrice = Number(item.purchasePrice) || 0;
      const sellingPrice = Number(item.sellingPrice) || 0;
      const reorderLevel = Number(item.reorderLevel) || 0;

      totalStockUnits += stock;
      totalPurchaseValuation += stock * purchasePrice;
      totalRetailValuation += stock * sellingPrice;

      if (stock <= reorderLevel) {
        lowStockCount++;
      }
    }

    return {
      totalItemsCount,
      totalStockUnits: Math.round(totalStockUnits * 100) / 100,
      totalPurchaseValuation: Math.round(totalPurchaseValuation * 100) / 100,
      totalRetailValuation: Math.round(totalRetailValuation * 100) / 100,
      lowStockCount,
    };
  }

  public static async getLowStockAlerts(shopId: string) {
    const items = await Item.findAll({
      where: {
        shopId,
        isActive: true,
        [Op.and]: [
          Sequelize.where(
            Sequelize.col('current_stock'),
            '<=',
            Sequelize.col('reorder_level')
          ),
        ],
      },
      order: [['currentStock', 'ASC']],
    });

    return items;
  }

  public static async getStockMovements(
    shopId: string,
    query: { itemId?: string; movementType?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: any = { shopId };
    if (query.itemId) where.itemId = query.itemId;
    if (query.movementType) where.movementType = query.movementType;

    const { rows, count } = await StockMovement.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Item, as: 'item', attributes: ['id', 'name', 'sku', 'barcode'] },
      ],
    });

    return {
      movements: rows,
      pagination: {
        page,
        limit,
        totalItems: count,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  public static async adjustStock(
    shopId: string,
    userId: string,
    data: {
      itemId: string;
      physicalQty: number;
      reason: AdjustmentReason;
      notes?: string;
    }
  ) {
    const sequelize = getSequelize();
    const transaction = await sequelize.transaction();

    try {
      const item = await Item.findOne({
        where: { id: data.itemId, shopId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!item) {
        throw AppError.notFound('Item not found');
      }

      const systemQty = Number(item.currentStock);
      const physicalQty = Number(data.physicalQty);
      const varianceQty = physicalQty - systemQty;

      if (varianceQty === 0) {
        throw AppError.badRequest('Physical quantity is identical to current system quantity');
      }

      const location = await StockLocation.findOne({
        where: { shopId, isPrimary: true },
        transaction,
      });

      // 1. Create Stock Adjustment record
      const adjustment = await StockAdjustment.create(
        {
          shopId,
          itemId: item.id,
          locationId: location?.id,
          systemQty,
          physicalQty,
          varianceQty,
          reason: data.reason,
          notes: data.notes,
          approvedBy: userId,
        },
        { transaction }
      );

      // 2. Create Stock Movement audit row
      const movementType = varianceQty > 0 ? MovementType.ADJUSTMENT_IN : MovementType.ADJUSTMENT_OUT;
      await StockMovement.create(
        {
          shopId,
          itemId: item.id,
          locationId: location?.id,
          movementType,
          quantity: varianceQty,
          unitCost: Number(item.purchasePrice),
          referenceType: 'ADJUSTMENT',
          referenceId: adjustment.id,
          notes: `Stock count adjustment: ${data.reason}. ${data.notes || ''}`,
          createdBy: userId,
        },
        { transaction }
      );

      // 3. Update Item currentStock
      item.currentStock = physicalQty;
      await item.save({ transaction });

      await transaction.commit();
      return { adjustment, item };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
