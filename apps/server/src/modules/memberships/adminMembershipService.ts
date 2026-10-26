import type { MembershipDecisionRequest, PendingMembershipItem } from '@snowsync/shared';
import { prisma } from '../../db/prisma';
import { recordAudit } from '../../lib/auditLog';
import { HttpError } from '../../lib/httpError';

/** Everyone waiting for a decision, oldest request first. */
export async function listPendingMemberships(): Promise<PendingMembershipItem[]> {
  const users = await prisma.user.findMany({
    where: { membershipStatus: 'PENDING_APPROVAL' },
    orderBy: { membershipRequestedAt: 'asc' },
    select: { id: true, displayName: true, email: true, membershipRequestedAt: true },
  });
  return users.map((user) => ({
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
    requestedAt: user.membershipRequestedAt.toISOString(),
  }));
}

/**
 * Approves or rejects one pending request and writes the audit entry in the same transaction.
 * Approving grants member access only: it never changes the role and never registers anyone for a
 * trip.*/

export async function decideMembership(
  actorId: string,
  userId: string,
  decision: MembershipDecisionRequest,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const target = await tx.user.findUnique({
      where: { id: userId },
      select: { membershipStatus: true },
    });
    if (!target) {
      throw new HttpError('NOT_FOUND', 'That membership request no longer exists.');
    }
    // Conditional update: two officers deciding at once cannot both succeed.
    const updated = await tx.user.updateMany({
      where: { id: userId, membershipStatus: 'PENDING_APPROVAL' },
      data: {
        membershipStatus: decision.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        membershipDecidedAt: new Date(),
        membershipDecidedById: actorId,
        membershipRejectionReason: decision.decision === 'REJECT' ? decision.reason : null,
      },
    });
    if (updated.count === 0) {
      throw new HttpError('CONFLICT', 'This request was already decided.', {
        reason: 'NOT_PENDING',
      });
    }
    await recordAudit(
      {
        actorId,
        action: decision.decision === 'APPROVE' ? 'MEMBERSHIP_APPROVED' : 'MEMBERSHIP_REJECTED',
        targetType: 'USER',
        targetId: userId,
        reason: decision.decision === 'REJECT' ? decision.reason : null,
        before: { membershipStatus: target.membershipStatus },
        after: { membershipStatus: decision.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' },
      },
      tx,
    );
  });
}
