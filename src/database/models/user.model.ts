import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';
import { UserRole } from '../../shared/constants';

export class User extends Model {
  declare public id: string;
  declare public businessId: string;
  declare public name: string;
  declare public email: string;
  declare public phone?: string;
  declare public passwordHash: string;
  declare public pinHash?: string;
  declare public role: UserRole;
  declare public isActive: boolean;
  declare public lastLoginAt?: Date;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initUserModel = () => {
  User.init(
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pinHash: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER),
        defaultValue: UserRole.CASHIER,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'users',
      underscored: true,
      timestamps: true,
    }
  );
  return User;
};
