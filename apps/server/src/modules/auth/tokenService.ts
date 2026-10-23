import { randomUUID } from 'node:crypto';
import type { AuthSession } from '@snowsync/shared';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import type { Prisma } from '../../generated/prisma/client';
import { HttpError } from '../../lib/httpError';
import { generateToken, hashToken } from '../../lib/secureTokens';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = 'snowsync';
const AUDIENCE = 'snowsync-app';
const DAY_MS = 24 * 60 * 60 * 1000;

/** The only error the session endpoints return: the phone treats it as "sign in again". */
function sessionExpired(): HttpError {
  return new HttpError('UNAUTHORIZED', 'Your session has expired. Sign in again.');
}

/**
 * Signs a short-lived access token. It carries only the user id ('sub'); role and membership are
 * always read from the database on each request, never trusted from the token.
 */
export async function signAccessToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + env.ACCESS_TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(ACCESS_SECRET);
  return { token, expiresAt };
}

/** Verifies an access token and returns its user id, or throws UNAUTHORIZED. */
export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string') {
      throw sessionExpired();
    }
    return { userId: payload.sub };
  } catch {
    throw sessionExpired();
  }
}

/**
 * Starts a session: one access token plus one new refresh token, "familyId" groups every refresh
 * token that descends from one sign-in, so reuse of a stolen token can revoke the whole chain.
 */
export async function issueSession(
  userId: string,
  familyId: string = randomUUID(),
  tx: Prisma.TransactionClient = prisma,
): Promise<AuthSession & { refreshTokenId: string }> {
  const refreshToken = generateToken();
  const refreshTokenExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS);
  const row = await tx.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshTokenExpiresAt,
    },
  });
  const access = await signAccessToken(userId);
  return {
    accessToken: access.token,
    accessTokenExpiresAt: access.expiresAt.toISOString(),
    refreshToken,
    refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    refreshTokenId: row.id,
  };
}

/** Removes the internal id before a session is sent to the phone. */
export function toAuthSession(session: AuthSession & { refreshTokenId: string }): AuthSession {
  return {
    accessToken: session.accessToken,
    accessTokenExpiresAt: session.accessTokenExpiresAt,
    refreshToken: session.refreshToken,
    refreshTokenExpiresAt: session.refreshTokenExpiresAt,
  };
}

/**
 * Exchanges a refresh token for a new session (rotation). The old token is revoked and points to
 * its replacement. Presenting an already-revoked token means it was stolen or replayed, so the
 * whole family is revoked and the person must sign in again.
 */
export async function rotateRefreshToken(refreshToken: string): Promise<AuthSession> {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: { select: { membershipStatus: true } } },
  });
  if (!existing) {
    throw sessionExpired();
  }
  if (existing.revokedAt) {
    await revokeFamily(existing.familyId);
    throw sessionExpired();
  }
  if (
    existing.expiresAt.getTime() <= Date.now() ||
    existing.user.membershipStatus === 'DEACTIVATED'
  ) {
    await revokeFamily(existing.familyId);
    throw sessionExpired();
  }

  const session = await prisma.$transaction(async (tx) => {
    // Conditional update: if two requests race with the same token, only one wins.
    const claimed = await tx.refreshToken.updateMany({
      where: { id: existing.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count === 0) {
      return null;
    }
    const next = await issueSession(existing.userId, existing.familyId, tx);
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { replacedById: next.refreshTokenId },
    });
    return next;
  });
  if (!session) {
    await revokeFamily(existing.familyId);
    throw sessionExpired();
  }
  return toAuthSession(session);
}

/** Signs out one device: revokes every token in the presented token's family. Unknown tokens are ignored. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (existing) {
    await revokeFamily(existing.familyId);
  }
}

/** Signs a person out everywhere (password reset, deactivation). */
export async function revokeAllForUser(
  userId: string,
  tx: Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function revokeFamily(familyId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
