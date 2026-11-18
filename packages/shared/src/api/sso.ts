import { z } from 'zod';

/**
 * Sac State single sign-on. The phone opens GET /auth/sso/start in a
 * browser session. */

/** The one-time code expires this many seconds after the callback creates it. */
export const SSO_CODE_TTL_SECONDS = 60;

export const ssoExchangeRequestSchema = z.object({ code: z.string().min(16).max(256) });
export type SsoExchangeRequest = z.infer<typeof ssoExchangeRequestSchema>;

export const SsoErrorReason = {
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
} as const;
export type SsoErrorReason = (typeof SsoErrorReason)[keyof typeof SsoErrorReason];
