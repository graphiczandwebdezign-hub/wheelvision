import { z } from 'zod';

/**
 * Single authoritative source for environment configuration.
 *
 * Every variable the application relies on is declared and validated here.
 * Import `env` from this module — never read `process.env` directly in
 * application code — so configuration stays type-safe and fails fast at
 * startup when a required variable is missing or malformed.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/wheelvision'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  /**
   * Fallback tenant used when a request does not identify one explicitly
   * (via the tenant header — and, once authentication lands, via the
   * authenticated principal). Defaults to the seeded demo tenant so a fresh
   * checkout works against `npm run db:seed` without extra configuration.
   */
  DEFAULT_TENANT_SLUG: z.string().min(1).default('demo-tenant'),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
