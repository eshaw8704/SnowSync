import 'dotenv/config';
import { z } from 'zod';

/** Shape of the environment variables the server needs. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  /** Signs access tokens (HS256). At least 32 characters; different in every environment. */
  JWT_ACCESS_SECRET: z.string().min(32, { message: 'must be at least 32 characters' }),
  /** Access-token lifetime. 15 minutes by default (System Map §01). */
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  /** Refresh-token lifetime. 30 days by default (System Map §01). */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  /** Base of the link in password-reset emails; the token is added as ?token=… */
  PASSWORD_RESET_URL: z.url().default('snowsync://reset-password'),
  /** Sender shown on SnowSync emails. Amazon SES replaces the console sender in Sprint 4. */
  EMAIL_FROM: z.string().min(3).default('SnowSync <no-reply@snowsync.local>'),
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
