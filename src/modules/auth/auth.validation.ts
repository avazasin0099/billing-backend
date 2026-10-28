import { z } from 'zod';
import { UserRole } from '../../shared/constants';

export const signupSchema = z.object({
  body: z.object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    gstin: z.string().optional(),
    state: z.string().default('Maharashtra'),
    stateCode: z.string().length(2).default('27'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const pinLoginSchema = z.object({
  body: z.object({
    pin: z.string().min(4).max(6),
    // Required: PIN login is scoped to a known counter/shop so PINs are matched
    // only within that shop's business (never globally across all tenants).
    shopId: z.string().uuid({ message: 'A shop context is required for PIN login' }),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});
