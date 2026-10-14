import 'dotenv/config';
import { z } from 'zod';

/** Shape of the environment variables the server needs. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
});

/** Validated, typed server configuration. */
export type Env = z.infer<typeof envSchema>;

/**
 * Parses `source` and returns a frozen config, or throws an Error whose message
 * names every missing or invalid variable. Exported for tests.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Readonly<Env> {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid server environment. Fix apps/server/.env (see .env.example):\n${problems}`,
    );
  }
  return Object.freeze(result.data);
}

/** The server configuration, read once at startup. */
export const env: Readonly<Env> = parseEnv(process.env);
