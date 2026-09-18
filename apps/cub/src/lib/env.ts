import { z } from 'zod';

/*
 * Secrets live only in the environment. Parsing them once, here, means a
 * missing key fails at boot with a readable message instead of surfacing later
 * as an opaque "Invalid API key" from a Supabase call.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL must be a full URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
});

// Referenced as full literals so Next can inline them into the client bundle.
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
