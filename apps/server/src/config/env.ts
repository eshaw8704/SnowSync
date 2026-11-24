import 'dotenv/config';
import { z } from 'zod';

/** An optional variable: an empty value (`NAME=` in .env) counts as not set. */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

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
  /** Sender shown on SnowSync emails. In production, an address on the SES-verified domain. */
  EMAIL_FROM: z.string().min(3).default('SnowSync <no-reply@snowsync.local>'),
  /** `console` writes emails to the log (development); `ses` sends through Amazon SES. */
  EMAIL_TRANSPORT: z.enum(['console', 'ses']).default('console'),
  /** AWS region for SES. Credentials come from the ECS task role, never from .env. */
  AWS_REGION: z.string().min(1).default('us-west-2'),
  /**
   * Sac State single sign-on (OpenID Connect). SSO stays off until all four are set, which happens
   * only after Sac State IT approves the integration and issues the client.
   */
  SSO_ISSUER_URL: optional(z.url()),
  SSO_CLIENT_ID: optional(z.string().min(1)),
  SSO_CLIENT_SECRET: optional(z.string().min(1)),
  /** This server's public /auth/sso/callback URL, registered with Sac State as the redirect URI. */
  SSO_CALLBACK_URL: optional(z.url()),
  /** Where the callback sends the phone back to the app, with ?code=… or ?error=… */
  SSO_APP_REDIRECT_URL: z.string().min(3).default('snowsync://sso-complete'),
  /** How often the trip lifecycle Scheduler looks for due transitions (System Map §05). */
  SCHEDULER_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(30),
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
