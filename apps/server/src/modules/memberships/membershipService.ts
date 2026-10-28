import type { MembershipStatusResponse } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';
import { hashToken } from '../../lib/secureTokens';

/** The signed-in person's membership, including the officer's reason when rejected. */
export async function getMembershipStatus(userId: string): Promise<MembershipStatusResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      membershipStatus: true,
      membershipRequestedAt: true,
      membershipRejectionReason: true,
    },
  });
  return {
    status: user.membershipStatus,
    requestedAt: user.membershipRequestedAt.toISOString(),
    rejectionReason: user.membershipStatus === 'REJECTED' ? user.membershipRejectionReason : null,
  };
}

function codeError(reason: string, message: string): HttpError {
  return new HttpError('CONFLICT', message, { reason });
}

/**
 * Redeems a one-time club code. Approves the membership immediately. A code verifies membership only.
 */
export async function redeemClubCode(
  userId: string,
  code: string,
): Promise<MembershipStatusResponse> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { membershipStatus: true },
    });
    if (user.membershipStatus === 'APPROVED') {
      throw codeError('ALREADY_APPROVED', 'Your membership is already approved.');
    }
    const record = await tx.clubCode.findUnique({ where: { codeHash: hashToken(code) } });
    if (!record) {
      throw codeError(
        'CODE_INVALID',
        "That code isn't valid. Check it with the officer who gave it to you.",
      );
    }
    if (record.usedAt) {
      throw codeError(
        'CODE_USED',
        'That code has already been used. Ask an officer for a new one.',
      );
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw codeError('CODE_EXPIRED', 'That code has expired. Ask an officer for a new one.');
    }
    const claimed = await tx.clubCode.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date(), usedById: userId },
    });
    if (claimed.count === 0) {
      throw codeError(
        'CODE_USED',
        'That code has already been used. Ask an officer for a new one.',
      );
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        membershipStatus: 'APPROVED',
        membershipDecidedAt: new Date(),
        membershipDecidedById: record.createdById,
        membershipRejectionReason: null,
      },
    });
    await recordAudit(
      {
        actorId: userId,
        action: 'MEMBERSHIP_APPROVED_BY_CLUB_CODE',
        targetType: 'USER',
        targetId: userId,
        before: { membershipStatus: user.membershipStatus },
        after: { membershipStatus: 'APPROVED', clubCodeId: record.id },
      },
      tx,
    );
  });
  return getMembershipStatus(userId);
}
