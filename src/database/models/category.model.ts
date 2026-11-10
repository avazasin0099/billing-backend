import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';

/**
 * Product category, managed per shop. Items reference a category by its name string
 * (see Item.category), so renaming here does not rewrite historical items — the name is the key.
 * Seeded at signup from the owner's chosen business type, and extendable from the Add Item screen.
 */
export class Category extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public name: string;
  declare public businessType?: string;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initCategoryModel = () => {
  Category.init(
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
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      businessType: {
        type: DataTypes.STRING(40),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'categories',
      underscored: true,
      timestamps: true,
      indexes: [
        // One category name per shop (case handled at the service layer).
        { unique: true, fields: ['shop_id', 'name'] },
      ],
    }
  );
  return Category;
};
