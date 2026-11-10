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
import { CategoriesService } from '../categories/categories.service';

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
    email?: string;
    phone: string;
    password: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
    businessType?: string;
    categories?: string[];
  }) {
    // Email is optional. Store a missing email as null so the unique index does not
    // collide across multiple email-less accounts.
    const email = data.email?.trim() ? data.email.trim() : null;

    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw AppError.conflict('An account with this email already exists');
      }
    }

    // 1. Create Business
    const business = await Business.create({
      name: data.businessName,
      email,
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
      email,
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
        // Stored here (JSON) to avoid a schema migration; drives category suggestions across the app.
        businessType: data.businessType || null,
      },
    });

    // Seed the shop's starter categories from the owner's chosen business type.
    if (data.categories?.length) {
      await CategoriesService.seedForShop(shop.id, data.categories, data.businessType);
    }

    // 3. Create default primary location and invoice sequence
    await StockLocation.create({
      shopId: shop.id,
      name: 'Main Counter & Store',
      code: 'LOC01',
      isPrimary: true,
    });

    // Seed the sequence for the CURRENT Indian financial year (Apr–Mar), computed rather than
    // hardcoded so new shops created in any year get the right starting FY.
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const currentFinancialYear = `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, '0')}`;

    await InvoiceNumberSequence.create({
      shopId: shop.id,
      prefix: 'INV',
      financialYear: currentFinancialYear,
      currentSequence: 0,
    });

    // 4. Create Owner User (no default PIN — must be set explicitly for counter login)
    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await User.create({
      businessId: business.id,
      name: data.name,
      email,
      phone: data.phone,
      passwordHash,
      pinHash: null,
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

  public static async login(data: { identifier: string; password: string }) {
    // The identifier may be an email or a phone number. Pick the matching column.
    const identifier = data.identifier.trim();
    const isEmail = identifier.includes('@');
    const user = await User.findOne({
      where: isEmail ? { email: identifier } : { phone: identifier },
    });
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw AppError.unauthorized('Invalid credentials');
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

  public static async pinLogin(pin: string, shopId: string) {
    // PIN login is scoped to a specific shop (the counter device). We only ever
    // compare the PIN against users who have an active membership for THAT shop,
    // never globally across every tenant in the system.
    const shop = await Shop.findByPk(shopId);
    if (!shop || !shop.isActive) {
      throw AppError.badRequest('Shop not found');
    }

    const shopMemberships = await UserShopMembership.findAll({
      where: { shopId, isActive: true },
    });
    const candidateUserIds = shopMemberships.map((m) => m.userId);

    const users = candidateUserIds.length
      ? await User.findAll({ where: { id: candidateUserIds, isActive: true } })
      : [];

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

    const tokens = this.generateTokens(matchedUser, shopId);

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
