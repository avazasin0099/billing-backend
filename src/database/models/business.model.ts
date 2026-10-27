import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';

export class Business extends Model {
  declare public id: string;
  declare public name: string;
  declare public tradeName?: string;
  declare public pan?: string;
  declare public gstin?: string;
  declare public email?: string;
  declare public phone?: string;
  declare public addressLine1?: string;
  declare public addressLine2?: string;
  declare public city?: string;
  declare public state?: string;
  declare public stateCode?: string;
  declare public pincode?: string;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initBusinessModel = () => {
  Business.init(
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
      tradeName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pan: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      gstin: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      addressLine1: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      addressLine2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      stateCode: {
        type: DataTypes.STRING(2),
        allowNull: true,
      },
      pincode: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'businesses',
      underscored: true,
      timestamps: true,
    }
  );
  return Business;
};
