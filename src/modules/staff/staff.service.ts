import bcrypt from 'bcryptjs';
import { User, Shop, UserShopMembership } from '../../database/associations';
import { AppError } from '../../shared/errors/app-error';
import { UserRole } from '../../shared/constants';

export class StaffService {
  public static async listStaff(businessId: string, shopId: string) {
    const memberships = await UserShopMembership.findAll({
      where: { shopId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'lastLoginAt', 'createdAt'],
        },
      ],
    });

    return memberships.map((m: any) => ({
      membershipId: m.id,
      role: m.role,
      user: m.user,
    }));
  }

  public static async addStaff(
    businessId: string,
    shopId: string,
    data: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      pin?: string;
      role: UserRole;
    }
  ) {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      throw AppError.conflict('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const pinHash = data.pin ? await bcrypt.hash(data.pin, 10) : undefined;

    const user = await User.create({
      businessId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      pinHash,
      role: data.role,
      isActive: true,
    });

    await UserShopMembership.create({
      userId: user.id,
      shopId,
      role: data.role,
      isActive: true,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  public static async getSettings(shopId: string) {
    const shop = await Shop.findByPk(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    return shop;
  }

  public static async updateSettings(
    shopId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      address?: string;
      gstin?: string;
      settings?: any;
    }
  ) {
    const shop = await Shop.findByPk(shopId);
    if (!shop) throw AppError.notFound('Shop not found');
    await shop.update(data);
    return shop;
  }
}
