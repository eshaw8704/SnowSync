import { createHash } from 'node:crypto';
import {
  SAC_STATE_EMAIL_DOMAIN,
  SSO_CODE_TTL_SECONDS,
  SsoErrorReason,
  type AuthSession,
} from '@snowsync/shared';
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { logger } from '../../lib/logger';
import { isUniqueViolation } from '../../lib/prismaErrors';
import { generateToken, hashToken } from '../../lib/secureTokens';
import { issueSession, toAuthSession } from './tokenService';

/** The provider name stored on user_identities rows. */
export const SSO_PROVIDER = 'SAC_STATE';

/** How long the browser has to finish signing in at Sac State. */
const STATE_TTL_SECONDS = 10 * 60;

/** A stalled call to Sac State fails after this long instead of holding the request open. */
const PROVIDER_TIMEOUT_MS = 10_000;

/** Everything SSO needs. Null means SSO is off (the default until Sac State approves it). */
export interface SsoConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  appRedirectUrl: string;
}

function configFromEnv(): SsoConfig | null {
  if (
    !env.SSO_ISSUER_URL ||
    !env.SSO_CLIENT_ID ||
    !env.SSO_CLIENT_SECRET ||
    !env.SSO_CALLBACK_URL
  ) {
    return null;
  }
  return {
    issuerUrl: env.SSO_ISSUER_URL,
    clientId: env.SSO_CLIENT_ID,
    clientSecret: env.SSO_CLIENT_SECRET,
    callbackUrl: env.SSO_CALLBACK_URL,
    appRedirectUrl: env.SSO_APP_REDIRECT_URL,
  };
}

let config: SsoConfig | null = configFromEnv();

/** Replaces the SSO configuration (tests point it at a fake identity provider). */
export function configureSso(next: SsoConfig | null): void {
  config = next;
  discovery = null;
}

/** The current configuration, or a 404 when SSO is off. */
export function requireSsoConfig(): SsoConfig {
  if (!config) {
    throw new HttpError('NOT_FOUND', 'Sac State sign-in is not available yet.', {
      reason: 'SSO_DISABLED',
    });
  }
  return config;
}

interface Discovery {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  jwks: JWTVerifyGetKey;
  issuer: string;
}

let discovery: Discovery | null = null;

/** Reads the provider's OpenID configuration once and caches it. */
async function discover(current: SsoConfig): Promise<Discovery> {
  if (discovery) {
    return discovery;
  }
  const url = `${current.issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
  const response = await fetch(url, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`OpenID discovery failed with ${response.status}`);
  }
  const document = (await response.json()) as {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    jwks_uri: string;
  };
  discovery = {
    issuer: document.issuer,
    authorizationEndpoint: document.authorization_endpoint,
    tokenEndpoint: document.token_endpoint,
    jwks: createRemoteJWKSet(new URL(document.jwks_uri)),
  };
  return discovery;
}

/** The key that encrypts the state parameter. Derived from the server secret; never stored. */
function stateKey(): Uint8Array {
  return createHash('sha256').update(`sso-state:${env.JWT_ACCESS_SECRET}`).digest();
}

function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

/**
 * GET /auth/sso/start: the URL of Sac State's sign-in page. The nonce and PKCE verifier travel in
 * an encrypted, expiring `state`, so the server keeps nothing between start and callback.
 */
export async function buildAuthorizationUrl(): Promise<string> {
  const current = requireSsoConfig();
  const provider = await discover(current);
  const nonce = generateToken(16);
  const verifier = generateToken(32);
  const state = await new EncryptJWT({ nonce, verifier })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_SECONDS}s`)
    .encrypt(stateKey());
  const url = new URL(provider.authorizationEndpoint);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: current.clientId,
    redirect_uri: current.callbackUrl,
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: pkceChallenge(verifier),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}

/** A failure the phone is told about by name; anything else is reported as FAILED. */
class SsoFailure extends Error {
  constructor(readonly reason: SsoErrorReason) {
    super(reason);
  }
}

/** Claims SnowSync reads from the ID token. */
interface SsoClaims {
  sub: string;
  email: string;
  name: string | null;
}

