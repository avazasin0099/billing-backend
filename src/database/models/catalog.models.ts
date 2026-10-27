import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';
import { MovementType, AdjustmentReason } from '../../shared/constants';

export class TaxCategory extends Model {
  declare public id: string;
  declare public name: string;
  declare public taxRate: number;
  declare public cessRate: number;
  declare public hsnSac?: string;
  declare public description?: string;
  declare public isActive: boolean;
}

export const initTaxCategoryModel = () => {
  TaxCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      cessRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      hsnSac: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'tax_categories',
      underscored: true,
      timestamps: true,
    }
  );
  return TaxCategory;
};

export class Unit extends Model {
  declare public id: string;
  declare public name: string;
  declare public code: string;
  declare public symbol: string;
  declare public isActive: boolean;
}

export const initUnitModel = () => {
  Unit.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      code: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      symbol: {
        type: DataTypes.STRING(10),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'units',
      underscored: true,
      timestamps: true,
    }
  );
  return Unit;
};

export class Item extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public taxCategoryId?: string;
  declare public unitId?: string;
  declare public name: string;
  declare public sku: string;
  declare public barcode?: string;
  declare public hsnCode?: string;
  declare public category?: string;
  declare public purchasePrice: number;
  declare public sellingPrice: number;
  declare public mrp: number;
  declare public isTaxInclusive: boolean;
  declare public gstRate: number;
  declare public cessRate: number;
  declare public currentStock: number;
  declare public reorderLevel: number;
  declare public trackBatches: boolean;
  declare public isActive: boolean;
  declare public imageUrl?: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initItemModel = () => {
  Item.init(
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
      taxCategoryId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      unitId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      barcode: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      hsnCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      purchasePrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      sellingPrice: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      mrp: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      isTaxInclusive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      gstRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
      },
      cessRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
      },
      currentStock: {
        type: DataTypes.DECIMAL(14, 4),
        defaultValue: 0.0000,
      },
      reorderLevel: {
        type: DataTypes.DECIMAL(14, 4),
        defaultValue: 0.0000,
      },
      trackBatches: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'items',
      underscored: true,
      timestamps: true,
    }
  );
  return Item;
};

export class StockLocation extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public name: string;
  declare public code: string;
  declare public isPrimary: boolean;
}

export const initStockLocationModel = () => {
  StockLocation.init(
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
      code: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'stock_locations',
      underscored: true,
      timestamps: true,
    }
  );
  return StockLocation;
};

export class StockBatch extends Model {
  declare public id: string;
  declare public itemId: string;
  declare public batchNumber: string;
  declare public quantity: number;
  declare public purchaseCost: number;
  declare public mrp: number;
  declare public manufacturingDate?: Date;
  declare public expiryDate?: Date;
}

export const initStockBatchModel = () => {
  StockBatch.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      batchNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 4),
        defaultValue: 0.0000,
      },
      purchaseCost: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      mrp: {
        type: DataTypes.DECIMAL(12, 2),
        defaultValue: 0.00,
      },
      manufacturingDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'stock_batches',
      underscored: true,
      timestamps: true,
    }
  );
  return StockBatch;
};

export class StockMovement extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public itemId: string;
  declare public locationId?: string;
  declare public movementType: MovementType;
  declare public quantity: number;
  declare public unitCost: number;
  declare public referenceType: string;
  declare public referenceId?: string;
  declare public notes?: string;
  declare public createdBy?: string;
  declare public readonly createdAt: Date;
}

export const initStockMovementModel = () => {
  StockMovement.init(
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
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      movementType: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      unitCost: {
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
      tableName: 'stock_movements',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return StockMovement;
};

export class StockAdjustment extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public itemId: string;
  declare public locationId?: string;
  declare public systemQty: number;
  declare public physicalQty: number;
  declare public varianceQty: number;
  declare public reason: AdjustmentReason;
  declare public notes?: string;
  declare public approvedBy?: string;
}

export const initStockAdjustmentModel = () => {
  StockAdjustment.init(
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
      itemId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      systemQty: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      physicalQty: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      varianceQty: {
        type: DataTypes.DECIMAL(14, 4),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'stock_adjustments',
      underscored: true,
      timestamps: true,
    }
  );
  return StockAdjustment;
};
