import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import {
  Business,
  Shop,
  User,
  UserShopMembership,
  RefreshToken,
  StockLocation,
  InvoiceNumberSequence,
} from '../../database/associations';
import { UserRole } from '../../shared/constants';

export class AuthService {
  private static generateTokens(user: User, shopId: string) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      shopId,
      businessId: user.businessId,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET as string, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    const refreshToken = jwt.sign(
      { id: user.id, tokenType: 'refresh' },
      env.JWT_REFRESH_SECRET as string,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  public static async signup(data: {
    businessName: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
  }) {
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    // 1. Create Business
    const business = await Business.create({
      name: data.businessName,
      email: data.email,
      phone: data.phone,
      gstin: data.gstin,
      state: data.state || 'Maharashtra',
      stateCode: data.stateCode || '27',
      isActive: true,
    });

    // 2. Create Primary Shop
    const shop = await Shop.create({
      businessId: business.id,
      name: `${data.businessName} (Main Branch)`,
      code: 'STORE01',
      phone: data.phone,
      email: data.email,
      state: data.state || 'Maharashtra',
      stateCode: data.stateCode || '27',
      gstin: data.gstin,
      isActive: true,
      settings: {
        enableNegativeStock: false,
        taxInclusiveDefault: true,
        thermalPrinterWidth: '3inch',
        invoicePrefix: 'INV',
        roundOffTotal: true,
      },
    });

    // 3. Create default primary location and invoice sequence
    await StockLocation.create({
      shopId: shop.id,
      name: 'Main Counter & Store',
      code: 'LOC01',
      isPrimary: true,
    });

    await InvoiceNumberSequence.create({
      shopId: shop.id,
      prefix: 'INV',
      financialYear: '2026-27',
      currentSequence: 0,
    });

    // 4. Create Owner User
    const passwordHash = await bcrypt.hash(data.password, 10);
    const pinHash = await bcrypt.hash('1234', 10); // Default PIN

    const user = await User.create({
      businessId: business.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      pinHash,
      role: UserRole.OWNER,
      isActive: true,
      lastLoginAt: new Date(),
    });

    // 5. Create Membership
    await UserShopMembership.create({
      userId: user.id,
      shopId: shop.id,
      role: UserRole.OWNER,
      isActive: true,
    });

    const tokens = this.generateTokens(user, shop.id);

    // Save refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      shop: {
        id: shop.id,
        name: shop.name,
        state: shop.state,
        stateCode: shop.stateCode,
        gstin: shop.gstin,
        settings: shop.settings,
      },
      tokens,
    };
  }

  public static async login(data: { email: string; password: string }) {
    const user = await User.findOne({ where: { email: data.email } });
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid email or password');
    }

    // Find active shop
    const membership = await UserShopMembership.findOne({
      where: { userId: user.id, isActive: true },
      include: [{ model: Shop, as: 'shop' }],
    });

    let shop: Shop | null = null;
    if (membership && (membership as any).shop) {
      shop = (membership as any).shop;
    } else {
      shop = await Shop.findOne({ where: { businessId: user.businessId, isActive: true } });
    }

    if (!shop) {
      throw AppError.badRequest('No active shop found for this user');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = this.generateTokens(user, shop.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({
      userId: user.id,
      token: tokens.refreshToken,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      shop: {
        id: shop.id,
        name: shop.name,
        state: shop.state,
        stateCode: shop.stateCode,
        gstin: shop.gstin,
        settings: shop.settings,
      },
      tokens,
    };
  }

  public static async pinLogin(pin: string, shopId?: string) {
    // Find all active users and compare pin
    const users = await User.findAll({ where: { isActive: true } });
    let matchedUser: User | null = null;

    for (const u of users) {
      if (u.pinHash && (await bcrypt.compare(pin, u.pinHash))) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw AppError.unauthorized('Invalid counter PIN');
    }

    let targetShopId = shopId;
    let shop: Shop | null = null;

    if (targetShopId) {
      shop = await Shop.findByPk(targetShopId);
    } else {
      shop = await Shop.findOne({ where: { businessId: matchedUser.businessId, isActive: true } });
      targetShopId = shop?.id;
    }

    if (!shop || !targetShopId) {
      throw AppError.badRequest('Shop not found');
    }

    const tokens = this.generateTokens(matchedUser, targetShopId);

    return {
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        email: matchedUser.email,
        phone: matchedUser.phone,
        role: matchedUser.role,
      },
      shop: {
        id: shop.id,
        name: shop.name,
        state: shop.state,
        stateCode: shop.stateCode,
        gstin: shop.gstin,
      },
      tokens,
    };
  }

  public static async refreshTokens(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { id: string };
      const tokenRecord = await RefreshToken.findOne({
        where: { token: refreshToken, isRevoked: false },
      });

      if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
        throw AppError.unauthorized('Refresh token is expired or revoked');
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        throw AppError.unauthorized('User not found');
      }

      const membership = await UserShopMembership.findOne({
        where: { userId: user.id, isActive: true },
      });
      const shopId = membership?.shopId || '';

      const tokens = this.generateTokens(user, shopId);

      // Rotate token
      tokenRecord.isRevoked = true;
      tokenRecord.replacedByToken = tokens.refreshToken;
      await tokenRecord.save();

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await RefreshToken.create({
        userId: user.id,
        token: tokens.refreshToken,
        expiresAt,
      });

      return tokens;
    } catch (err: any) {
      throw AppError.unauthorized('Invalid refresh token');
    }
  }

  public static async logout(refreshToken?: string) {
    if (refreshToken) {
      await RefreshToken.update({ isRevoked: true }, { where: { token: refreshToken } });
    }
    return { success: true };
  }
}
