import { z } from 'zod';

export const SAC_STATE_EMAIL_DOMAIN = 'csus.edu';
export const PASSWORD_MIN_LENGTH = 12;
export const MAX_FAILED_SIGN_INS = 5;
export const SIGN_IN_LOCK_MINUTES = 15;
export const PASSWORD_RESET_TTL_MINUTES = 30;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Enter a valid email address.' }));

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: `Use at least ${PASSWORD_MIN_LENGTH} characters.` })
  .max(128, { message: 'Use 128 characters or fewer.' });

export const sacStateEmailSchema = emailSchema.refine(
  (email) => email.endsWith(`@${SAC_STATE_EMAIL_DOMAIN}`),
  { message: 'Use your Sac State email (@csus.edu).' },
);

export const signupRequestSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, { message: 'Enter your full name.' })
    .max(80, { message: 'Use 80 characters or fewer.' }),
  email: sacStateEmailSchema,
  password: newPasswordSchema,
});
export type SignupRequest = z.infer<typeof signupRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'Enter your password.' }),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  password: newPasswordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

// Return by signup, login, and refresh. The phone keeps the access token in memory and the refresh in secure storage
export interface AuthSession {
  accessToken: string;
  /** ISO 8601 instant. */
  accessTokenExpiresAt: string;
  refreshToken: string;
  /** ISO 8601 instant. */
  refreshTokenExpiresAt: string;
}

export const AuthErrorReason = {
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  SIGN_IN_LOCKED: 'SIGN_IN_LOCKED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
} as const;
export type AuthErrorReason = (typeof AuthErrorReason)[keyof typeof AuthErrorReason];