async function exchangeCodeForClaims(
  current: SsoConfig,
  code: string,
  state: string,
): Promise<SsoClaims> {
  const provider = await discover(current);
  const { payload: saved } = await jwtDecrypt(state, stateKey());
  const response = await fetch(provider.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: current.callbackUrl,
      client_id: current.clientId,
      client_secret: current.clientSecret,
      code_verifier: String(saved.verifier),
    }),
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Token exchange failed with ${response.status}`);
  }
  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) {
    throw new Error('Token response had no id_token');
  }
  const { payload } = await jwtVerify(tokens.id_token, provider.jwks, {
    issuer: provider.issuer,
    audience: current.clientId,
    requiredClaims: ['exp'],
  });
  if (payload.nonce !== saved.nonce || typeof payload.sub !== 'string') {
    throw new Error('ID token nonce or subject did not match');
  }
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  // Sac State is authoritative for its own domain, so a csus.edu address counts as verified unless
  // the provider says otherwise; any other address must be explicitly verified.
  const verified =
    payload.email_verified === true ||
    (payload.email_verified === undefined && email.endsWith(`@${SAC_STATE_EMAIL_DOMAIN}`));
  if (!email || !verified) {
    throw new SsoFailure(SsoErrorReason.EMAIL_NOT_VERIFIED);
  }
  return { sub: payload.sub, email, name: typeof payload.name === 'string' ? payload.name : null };
}

/**
 * Finds or creates the account for one SSO sign-in (System Map §01): by provider subject first,
 * then by verified email (linking the existing account), otherwise a new MEMBER account with
 * membership PENDING_APPROVAL, exactly like email sign-up. Deactivated accounts are refused.
 */
export async function findOrCreateSsoUser(claims: SsoClaims): Promise<string> {
  const identity = await prisma.userIdentity.findUnique({
    where: { provider_subject: { provider: SSO_PROVIDER, subject: claims.sub } },
    select: { user: { select: { id: true, membershipStatus: true } } },
  });
  if (identity) {
    if (identity.user.membershipStatus === 'DEACTIVATED') {
      throw new SsoFailure(SsoErrorReason.ACCOUNT_DEACTIVATED);
    }
    return identity.user.id;
  }
  try {
    return await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { email: claims.email },
        select: { id: true, membershipStatus: true },
      });
      if (user?.membershipStatus === 'DEACTIVATED') {
        throw new SsoFailure(SsoErrorReason.ACCOUNT_DEACTIVATED);
      }
      user ??= await tx.user.create({
        data: {
          email: claims.email,
          displayName: claims.name?.trim() || claims.email.split('@')[0]!,
          passwordHash: null,
          role: 'MEMBER',
          membershipStatus: 'PENDING_APPROVAL',
        },
        select: { id: true, membershipStatus: true },
      });
      await tx.userIdentity.create({
        data: { userId: user.id, provider: SSO_PROVIDER, subject: claims.sub },
      });
      return user.id;
    });
  } catch (error) {
    // The same person finished two sign-ins at once; the other one already linked the account.
    if (isUniqueViolation(error)) {
      return findOrCreateSsoUser(claims);
    }
    throw error;
  }
}

/** Callback query parameters, as the identity provider sends them. */
export interface SsoCallbackQuery {
  code?: unknown;
  state?: unknown;
  error?: unknown;
}

/**
 * GET /auth/sso/callback: finishes the sign-in and returns the app URL to redirect the browser to,
 * with a single-use code that expires in {@link SSO_CODE_TTL_SECONDS} seconds, or ?error=REASON.
 * Never throws: the browser must always land back in the app.
 */
export async function completeSsoCallback(query: SsoCallbackQuery): Promise<string> {
  const current = requireSsoConfig();
  const back = (params: Record<string, string>) =>
    `${current.appRedirectUrl}?${new URLSearchParams(params).toString()}`;
  if (typeof query.error === 'string') {
    return back({ error: SsoErrorReason.CANCELLED });
  }
  if (typeof query.code !== 'string' || typeof query.state !== 'string') {
    return back({ error: SsoErrorReason.FAILED });
  }
  try {
    const claims = await exchangeCodeForClaims(current, query.code, query.state);
    const userId = await findOrCreateSsoUser(claims);
    const code = generateToken(32);
    await prisma.ssoLoginCode.create({
      data: {
        userId,
        codeHash: hashToken(code),
        expiresAt: new Date(Date.now() + SSO_CODE_TTL_SECONDS * 1000),
      },
    });
    return back({ code });
  } catch (error) {
    if (error instanceof SsoFailure) {
      return back({ error: error.reason });
    }
    // Name and message only: ID-token validation errors carry the token's claims (email, name).
    const failure = error instanceof Error ? error : new Error(String(error));
    logger.warn({ error: failure.name, message: failure.message }, 'Sac State sign-in failed');
    return back({ error: SsoErrorReason.FAILED });
  }
}

/**
 * POST /auth/sso/exchange: trades the one-time code for the same session email sign-in returns.
 * A code works once, for 60 seconds.
 */
export async function exchangeSsoCode(code: string): Promise<AuthSession> {
  requireSsoConfig();
  const codeHash = hashToken(code);
  const claimed = await prisma.ssoLoginCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  const row =
    claimed.count === 1
      ? await prisma.ssoLoginCode.findUnique({
          where: { codeHash },
          select: { user: { select: { id: true, membershipStatus: true } } },
        })
      : null;
  if (!row || row.user.membershipStatus === 'DEACTIVATED') {
    throw new HttpError('UNAUTHORIZED', 'That sign-in link expired. Try Sac State sign-in again.', {
      reason: 'SSO_CODE_INVALID',
    });
  }
  return toAuthSession(await issueSession(row.user.id));
}
