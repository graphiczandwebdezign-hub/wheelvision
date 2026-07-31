import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_REACT_QUERY_DEVTOOLS: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export const env = envSchema.parse(process.env);
