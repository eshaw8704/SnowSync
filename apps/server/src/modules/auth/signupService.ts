import type { AuthSession, SignupRequest } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../lib/httpError';
import { hashPassword } from '../../lib/passwordHasher';
import { isUniqueViolation } from '../../lib/prismaErrors';
import { issueSession, toAuthSession } from './tokenService';

function emailTaken(): HttpError {
  return new HttpError(
    'CONFLICT',
    'An account with this email already exists. Sign in or reset your password.',
    {
      reason: 'EMAIL_TAKEN',
    },
  );
}

/**
 * Creates an account and signs it in. The account starts as a MEMBER with membership
 * PENDING_APPROVAL: creating an account never grants club access (System Map §02).
 */
export async function signUp(input: SignupRequest): Promise<AuthSession> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw emailTaken();
  }
  const passwordHash = await hashPassword(input.password);
  try {
    // One transaction: if the session cannot be issued, the account is rolled back too.
    const session = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
          role: 'MEMBER',
          membershipStatus: 'PENDING_APPROVAL',
        },
      });
      return issueSession(user.id, undefined, tx);
    });
    return toAuthSession(session);
  } catch (error) {
    // Two sign-ups with the same email at the same moment: the database's unique index decides.
    if (isUniqueViolation(error)) {
      throw emailTaken();
    }
    throw error;
  }
}
