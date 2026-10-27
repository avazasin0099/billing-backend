import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';

export class Shop extends Model {
  declare public id: string;
  declare public businessId: string;
  declare public name: string;
  declare public code: string;
  declare public phone?: string;
  declare public email?: string;
  declare public address?: string;
  declare public state: string;
  declare public stateCode: string;
  declare public gstin?: string;
  declare public isActive: boolean;
  declare public settings?: any;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initShopModel = () => {
  Shop.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      businessId: {
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
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Maharashtra',
      },
      stateCode: {
        type: DataTypes.STRING(2),
        allowNull: false,
        defaultValue: '27',
      },
      gstin: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      settings: {
        type: DataTypes.JSON,
        defaultValue: {
          enableNegativeStock: false,
          taxInclusiveDefault: true,
          thermalPrinterWidth: '3inch',
          invoicePrefix: 'INV',
          roundOffTotal: true,
        },
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'shops',
      underscored: true,
      timestamps: true,
    }
  );
  return Shop;
};
