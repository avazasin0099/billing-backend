import { z } from 'zod';
import { UserRole } from '../../shared/constants';

// Standard 15-char GSTIN: 2-digit state code + 10-char PAN + entity digit + 'Z' + checksum.
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export const signupSchema = z.object({
  body: z.object({
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    // Optional, but when present it must be a valid GSTIN whose state code matches the business.
    gstin: z
      .union([z.string().trim().toUpperCase().regex(GSTIN_REGEX, 'Invalid GSTIN format'), z.literal('')])
      .optional(),
    state: z.string().default('Maharashtra'),
    stateCode: z.string().regex(/^[0-9]{2}$/, 'State code must be 2 digits').default('27'),
  }).refine(
    (b) => !b.gstin || b.gstin.slice(0, 2) === b.stateCode,
    { path: ['gstin'], message: "GSTIN's first two digits must match the state code" }
  ),
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
