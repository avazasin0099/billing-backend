import { Category } from '../../database/associations';
import { AppError } from '../../shared/errors/app-error';

const norm = (s: string) => (s || '').trim().toLowerCase();

export class CategoriesService {
  /** All active categories for a shop, alphabetical. */
  public static async list(shopId: string, includeInactive = false) {
    const where: any = { shopId };
    if (!includeInactive) where.isActive = true;
    return Category.findAll({ where, order: [['name', 'ASC']] });
  }

  /**
   * Create a category for a shop. Names are unique per shop, case-insensitively — an
   * existing (even inactive) match is returned/reactivated instead of erroring, so the
   * "Add new category" button is idempotent and dialect-safe (no Postgres-only iLike).
   */
  public static async create(shopId: string, name: string, businessType?: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw AppError.badRequest('Category name is required');
    if (trimmed.length > 60) throw AppError.badRequest('Category name is too long (max 60 characters)');

    const existing = (await Category.findAll({ where: { shopId } })).find(
      (c) => norm(c.name) === norm(trimmed)
    );
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
      }
      return existing;
    }

    return Category.create({ shopId, name: trimmed, businessType, isActive: true });
  }

  public static async rename(shopId: string, id: string, name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw AppError.badRequest('Category name is required');

    const all = await Category.findAll({ where: { shopId } });
    const category = all.find((c) => c.id === id);
    if (!category) throw AppError.notFound('Category not found');

    const clash = all.find((c) => c.id !== id && norm(c.name) === norm(trimmed));
    if (clash) throw AppError.conflict(`A category named "${trimmed}" already exists`);

    category.name = trimmed;
    await category.save();
    return category;
  }

  /** Soft-delete: existing items keep their category string, it just disappears from pickers. */
  public static async deactivate(shopId: string, id: string) {
    const category = await Category.findOne({ where: { id, shopId } });
    if (!category) throw AppError.notFound('Category not found');
    category.isActive = false;
    await category.save();
    return { success: true };
  }

  /**
   * Seed a shop's initial categories (used at signup). Idempotent and de-duplicated.
   * Returns the created rows.
   */
  public static async seedForShop(shopId: string, names: string[], businessType?: string) {
    const unique = Array.from(
      new Map((names || []).map((n) => [norm(n), (n || '').trim()])).values()
    ).filter(Boolean);

    const created: Category[] = [];
    for (const name of unique) {
      created.push(await this.create(shopId, name, businessType));
    }
    return created;
  }
}
