import { DataTypes, Model } from 'sequelize';
import { getSequelize } from '../../config/database';
import { UserRole } from '../../shared/constants';

export class UserShopMembership extends Model {
  declare public id: string;
  declare public userId: string;
  declare public shopId: string;
  declare public role: UserRole;
  declare public isActive: boolean;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

export const initUserShopMembershipModel = () => {
  UserShopMembership.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER),
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'user_shop_memberships',
      underscored: true,
      timestamps: true,
    }
  );
  return UserShopMembership;
};

export class Device extends Model {
  declare public id: string;
  declare public shopId: string;
  declare public deviceCode: string;
  declare public name: string;
  declare public deviceType: string;
  declare public clientVersion?: string;
  declare public lastSeenAt?: Date;
  declare public isActive: boolean;
}

export const initDeviceModel = () => {
  Device.init(
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
      deviceCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      deviceType: {
        type: DataTypes.STRING(20),
        defaultValue: 'BROWSER',
      },
      clientVersion: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      lastSeenAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'devices',
      underscored: true,
      timestamps: true,
    }
  );
  return Device;
};

export class RefreshToken extends Model {
  declare public id: string;
  declare public userId: string;
  declare public token: string;
  declare public expiresAt: Date;
  declare public isRevoked: boolean;
  declare public replacedByToken?: string;
}

export const initRefreshTokenModel = () => {
  RefreshToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      isRevoked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      replacedByToken: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'refresh_tokens',
      underscored: true,
      timestamps: true,
    }
  );
  return RefreshToken;
};

export class AuditLog extends Model {
  declare public id: string;
  declare public shopId?: string;
  declare public userId?: string;
  declare public action: string;
  declare public entityName: string;
  declare public entityId?: string;
  declare public oldValues?: any;
  declare public newValues?: any;
  declare public ipAddress?: string;
  declare public userAgent?: string;
}

export const initAuditLogModel = () => {
  AuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entityId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      oldValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      newValues: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize: getSequelize(),
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );
  return AuditLog;
};
