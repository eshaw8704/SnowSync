import { PASSWORD_RESET_TTL_MINUTES } from '@snowsync/shared';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { getEmailSender } from '../../lib/email/emailSender';
import { HttpError } from '../../lib/httpError';
import { logger } from '../../lib/logger';
import { hashPassword } from '../../lib/passwordHasher';
import { generateToken, hashToken } from '../../lib/secureTokens';
import { revokeAllForUser } from './tokenService';

/**
 * Starts a password reset without revealing whether an email
 * belongs to an existing account.
 *
 * Only accounts with a password that are not deactivated
 * can receive a password-reset link.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash || user.membershipStatus === 'DEACTIVATED') {
    return;
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);

  // Store the new token before sending the email.
  // Keep existing reset tokens valid until delivery succeeds.
  const record = await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  const link = `${env.PASSWORD_RESET_URL}?token=${encodeURIComponent(token)}`;

  try {
    await getEmailSender().send({
      to: user.email,
      subject: 'Reset your SnowSync password',
      text:
        `Someone asked to reset the SnowSync password for ${user.email}.\n\n` +
        `Open this link on your phone within ${PASSWORD_RESET_TTL_MINUTES} minutes to choose a new password:\n${link}\n\n` +
        'If you did not ask for this, ignore this email. Your password has not changed.',
    });
  } catch {
    // Remove the undelivered token but preserve previous reset links.
    try {
      await prisma.passwordResetToken.delete({
        where: { id: record.id },
      });
    } catch {
      logger.error('Failed to clean up undelivered password reset token');
    }

    // Return the same generic response as an unknown email address.
    logger.error('Password reset email delivery failed');
    return;
  }

  // Invalidate older tokens only after the email sender succeeds.
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
      id: { not: record.id },
    },
    data: { usedAt: new Date() },
  });
}

/**
 * Finishes a password reset.
 *
 * The token can only be used once and must not be expired.
 * A successful reset also clears sign-in locks and revokes
 * the user's existing sessions.
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(
      'VALIDATION_FAILED',
      'This reset link is invalid or has expired. Request a new one.',
      {
        reason: 'RESET_TOKEN_INVALID',
      },
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (claimed.count === 0) {
      throw new HttpError(
        'VALIDATION_FAILED',
        'This reset link is invalid or has expired. Request a new one.',
        {
          reason: 'RESET_TOKEN_INVALID',
        },
      );
    }

    await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        failedSignInCount: 0,
        signInLockedUntil: null,
      },
    });

    await revokeAllForUser(record.userId, tx);
  });
}
