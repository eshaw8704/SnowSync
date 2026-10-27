import {
  MAX_FAILED_SIGN_INS,
  SIGN_IN_LOCK_MINUTES,
  type AuthSession,
  type LoginRequest,
} from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { verifyPassword } from '../../lib/passwordHasher';
import { issueSession, toAuthSession } from './tokenService';

// Bad login
function invalidCredentials(): HttpError {
  return new HttpError('UNAUTHORIZED', 'Email or password is incorrect.');
}

// rate limit
function locked(until: Date): HttpError {
  return new HttpError(
    'RATE_LIMITED',
    `Too many attempts. Email sign-in is locked for ${SIGN_IN_LOCK_MINUTES} minutes.`,
    { reason: 'SIGN_IN_LOCKED', lockedUntil: until.toISOString() },
  );
}

// lockout user
export async function logIn(input: LoginRequest): Promise<AuthSession> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (user?.signInLockedUntil && user.signInLockedUntil.getTime() > Date.now()) {
    throw locked(user.signInLockedUntil);
  }

  const passwordOk = await verifyPassword(user?.passwordHash ?? null, input.password);
  if (!user || !passwordOk || user.membershipStatus === 'DEACTIVATED') {
    if (user && !passwordOk) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { failedSignInCount: { increment: 1 } },
        select: { failedSignInCount: true },
      });
      if (updated.failedSignInCount >= MAX_FAILED_SIGN_INS) {
        const until = new Date(Date.now() + SIGN_IN_LOCK_MINUTES * 60 * 1000);
        await prisma.user.update({
          where: { id: user.id },
          data: { failedSignInCount: 0, signInLockedUntil: until },
        });
        throw locked(until);
      }
    }
    throw invalidCredentials();
  }

  if (user.failedSignInCount !== 0 || user.signInLockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedSignInCount: 0, signInLockedUntil: null },
    });
  }
  return toAuthSession(await issueSession(user.id));
}
